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
import { assertSelectOk, assertWriteOk, type TeamCode } from '@moneyball/shared';
import { runPostview, type ActualResult, type OriginalPrediction } from '../agents/postview';
import type { GameContext } from '../agents/types';
import { DEFAULT_PARK_FACTORS } from '../scrapers/kbo-official';
import { decidePostviewModelVersion } from './model-version';

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
  // cycle 161 silent drift family — games select assertSelectOk 통일.
  const gamesResult = await db
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: games } = assertSelectOk<any[]>(gamesResult, 'postview-daily.runPostviewDaily games');
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

    // 2. pre_game 예측 조회 — cycle 161 silent drift family. assertSelectOk fail-loud.
    // scoring_rule 포함 — post_game row 에 pre_game 의 scoring_rule 상속 (cycle 334 fix).
    const preGameResult = await db
      .from('predictions')
      .select('id, predicted_winner, confidence, factors, reasoning, home_elo, away_elo, scoring_rule')
      .eq('game_id', gameId)
      .eq('prediction_type', 'pre_game')
      .maybeSingle();
    const { data: preGame } = assertSelectOk<{
      id: number;
      predicted_winner: number;
      confidence: number;
      factors: unknown;
      reasoning: unknown;
      home_elo: number | null;
      away_elo: number | null;
      scoring_rule: string | null;
    }>(preGameResult, 'postview-daily.runPostviewDaily preGame');

    if (!preGame) {
      result.skipped++;
      continue;
    }

    // 3. post_game row 이미 있으면 skip (멱등성) — cycle 161 silent drift family.
    const existingPostResult = await db
      .from('predictions')
      .select('id')
      .eq('game_id', gameId)
      .eq('prediction_type', 'post_game')
      .maybeSingle();
    const { data: existingPost } = assertSelectOk<{ id: number }>(
      existingPostResult,
      'postview-daily.runPostviewDaily existingPost',
    );

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
      homeWinProb: resolveOriginalHomeWinProb(
        preGame.reasoning,
        preGame.confidence as number,
        predictedWinnerCode === homeCode,
      ),
      factors: (preGame.factors as Record<string, number>) ?? {},
      reasoning: typeof preGame.reasoning === 'string'
        ? preGame.reasoning
        : String((preGame.reasoning as { reasoning?: unknown })?.reasoning ?? ''),
    };

    try {
      const postview = await runPostview(context, actual, original);
      result.totalTokens += postview.totalTokens;

      // cycle 384 fix-incident heavy — agentsFailed silent drift 차단 (PR #372 패턴).
      // ANTHROPIC credit 소진 시 모든 LLM 호출 실패 → fallback verdict 박제됨에도
      // mv='v2.0-postview' 라벨 silent. errors push + version 강등 (v1.8-postview).
      if (postview.agentsFailed) {
        const errMsg = postview.agentError?.slice(0, 200) ?? 'API error';
        result.errors.push(`game ${gameId} postview agents fallback: ${errMsg}`);
      }
      const versionDecision = decidePostviewModelVersion({
        hasApiKey: !!process.env.ANTHROPIC_API_KEY,
        agentsSucceeded: !postview.agentsFailed,
      });

      // 6. post_game row insert (upsert로 멱등성 보장)
      // cycle 171 silent drift family write 측 네 번째 진입.
      // .error 미체크 시 unique violation / RLS 시 silent skip → post_game row
      // 미생성 → 다음 postview-daily 또 같은 game 처리 시도 → 무한 재시도 +
      // 운영 토큰 낭비. assertWriteOk fail-loud (외부 try/catch errors push).
      const upsertResult = await db.from('predictions').upsert(
        {
          game_id: gameId,
          prediction_type: 'post_game',
          predicted_winner: preGame.predicted_winner, // pre_game과 동일 (참조용)
          confidence: preGame.confidence,
          model_version: versionDecision.model_version,
          debate_version: versionDecision.debate_version,
          scoring_rule: preGame.scoring_rule ?? versionDecision.scoring_rule,
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
      assertWriteOk(upsertResult, 'postview-daily.runPostviewDaily.predictions.post_game');

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
  // cycle 161 silent drift family — teams select assertSelectOk 통일.
  const teamResult = await db.from('teams').select('code').eq('id', teamId).maybeSingle();
  const { data } = assertSelectOk<{ code: string }>(teamResult, 'postview-daily.lookupTeamCodeById');
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
 * pre_game의 confidence + predicted_winner → homeWinProb 역추정 (legacy fallback).
 * confidence는 0~1 (승리확률의 절반 범위). 아래 조합으로 복원.
 * 정량 fallback path (debate 미실행) 에서 confidence = Math.abs(homeWinProb - 0.5) * 2
 * 이므로 homeWinProb = predictedWinner가 home이면 0.5 + conf/2, 아니면 0.5 - conf/2.
 *
 * ⚠️ debate 성공 path 에선 confidence = judge meta-confidence (사용자에게 보여지는
 * 자신감 수치) — homeWinProb 와의 산술 관계가 깨짐. 그래서 reasoning.homeWinProb
 * 가 있으면 그 값 우선 (resolveOriginalHomeWinProb).
 */
export function estimateHomeWinProb(confidence: number, predictedWinnerIsHome: boolean): number {
  if (predictedWinnerIsHome) return 0.5 + confidence / 2;
  return 0.5 - confidence / 2;
}

/**
 * pre_game row 의 실제 homeWinProb 복원.
 *
 * - `reasoning.homeWinProb` (final-reasoning.ts buildFinalReasoning 박제 source
 *   of truth) 존재 시 그 값을 그대로 사용.
 * - 부재 시 (legacy row 또는 reasoning 이 string) confidence + predicted_winner
 *   조합으로 역추정. debate 성공 row 의 confidence 는 judge meta-confidence 라
 *   역추정값이 실제 homeWinProb 와 다를 수 있지만 v1.5/v1.6 시절 quant-only
 *   path 에선 정확.
 *
 * cycle 379 silent drift family fix — debate-success row 의 postview prompt
 * `original.homeWinProb` 가 judge meta-confidence 로 잘못 추정돼 factor
 * attribution 이 깨진 채 agent_memories 학습.
 */
export function resolveOriginalHomeWinProb(
  reasoning: unknown,
  confidence: number,
  predictedWinnerIsHome: boolean,
): number {
  if (reasoning && typeof reasoning === 'object') {
    const hwp = (reasoning as { homeWinProb?: unknown }).homeWinProb;
    if (typeof hwp === 'number' && Number.isFinite(hwp) && hwp >= 0 && hwp <= 1) {
      return hwp;
    }
  }
  return estimateHomeWinProb(confidence, predictedWinnerIsHome);
}
