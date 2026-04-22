/**
 * Supabase games 테이블에서 decided 경기 로드 + feature 재계산.
 *
 * 핵심 원칙: 모든 feature 는 **해당 경기 game_date 미만** 데이터로만 구성.
 * Look-ahead bias 0.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TeamCode } from '@moneyball/shared';
import { KBO_TEAMS } from '@moneyball/shared';
import { calculateRecentForm, calculateHeadToHead } from '../engine/form';
import type { FinishedGame } from '../engine/form';
import { getEloAt } from './elo-history';
import type { EloHistory } from './elo-history';
import type { SeasonStatsMap } from './wayback-team-stats';
import type { BacktestGame, GameFeatures } from './types';
import type { GameRecordLite } from '../features/game-record-features';
import {
  bullpenInningsLastNDays,
  teamRunsPerGameLastN,
  teamRunsAllowedPerGameLastN,
  teamHomeRunsLastN,
} from '../features/game-record-features';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

/** games 테이블에서 decided 경기 + teams join 후 BacktestGame 배열로. */
export async function loadDecidedGames(
  db: DB,
  opts: { seasons: number[] },
): Promise<BacktestGame[]> {
  const { data: teamRows, error: te } = await db
    .from('teams')
    .select('id, code');
  if (te) throw new Error('teams load: ' + te.message);
  const idToCode: Record<number, TeamCode> = {};
  for (const t of teamRows || []) idToCode[t.id as number] = t.code as TeamCode;

  const out: BacktestGame[] = [];
  for (const season of opts.seasons) {
    // Supabase 기본 범위 제한을 피해 .range() 로 청크 조회
    const pageSize = 1000;
    let start = 0;
    for (;;) {
      const { data, error } = await db
        .from('games')
        .select(
          'id, game_date, home_team_id, away_team_id, home_score, away_score, winner_team_id, status',
        )
        .gte('game_date', `${season}-01-01`)
        .lte('game_date', `${season}-12-31`)
        .not('winner_team_id', 'is', null)
        .order('game_date', { ascending: true })
        .order('id', { ascending: true })
        .range(start, start + pageSize - 1);
      if (error) throw new Error('games load: ' + error.message);
      if (!data || data.length === 0) break;
      for (const g of data) {
        const homeCode = idToCode[g.home_team_id as number];
        const awayCode = idToCode[g.away_team_id as number];
        if (!homeCode || !awayCode) continue;
        const homeWon = g.winner_team_id === g.home_team_id;
        out.push({
          id: g.id as number,
          date: g.game_date as string,
          season,
          homeTeam: homeCode,
          awayTeam: awayCode,
          homeTeamId: g.home_team_id as number,
          awayTeamId: g.away_team_id as number,
          homeScore: (g.home_score as number) ?? 0,
          awayScore: (g.away_score as number) ?? 0,
          homeWon,
        });
      }
      if (data.length < pageSize) break;
      start += pageSize;
    }
  }
  return out;
}

/**
 * 주어진 경기에 대해 feature 재구성. games 인자는 **game_date desc 로 정렬된 전체 시즌 final 경기**.
 * 해당 경기 이전 (`g.date < target.date`) 에 국한해서 form / h2h 계산.
 *
 * @param target         대상 경기
 * @param priorInSeason  해당 시즌 내, target.date 미만의 final 경기 (desc 정렬 FinishedGame[])
 * @param eloHistory     팀별 Elo 시계열 (asc 정렬)
 */
export function buildFeatures(
  target: BacktestGame,
  priorInSeason: FinishedGame[],
  eloHistory: EloHistory,
  seasonStats?: SeasonStatsMap,
  priorRecords?: GameRecordLite[],
): GameFeatures | null {
  const homeFormRaw = calculateRecentForm(priorInSeason, target.homeTeamId, 10);
  const awayFormRaw = calculateRecentForm(priorInSeason, target.awayTeamId, 10);
  const h2h = calculateHeadToHead(priorInSeason, target.homeTeamId, target.awayTeamId);

  const homeElo =
    getEloAt(eloHistory.get(target.homeTeam) ?? [], target.date) ?? null;
  const awayElo =
    getEloAt(eloHistory.get(target.awayTeam) ?? [], target.date) ?? null;

  if (homeElo == null || awayElo == null) return null; // Elo 없으면 백테스트 제외

  const homeSeason = seasonStats?.get(target.homeTeam);
  const awaySeason = seasonStats?.get(target.awayTeam);

  const features: GameFeatures = {
    homeElo,
    awayElo,
    homeForm: homeFormRaw,
    awayForm: awayFormRaw,
    h2hHomeWins: h2h.wins,
    h2hAwayWins: h2h.losses,
    parkPf: KBO_TEAMS[target.homeTeam].parkPf,
    homeTeam: target.homeTeam,
    awayTeam: target.awayTeam,
    homeWoba: homeSeason?.woba,
    awayWoba: awaySeason?.woba,
    homeFip: homeSeason?.fip,
    awayFip: awaySeason?.fip,
    homeSfr: homeSeason?.sfr,
    awaySfr: awaySeason?.sfr,
  };

  if (priorRecords && priorRecords.length > 0) {
    features.homeBullpenInningsL3 = bullpenInningsLastNDays(
      priorRecords,
      target.homeTeamId,
      target.date,
      3,
    );
    features.awayBullpenInningsL3 = bullpenInningsLastNDays(
      priorRecords,
      target.awayTeamId,
      target.date,
      3,
    );
    features.homeRunsL5 = teamRunsPerGameLastN(
      priorRecords,
      target.homeTeamId,
      target.date,
      5,
    );
    features.awayRunsL5 = teamRunsPerGameLastN(
      priorRecords,
      target.awayTeamId,
      target.date,
      5,
    );
    features.homeRunsAllowedL5 = teamRunsAllowedPerGameLastN(
      priorRecords,
      target.homeTeamId,
      target.date,
      5,
    );
    features.awayRunsAllowedL5 = teamRunsAllowedPerGameLastN(
      priorRecords,
      target.awayTeamId,
      target.date,
      5,
    );
    features.homeHomeRunsL5 = teamHomeRunsLastN(
      priorRecords,
      target.homeTeamId,
      target.date,
      5,
    );
    features.awayHomeRunsL5 = teamHomeRunsLastN(
      priorRecords,
      target.awayTeamId,
      target.date,
      5,
    );
  }

  return features;
}

/**
 * game_records 테이블 → GameRecordLite[] (시즌 내 완료 경기 전체).
 * 시간순 정렬 (최신 → 과거 는 호출자 정렬). 여기선 오름차순 반환.
 */
export async function loadGameRecords(
  db: DB,
  opts: { seasons: number[] },
): Promise<GameRecordLite[]> {
  const out: GameRecordLite[] = [];
  for (const season of opts.seasons) {
    const pageSize = 1000;
    let start = 0;
    for (;;) {
      const { data, error } = await db
        .from('game_records')
        .select(
          `game_id, pitchers_home, pitchers_away,
           game:games!inner(id, game_date, home_team_id, away_team_id, home_score, away_score)`,
        )
        .gte('game.game_date', `${season}-01-01`)
        .lte('game.game_date', `${season}-12-31`)
        .range(start, start + pageSize - 1);
      if (error) throw new Error('game_records load: ' + error.message);
      if (!data || data.length === 0) break;
      for (const r of data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = Array.isArray((r as any).game) ? (r as any).game[0] : (r as any).game;
        if (!g) continue;
        out.push({
          gameId: r.game_id as number,
          gameDate: g.game_date as string,
          homeTeamId: g.home_team_id as number,
          awayTeamId: g.away_team_id as number,
          homeScore: (g.home_score as number) ?? 0,
          awayScore: (g.away_score as number) ?? 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pitchersHome: (r.pitchers_home as any) ?? [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pitchersAway: (r.pitchers_away as any) ?? [],
        });
      }
      if (data.length < pageSize) break;
      start += pageSize;
    }
  }
  out.sort((a, b) => a.gameDate.localeCompare(b.gameDate));
  return out;
}

/** 2023-2025 각 팀의 홈 승률 (리그 평균 대비 차이는 아님, 그냥 홈 승률 그 자체). */
export function computeHomeWinRates(
  games: BacktestGame[],
): Partial<Record<TeamCode, number>> {
  const totals: Partial<Record<TeamCode, { w: number; n: number }>> = {};
  for (const g of games) {
    const t = totals[g.homeTeam] ?? { w: 0, n: 0 };
    t.n++;
    if (g.homeWon) t.w++;
    totals[g.homeTeam] = t;
  }
  const out: Partial<Record<TeamCode, number>> = {};
  for (const [k, v] of Object.entries(totals)) {
    if (v && v.n > 0) out[k as TeamCode] = v.w / v.n;
  }
  return out;
}
