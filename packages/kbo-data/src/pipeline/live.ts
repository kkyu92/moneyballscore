import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { toKSTDateString } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { fetchLiveGames, adjustWinProbability, type LiveGameState } from '../scrapers/kbo-live';
import { runPostviewDaily } from './postview-daily';

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

export interface LiveUpdateResult {
  date: string;
  liveGames: number;
  updated: number;
  errors: string[];
  postviewsProcessed?: number;
  postviewsSkipped?: number;
  postviewTokens?: number;
}

/**
 * 이닝별 업데이트 파이프라인
 * 진행 중인 경기의 스코어를 수집하고 in_game 예측을 업데이트
 */
export async function runLiveUpdate(date?: string): Promise<LiveUpdateResult> {
  const targetDate = date || toKSTDateString();
  const db = createAdminClient();
  const errors: string[] = [];
  let updated = 0;

  console.log(`[Live] Fetching live games for ${targetDate}`);

  let liveGames: LiveGameState[];
  try {
    liveGames = await fetchLiveGames(targetDate);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { date: targetDate, liveGames: 0, updated: 0, errors: [msg] };
  }

  // 진행 중인 경기만 필터
  const activeGames = liveGames.filter((g) => g.status === 'live');
  console.log(`[Live] ${activeGames.length} active games`);

  if (activeGames.length === 0) {
    // 모든 경기 종료 시 스코어 업데이트 + postview trigger (v4-3 Task 4)
    for (const game of liveGames.filter((g) => g.status === 'final')) {
      await updateGameScore(db, game);
    }

    // 경기 종료 감지 → postview-daily 호출 (멱등성으로 중복 안전)
    const postview = await runPostviewDailySafe(targetDate);

    return {
      date: targetDate,
      liveGames: 0,
      updated: 0,
      errors: postview.errors,
      postviewsProcessed: postview.processed,
      postviewsSkipped: postview.skipped,
      postviewTokens: postview.totalTokens,
    };
  }

  // KBO 리그 ID
  const { data: league } = await db.from('leagues').select('id').eq('code', 'KBO').single();
  if (!league) return { date: targetDate, liveGames: activeGames.length, updated: 0, errors: ['KBO league not found'] };

  for (const game of activeGames) {
    try {
      // DB에서 해당 경기 찾기
      const { data: dbGame } = await db
        .from('games')
        .select('id')
        .eq('external_game_id', game.externalGameId)
        .eq('league_id', league.id)
        .single();

      if (!dbGame) continue;

      // 경기 스코어 업데이트
      await db.from('games').update({
        status: 'live',
        home_score: game.homeScore,
        away_score: game.awayScore,
        updated_at: new Date().toISOString(),
      }).eq('id', dbGame.id);

      // pre_game 예측 가져오기
      const { data: preGame } = await db
        .from('predictions')
        .select('confidence, reasoning')
        .eq('game_id', dbGame.id)
        .eq('prediction_type', 'pre_game')
        .single();

      if (!preGame) continue;

      // pre_game에서 홈팀 승리확률 추출
      const preGameReasoning = preGame.reasoning as any;
      const preGameHomeProb = preGameReasoning?.homeWinProb ?? 0.5;

      // 이닝별 보정
      const adjustedHomeProb = adjustWinProbability(
        preGameHomeProb,
        game.homeScore,
        game.awayScore,
        game.inning,
        game.isTop
      );

      const adjustedConfidence = Math.abs(adjustedHomeProb - 0.5) * 2;

      // 팀 ID 조회
      const { data: teams } = await db
        .from('teams')
        .select('id, code')
        .eq('league_id', league.id)
        .in('code', [game.homeTeam, game.awayTeam]);

      const teamMap: Record<string, number> = {};
      for (const t of teams || []) {
        teamMap[t.code] = t.id;
      }

      const predictedWinner = adjustedHomeProb >= 0.5 ? game.homeTeam : game.awayTeam;

      // in_game 예측 upsert
      await db.from('predictions').upsert({
        game_id: dbGame.id,
        prediction_type: 'in_game',
        predicted_winner: teamMap[predictedWinner],
        confidence: adjustedConfidence,
        model_version: 'v1.6-live',
        reasoning: {
          preGameHomeProb,
          adjustedHomeProb,
          inning: game.inning,
          isTop: game.isTop,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          scoreDiff: game.homeScore - game.awayScore,
        },
        factors: {
          pre_game_prob: preGameHomeProb,
          score_diff: game.homeScore - game.awayScore,
          inning: game.inning,
          adjusted_prob: adjustedHomeProb,
        },
      }, { onConflict: 'game_id,prediction_type' });

      updated++;
      console.log(
        `[Live] ${game.awayTeam} ${game.awayScore}:${game.homeScore} ${game.homeTeam} ` +
        `(${game.inning}회${game.isTop ? '초' : '말'}) → ${predictedWinner} ${Math.round(adjustedHomeProb * 100)}%`
      );
    } catch (e) {
      errors.push(`${game.homeTeam} vs ${game.awayTeam}: ${e}`);
    }
  }

  // 활성 경기 처리 끝난 뒤에도 postview-daily 호출 — 일부 경기만 종료된 상태 커버
  // (예: 6경기 중 2경기 종료, 4경기 진행 중 → 종료된 2경기 postview 생성)
  const postview = await runPostviewDailySafe(targetDate);

  return {
    date: targetDate,
    liveGames: activeGames.length,
    updated,
    errors: [...errors, ...postview.errors],
    postviewsProcessed: postview.processed,
    postviewsSkipped: postview.skipped,
    postviewTokens: postview.totalTokens,
  };
}

/**
 * runPostviewDaily 호출 래퍼. 실패 시 throw 금지 — live 파이프라인이 막히면 안 됨.
 */
async function runPostviewDailySafe(date: string): Promise<{
  processed: number;
  skipped: number;
  errors: string[];
  totalTokens: number;
}> {
  try {
    const result = await runPostviewDaily(date);
    return {
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors,
      totalTokens: result.totalTokens,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[Live] runPostviewDaily failed, continuing:', msg);
    return { processed: 0, skipped: 0, errors: [`postview-daily: ${msg}`], totalTokens: 0 };
  }
}

async function updateGameScore(db: DB, game: LiveGameState) {
  const { data: league } = await db.from('leagues').select('id').eq('code', 'KBO').single();
  if (!league) return;

  const { data: teams } = await db
    .from('teams')
    .select('id, code')
    .eq('league_id', league.id)
    .in('code', [game.homeTeam, game.awayTeam]);

  const teamMap: Record<string, number> = {};
  for (const t of teams || []) {
    teamMap[t.code] = t.id;
  }

  const winnerId = game.homeScore > game.awayScore
    ? teamMap[game.homeTeam]
    : teamMap[game.awayTeam];

  await db.from('games').update({
    status: 'final',
    home_score: game.homeScore,
    away_score: game.awayScore,
    winner_team_id: winnerId || null,
    updated_at: new Date().toISOString(),
  }).eq('external_game_id', game.externalGameId);
}
