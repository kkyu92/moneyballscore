/**
 * Postview Daily Runner
 *
 * Phase v4-3 Task 5. 멱등성 함수 — 어느 진입점에서도 안전하게 호출 가능.
 *
 * 진입점:
 *   1. live-update.yml cron (18:00~00:50 KST, 10분 간격) — 경기 completed 감지 시
 *   2. daily-pipeline.yml 아침 run (15 KST) — 전날 누락 경기 cleanup
 *
 * 동작:
 *   - games.status='final' AND pre_game 예측 존재 AND post_game row 없음 조회
 *   - 각 경기에 runPostview 호출 후 predictions 테이블에 post_game row insert
 *   - 기존 pre_game row는 절대 update 금지 (이력 보존)
 *   - 중복 호출 안전: `onConflict: game_id,prediction_type`로 no-op
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TeamCode } from '@moneyball/shared';
import { runPostview, type ActualResult, type OriginalPrediction } from '../agents/postview';
import type { GameContext } from '../agents/types';
import { DEFAULT_PARK_FACTORS } from '../scrapers/kbo-official';

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

export interface PostviewDailyResult {
  date: string;
  eligibleGames: number;
  processed: number;
  skipped: number;
  errors: string[];
  totalTokens: number;
}

/**
 * 특정 날짜에 대해 postview가 필요한 경기들을 찾아 처리.
 * 멱등성: 이미 post_game row 있는 경기는 skip.
 */
export async function runPostviewDaily(
  date: string,
  db: DB = createAdminClient()
): Promise<PostviewDailyResult> {
  const result: PostviewDailyResult = {
    date,
    eligibleGames: 0,
    processed: 0,
    skipped: 0,
    errors: [],
    totalTokens: 0,
  };

  // 1. completed 경기 + pre_game 예측 있음 + post_game 없음
  const { data: games, error: gamesError } = await db
    .from('games')
    .select(`
      id, game_date, game_time, stadium, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      winner:teams!games_winner_team_id_fkey(code),
      external_game_id
    `)
    .eq('game_date', date)
    .eq('status', 'final');

  if (gamesError) {
    result.errors.push(`games query: ${gamesError.message}`);
    return result;
  }
  if (!games || games.length === 0) {
    console.log(`[postview-daily] ${date}: no completed games`);
    return result;
  }

  for (const g of games) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const game = g as any;
    const gameId = game.id as number;
    const homeCode = game.home_team?.code as TeamCode | undefined;
    const awayCode = game.away_team?.code as TeamCode | undefined;
    const winnerCode = game.winner?.code as TeamCode | undefined;
    const homeScore = game.home_score as number | null;
    const awayScore = game.away_score as number | null;

    if (!homeCode || !awayCode || !winnerCode) {
      result.skipped++;
      continue;
    }
    if (homeScore == null || awayScore == null) {
      result.skipped++;
      continue;
    }

    // 2. pre_game 예측 조회
    const { data: preGame } = await db
      .from('predictions')
      .select('id, predicted_winner, confidence, factors, reasoning, home_elo, away_elo')
      .eq('game_id', gameId)
      .eq('prediction_type', 'pre_game')
      .maybeSingle();

    if (!preGame) {
      result.skipped++;
      continue;
    }

    // 3. post_game row 이미 있으면 skip (멱등성)
    const { data: existingPost } = await db
      .from('predictions')
      .select('id')
      .eq('game_id', gameId)
      .eq('prediction_type', 'post_game')
      .maybeSingle();

    if (existingPost) {
      result.skipped++;
      continue;
    }

    result.eligibleGames++;

    // 4. predicted_winner team_code 조회
    const predictedWinnerCode = await lookupTeamCodeById(db, preGame.predicted_winner);
    if (!predictedWinnerCode) {
      result.errors.push(`game ${gameId}: predicted_winner team not found`);
      continue;
    }

    // 5. GameContext 축약 재구성 (scraper 재호출 없음. postview 프롬프트에 필요한 최소 정보만)
    const context = buildMinimalContext(game, homeCode, awayCode);

    const actual: ActualResult = {
      homeScore,
      awayScore,
      winnerCode,
    };

    const original: OriginalPrediction = {
      predictedWinner: predictedWinnerCode,
      homeWinProb: estimateHomeWinProb(preGame.confidence as number, predictedWinnerCode === homeCode),
      factors: (preGame.factors as Record<string, number>) ?? {},
      reasoning: String(preGame.reasoning ?? ''),
    };

    try {
      const postview = await runPostview(context, actual, original);
      result.totalTokens += postview.totalTokens;

      // 6. post_game row insert (upsert로 멱등성 보장)
      const upsertResult = await db.from('predictions').upsert(
        {
          game_id: gameId,
          prediction_type: 'post_game',
          predicted_winner: preGame.predicted_winner, // pre_game과 동일 (참조용)
          confidence: preGame.confidence,
          model_version: 'v2.0-postview',
          debate_version: 'v2-postview',
          scoring_rule: 'v1.5',
          reasoning: {
            judgeReasoning: postview.judgeReasoning,
            factorErrors: postview.factorErrors,
            homePostview: postview.homePostview,
            awayPostview: postview.awayPostview,
          },
          factors: original.factors, // pre_game factors 복사 (변경 없음)
        },
        { onConflict: 'game_id,prediction_type' }
      );

      if (upsertResult.error) {
        result.errors.push(`game ${gameId} upsert: ${upsertResult.error.message}`);
        continue;
      }

      result.processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`game ${gameId} runPostview: ${msg}`);
    }
  }

  console.log(
    `[postview-daily] ${date}: eligible=${result.eligibleGames} ` +
    `processed=${result.processed} skipped=${result.skipped} ` +
    `errors=${result.errors.length} tokens=${result.totalTokens}`
  );

  return result;
}

// ============================================
// 내부 헬퍼
// ============================================

async function lookupTeamCodeById(db: DB, teamId: number | null): Promise<TeamCode | null> {
  if (teamId == null) return null;
  const { data } = await db.from('teams').select('code').eq('id', teamId).maybeSingle();
  return (data?.code as TeamCode) ?? null;
}

/**
 * Postview 프롬프트에 필요한 최소 context 재구성.
 * 실제 경기 데이터(선발투수, Elo 등)를 다시 스크래핑하지 않고
 * DB의 pre_game row와 games row만으로 구성.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMinimalContext(game: any, homeCode: TeamCode, awayCode: TeamCode): GameContext {
  const parkFactor = DEFAULT_PARK_FACTORS[homeCode] ?? 1.0;

  return {
    game: {
      date: game.game_date,
      homeTeam: homeCode,
      awayTeam: awayCode,
      gameTime: game.game_time ?? '00:00',
      stadium: game.stadium ?? '',
      status: 'final',
      externalGameId: game.external_game_id ?? '',
    },
    // postview 프롬프트는 actual+original.factors만 쓰므로 stats는 placeholder
    homeSPStats: null,
    awaySPStats: null,
    homeTeamStats: { team: homeCode, woba: 0, bullpenFip: 0, totalWar: 0, sfr: 0 },
    awayTeamStats: { team: awayCode, woba: 0, bullpenFip: 0, totalWar: 0, sfr: 0 },
    homeElo: { team: homeCode, elo: 1500, winPct: 0.5 },
    awayElo: { team: awayCode, elo: 1500, winPct: 0.5 },
    headToHead: { wins: 0, losses: 0 },
    homeRecentForm: 0.5,
    awayRecentForm: 0.5,
    parkFactor,
  };
}

/**
 * pre_game의 confidence + predicted_winner → homeWinProb 역추정
 * confidence는 0~1 (승리확률의 절반 범위), 아래 조합으로 복원.
 * daily.ts에서 confidence는 Math.abs(homeWinProb - 0.5) * 2로 저장되므로
 * homeWinProb = predictedWinner가 home이면 0.5 + conf/2, 아니면 0.5 - conf/2
 */
function estimateHomeWinProb(confidence: number, predictedWinnerIsHome: boolean): number {
  if (predictedWinnerIsHome) return 0.5 + confidence / 2;
  return 0.5 - confidence / 2;
}
