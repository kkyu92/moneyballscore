import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { KBO_TEAMS, toKSTDateString } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { fetchGames, fetchRecentForm, fetchHeadToHead, DEFAULT_PARK_FACTORS } from '../scrapers/kbo-official';
import { fetchPitcherStats, fetchTeamStats, fetchEloRatings, findPitcher } from '../scrapers/fancy-stats';
import { fetchBatterLeaders } from '../scrapers/fangraphs';
import { predict } from '../engine/predictor';
import type { PredictionInput, PipelineResult, ScrapedGame } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

function createAdminClient(): DB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CURRENT_SEASON = new Date().getFullYear();

// KBO 리그 ID (leagues 테이블)
async function getKBOLeagueId(db: DB): Promise<number> {
  const { data } = await db.from('leagues').select('id').eq('code', 'KBO').single();
  if (!data) throw new Error('KBO league not found in DB');
  return data.id;
}

// 팀 코드 → teams.id 매핑
async function getTeamIdMap(
  db: DB,
  leagueId: number
): Promise<Record<TeamCode, number>> {
  const { data } = await db.from('teams').select('id, code').eq('league_id', leagueId);
  if (!data) return {} as Record<TeamCode, number>;

  const map: Partial<Record<TeamCode, number>> = {};
  for (const team of data) {
    map[team.code as TeamCode] = team.id;
  }
  return map as Record<TeamCode, number>;
}

// 선수 이름 → players.id (없으면 생성)
async function getOrCreatePlayerId(
  db: DB,
  leagueId: number,
  name: string,
  teamId: number,
  position: string
): Promise<number> {
  const { data: existing } = await db
    .from('players')
    .select('id')
    .eq('league_id', leagueId)
    .eq('name_ko', name)
    .eq('team_id', teamId)
    .single();

  if (existing) return existing.id;

  const { data: created } = await db
    .from('players')
    .insert({ league_id: leagueId, name_ko: name, team_id: teamId, position })
    .select('id')
    .single();

  if (!created) throw new Error(`Failed to create player: ${name}`);
  return created.id;
}

/**
 * 일일 파이프라인 메인 함수
 * mode: 'predict' (KST 15:00) | 'verify' (KST 23:00)
 */
export async function runDailyPipeline(
  date?: string,
  mode: 'predict' | 'verify' = 'predict'
): Promise<PipelineResult> {
  const targetDate = date || toKSTDateString();
  const db = createAdminClient();
  const errors: string[] = [];

  console.log(`[Pipeline] ${mode} mode for ${targetDate}`);

  const leagueId = await getKBOLeagueId(db);
  const teamIdMap = await getTeamIdMap(db, leagueId);

  // 1. KBO 공식에서 경기 목록 수집
  let games: ScrapedGame[];
  try {
    games = await fetchGames(targetDate);
    console.log(`[Pipeline] ${games.length} games found`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { date: targetDate, gamesFound: 0, predictionsGenerated: 0, gamesSkipped: 0, errors: [msg] };
  }

  if (games.length === 0) {
    return { date: targetDate, gamesFound: 0, predictionsGenerated: 0, gamesSkipped: 0, errors: [] };
  }

  // games 테이블에 upsert
  for (const game of games) {
    const homeTeamId = teamIdMap[game.homeTeam];
    const awayTeamId = teamIdMap[game.awayTeam];
    if (!homeTeamId || !awayTeamId) {
      errors.push(`Unknown team: ${game.homeTeam} or ${game.awayTeam}`);
      continue;
    }

    await db.from('games').upsert(
      {
        league_id: leagueId,
        game_date: game.date,
        game_time: game.gameTime,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        stadium: game.stadium,
        status: game.status,
        home_score: game.homeScore ?? null,
        away_score: game.awayScore ?? null,
        winner_team_id: game.status === 'final' && game.homeScore != null && game.awayScore != null
          ? (game.homeScore > game.awayScore ? homeTeamId : awayTeamId)
          : null,
        external_game_id: game.externalGameId,
      },
      { onConflict: 'league_id,external_game_id' }
    );
  }

  // verify 모드면 결과만 업데이트하고 끝
  if (mode === 'verify') {
    // 적중률 업데이트
    await updateAccuracy(db, leagueId, targetDate);
    return {
      date: targetDate,
      gamesFound: games.length,
      predictionsGenerated: 0,
      gamesSkipped: 0,
      errors,
    };
  }

  // 2. Fancy Stats에서 통계 수집
  console.log('[Pipeline] Fetching Fancy Stats...');
  const [pitcherStats, teamStats, eloRatings] = await Promise.all([
    fetchPitcherStats(CURRENT_SEASON).catch((e) => { errors.push(`FancyStats pitchers: ${e}`); return []; }),
    fetchTeamStats(CURRENT_SEASON).catch((e) => { errors.push(`FancyStats teams: ${e}`); return []; }),
    fetchEloRatings(CURRENT_SEASON).catch((e) => { errors.push(`FancyStats elo: ${e}`); return []; }),
  ]);

  // 3. FanGraphs 보조 데이터
  console.log('[Pipeline] Fetching FanGraphs...');
  const fgBatters = await fetchBatterLeaders(CURRENT_SEASON).catch((e) => {
    errors.push(`FanGraphs: ${e}`);
    return [];
  });

  // FanGraphs 데이터로 TeamStats 보강
  for (const fg of fgBatters) {
    const ts = teamStats.find((t) => t.team === fg.team);
    if (ts) {
      ts.wrcPlus = fg.wrcPlus;
      ts.iso = fg.iso;
    }
  }

  // team_season_stats upsert
  for (const ts of teamStats) {
    const teamId = teamIdMap[ts.team];
    if (!teamId) continue;
    const elo = eloRatings.find((e) => e.team === ts.team);

    await db.from('team_season_stats').upsert(
      {
        team_id: teamId,
        season: CURRENT_SEASON,
        team_woba: ts.woba,
        team_wrc_plus: ts.wrcPlus ?? null,
        bullpen_fip: ts.bullpenFip,
        sfr: ts.sfr,
        elo_rating: elo?.elo ?? null,
        elo_win_pct: elo?.winPct ?? null,
        total_war: ts.totalWar,
        last_synced: new Date().toISOString(),
      },
      { onConflict: 'team_id,season' }
    );
  }

  // 4. 각 경기에 대해 예측 실행
  let predictionsGenerated = 0;
  let gamesSkipped = 0;

  for (const game of games) {
    if (game.status !== 'scheduled') {
      gamesSkipped++;
      continue;
    }

    // 선발투수 미확정이면 스킵
    if (!game.homeSP || !game.awaySP) {
      console.log(`[Pipeline] Skipping ${game.homeTeam} vs ${game.awayTeam}: SP not confirmed`);
      gamesSkipped++;
      continue;
    }

    const homeTeamStat = teamStats.find((t) => t.team === game.homeTeam);
    const awayTeamStat = teamStats.find((t) => t.team === game.awayTeam);
    const homeElo = eloRatings.find((e) => e.team === game.homeTeam);
    const awayElo = eloRatings.find((e) => e.team === game.awayTeam);

    // fallback 값
    const defaultTeamStats = { team: game.homeTeam as TeamCode, woba: 0.320, bullpenFip: 4.00, totalWar: 12, sfr: 0 };
    const defaultElo = { team: game.homeTeam as TeamCode, elo: 1500, winPct: 0.5 };

    // 최근폼, 상대전적 수집
    const [homeForm, awayForm, h2h] = await Promise.all([
      fetchRecentForm(game.homeTeam, CURRENT_SEASON).catch(() => 0.5),
      fetchRecentForm(game.awayTeam, CURRENT_SEASON).catch(() => 0.5),
      fetchHeadToHead(game.homeTeam, game.awayTeam, CURRENT_SEASON).catch(() => ({ wins: 0, losses: 0 })),
    ]);

    const input: PredictionInput = {
      game,
      homeSPStats: findPitcher(pitcherStats, game.homeSP, game.homeTeam),
      awaySPStats: findPitcher(pitcherStats, game.awaySP, game.awayTeam),
      homeTeamStats: homeTeamStat || { ...defaultTeamStats, team: game.homeTeam },
      awayTeamStats: awayTeamStat || { ...defaultTeamStats, team: game.awayTeam },
      homeElo: homeElo || { ...defaultElo, team: game.homeTeam },
      awayElo: awayElo || { ...defaultElo, team: game.awayTeam },
      headToHead: h2h,
      homeRecentForm: homeForm,
      awayRecentForm: awayForm,
      parkFactor: DEFAULT_PARK_FACTORS[game.stadium] ?? 1.0,
    };

    const result = predict(input);

    // DB에 저장
    const homeTeamId = teamIdMap[game.homeTeam];
    const awayTeamId = teamIdMap[game.awayTeam];

    // game ID 조회
    const { data: dbGame } = await db
      .from('games')
      .select('id')
      .eq('external_game_id', game.externalGameId)
      .eq('league_id', leagueId)
      .single();

    if (dbGame) {
      // 선발투수 ID 저장
      if (game.homeSP && homeTeamId) {
        const spId = await getOrCreatePlayerId(db, leagueId, game.homeSP, homeTeamId, 'P');
        await db.from('games').update({ home_sp_id: spId }).eq('id', dbGame.id);
      }
      if (game.awaySP && awayTeamId) {
        const spId = await getOrCreatePlayerId(db, leagueId, game.awaySP, awayTeamId, 'P');
        await db.from('games').update({ away_sp_id: spId }).eq('id', dbGame.id);
      }

      await db.from('predictions').upsert(
        {
          game_id: dbGame.id,
          prediction_type: 'pre_game',
          predicted_winner: teamIdMap[result.predictedWinner],
          confidence: result.confidence,
          home_sp_fip: input.homeSPStats?.fip ?? null,
          away_sp_fip: input.awaySPStats?.fip ?? null,
          home_sp_xfip: input.homeSPStats?.xfip ?? null,
          away_sp_xfip: input.awaySPStats?.xfip ?? null,
          home_lineup_woba: input.homeTeamStats.woba,
          away_lineup_woba: input.awayTeamStats.woba,
          home_bullpen_fip: input.homeTeamStats.bullpenFip,
          away_bullpen_fip: input.awayTeamStats.bullpenFip,
          home_war_total: input.homeTeamStats.totalWar,
          away_war_total: input.awayTeamStats.totalWar,
          home_recent_form: input.homeRecentForm,
          away_recent_form: input.awayRecentForm,
          head_to_head_rate: h2h.wins + h2h.losses > 0
            ? h2h.wins / (h2h.wins + h2h.losses)
            : null,
          park_factor: input.parkFactor,
          home_elo: input.homeElo.elo,
          away_elo: input.awayElo.elo,
          home_sfr: input.homeTeamStats.sfr,
          away_sfr: input.awayTeamStats.sfr,
          model_version: 'v1.5',
          reasoning: result,
          factors: result.factors,
        },
        { onConflict: 'game_id,prediction_type' }
      );

      predictionsGenerated++;
      console.log(
        `[Pipeline] ${game.homeTeam} vs ${game.awayTeam}: ${result.predictedWinner} (${Math.round(result.homeWinProb * 100)}%)`
      );
    }
  }

  console.log(`[Pipeline] Done: ${predictionsGenerated} predictions, ${gamesSkipped} skipped, ${errors.length} errors`);

  return {
    date: targetDate,
    gamesFound: games.length,
    predictionsGenerated,
    gamesSkipped,
    errors,
  };
}

/**
 * 경기 결과 기반 적중률 업데이트
 */
async function updateAccuracy(
  db: DB,
  leagueId: number,
  date: string
) {
  // 해당 날짜 종료된 경기의 예측 검증
  const { data: gamesData } = await db
    .from('games')
    .select('id, winner_team_id')
    .eq('league_id', leagueId)
    .eq('game_date', date)
    .eq('status', 'final');

  if (!gamesData) return;

  for (const game of gamesData) {
    if (!game.winner_team_id) continue;

    const { data: pred } = await db
      .from('predictions')
      .select('id, predicted_winner')
      .eq('game_id', game.id)
      .eq('prediction_type', 'pre_game')
      .single();

    if (pred) {
      await db
        .from('predictions')
        .update({
          is_correct: pred.predicted_winner === game.winner_team_id,
          actual_winner: game.winner_team_id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', pred.id);
    }
  }
}
