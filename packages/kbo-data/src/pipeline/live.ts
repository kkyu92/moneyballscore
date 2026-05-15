import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { toKSTDateString, assertSelectOk, assertWriteOk } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { fetchLiveGames, adjustWinProbability, type LiveGameState } from '../scrapers/kbo-live';
import { runPostviewDaily } from './postview-daily';
import { CURRENT_SCORING_RULE } from './model-version';
import { fetchNaverRecord, toNaverGameId } from '../scrapers/naver-record';
import { saveGameRecord } from './save-game-record';
import { extractReasoningHomeWinProb } from '../types';

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
    // cycle 169 — updateGameScore 안 assertWriteOk throw 시 다른 final game 처리
    // 막히지 않도록 try/catch wrap. errors 배열에 push.
    for (const game of liveGames.filter((g) => g.status === 'final')) {
      try {
        await updateGameScore(db, game);
      } catch (e) {
        errors.push(`updateGameScore ${game.externalGameId}: ${e instanceof Error ? e.message : String(e)}`);
      }
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

  // KBO 리그 ID — cycle 160 silent drift family detection. .error 미체크 →
  // 네트워크 / 스키마 오류 시 league=null silent fallback → "KBO league not found"
  // false positive (실제로는 DB 오류). assertSelectOk fail-loud.
  const leagueResult = await db.from('leagues').select('id').eq('code', 'KBO').single();
  const { data: league } = assertSelectOk<{ id: number }>(leagueResult, 'live.runLiveUpdate league');
  if (!league) return { date: targetDate, liveGames: activeGames.length, updated: 0, errors: ['KBO league not found'] };

  for (const game of activeGames) {
    try {
      // DB에서 해당 경기 찾기 — cycle 160 silent drift family. single() not-found
      // (PGRST116) 도 .error 로 들어와 throw — DB에 없는 game 은 정상 skip 시그널이라
      // maybeSingle() 로 변환 + assertSelectOk fail-loud (다른 .error 폭로).
      const dbGameResult = await db
        .from('games')
        .select('id')
        .eq('external_game_id', game.externalGameId)
        .eq('league_id', league.id)
        .maybeSingle();
      const { data: dbGame } = assertSelectOk<{ id: number }>(dbGameResult, 'live.runLiveUpdate dbGame');

      if (!dbGame) continue;

      // 경기 스코어 업데이트 — cycle 169 silent drift family write 측 두 번째 진입.
      // .error 미체크 → RLS / connection / unique violation 시 silent skip → 다음 cron
      // 또 같은 game 조회 → 무한 재시도 + status mismatch. assertWriteOk fail-loud
      // (try/catch 안이라 errors 배열로 push).
      const liveUpdateResult = await db.from('games').update({
        status: 'live',
        home_score: game.homeScore,
        away_score: game.awayScore,
        updated_at: new Date().toISOString(),
      }).eq('id', dbGame.id);
      assertWriteOk(liveUpdateResult, 'live.runLiveUpdate.games.live');

      // pre_game 예측 가져오기 — cycle 160 silent drift family. maybeSingle + assertSelectOk.
      const preGameResult = await db
        .from('predictions')
        .select('confidence, reasoning')
        .eq('game_id', dbGame.id)
        .eq('prediction_type', 'pre_game')
        .maybeSingle();
      const { data: preGame } = assertSelectOk<{ confidence: number; reasoning: unknown }>(
        preGameResult,
        'live.runLiveUpdate preGame',
      );

      if (!preGame) continue;

      // pre_game에서 홈팀 승리확률 추출 — cycle 199 silent drift family pipeline 차원
      // 첫 진입. extractReasoningHomeWinProb 단일 소스 derive (3 fail reason 분기
      // console.warn 가시화: no_reasoning / no_field / invalid_value).
      const preGameHomeProb = extractReasoningHomeWinProb(
        preGame.reasoning as { homeWinProb?: unknown } | null,
        'live.runLiveUpdate preGame',
      );

      // 이닝별 보정
      const adjustedHomeProb = adjustWinProbability(
        preGameHomeProb,
        game.homeScore,
        game.awayScore,
        game.inning,
        game.isTop
      );

      const adjustedConfidence = Math.abs(adjustedHomeProb - 0.5) * 2;

      // 팀 ID 조회 — cycle 160 silent drift family. assertSelectOk fail-loud.
      const teamsResult = await db
        .from('teams')
        .select('id, code')
        .eq('league_id', league.id)
        .in('code', [game.homeTeam, game.awayTeam]);
      const { data: teams } = assertSelectOk<{ id: number; code: string }[]>(
        teamsResult,
        'live.runLiveUpdate teams',
      );

      const teamMap: Record<string, number> = {};
      for (const t of teams || []) {
        teamMap[t.code] = t.id;
      }

      const predictedWinner = adjustedHomeProb >= 0.5 ? game.homeTeam : game.awayTeam;

      // in_game 예측 upsert — cycle 169 silent drift family write 측 진입.
      // .error 미체크 → unique 위반 / RLS 시 silent skip → in_game 예측 미생성 → 사용자
      // UI 에 stale pre_game 만 보임. assertWriteOk fail-loud (try/catch 안 errors push).
      const inGameUpsertResult = await db.from('predictions').upsert({
        game_id: dbGame.id,
        prediction_type: 'in_game',
        predicted_winner: teamMap[predictedWinner],
        confidence: adjustedConfidence,
        // cycle 420 review-code heavy silent drift fix — cycle 335 에서
        // pre_game 'v1.7-revert' → 'v1.8' 전환할 때 live path 누락. cycle 335~419
        // 사이 in_game 라이브 row 가 모두 'v1.7-revert-live' 라벨 박제 → /accuracy
        // mv 별 Brier 분석에서 stale 분류. 본 fix 부터 'v1.8-live'.
        model_version: 'v1.8-live',
        // cycle 443 review-code heavy silent drift fix — pre_game (daily.ts:691) +
        // post_game (postview-daily.ts:204) 양쪽 scoring_rule 박제하는데 live in_game
        // upsert 만 누락 → DB scoring_rule=NULL. /accuracy + /debug 의 scoring_rule
        // 별 Brier 분석에서 in_game row 영구 분류 X.
        // cycle 445 review-code heavy 통합 — CURRENT_SCORING_RULE 단일 source.
        scoring_rule: CURRENT_SCORING_RULE,
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
      assertWriteOk(inGameUpsertResult, 'live.runLiveUpdate.predictions.in_game');

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
  // cycle 160 silent drift family — league/teams select assertSelectOk 통일.
  const leagueResult = await db.from('leagues').select('id').eq('code', 'KBO').single();
  const { data: league } = assertSelectOk<{ id: number }>(leagueResult, 'live.updateGameScore league');
  if (!league) return;

  const teamsResult = await db
    .from('teams')
    .select('id, code')
    .eq('league_id', league.id)
    .in('code', [game.homeTeam, game.awayTeam]);
  const { data: teams } = assertSelectOk<{ id: number; code: string }[]>(
    teamsResult,
    'live.updateGameScore teams',
  );

  const teamMap: Record<string, number> = {};
  for (const t of teams || []) {
    teamMap[t.code] = t.id;
  }

  const winnerId = game.homeScore > game.awayScore
    ? teamMap[game.homeTeam]
    : teamMap[game.awayTeam];

  // cycle 169 silent drift family write 측 — final 상태 update 가 silent skip 되면
  // postview trigger / 적중률 verify 모두 stale 상태 사용. assertWriteOk fail-loud.
  // 호출 site (runLiveUpdate L60-66) try/catch wrap 으로 다른 game 처리 보호.
  const finalUpdateResult = await db.from('games').update({
    status: 'final',
    home_score: game.homeScore,
    away_score: game.awayScore,
    winner_team_id: winnerId || null,
    updated_at: new Date().toISOString(),
  }).eq('external_game_id', game.externalGameId);
  assertWriteOk(finalUpdateResult, 'live.updateGameScore.games.final');

  // v0.5.25: 경기 종료 시 Naver record boxscore 저장 (best-effort).
  // 실패해도 live 파이프라인 막지 않음.
  try {
    // cycle 160 silent drift family — maybeSingle + assertSelectOk (game 없으면 자연 skip).
    const dbGameResult = await db
      .from('games')
      .select('id, game_date')
      .eq('external_game_id', game.externalGameId)
      .maybeSingle();
    const { data: dbGame } = assertSelectOk<{ id: number; game_date: string }>(
      dbGameResult,
      'live.updateGameScore dbGame',
    );
    if (dbGame) {
      const season = Number((dbGame.game_date as string).slice(0, 4));
      const naverGameId = toNaverGameId(game.externalGameId, season);
      const rec = await fetchNaverRecord(naverGameId);
      if (rec) {
        const r = await saveGameRecord(db, dbGame.id as number, rec);
        if (r.error) {
          console.warn(`[Live] game_records save failed ${naverGameId}: ${r.error}`);
        }
      }
    }
  } catch (e) {
    console.warn(
      '[Live] game_records fetch failed:',
      e instanceof Error ? e.message : String(e),
    );
  }
}
