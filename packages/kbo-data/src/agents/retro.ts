import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TeamCode } from '@moneyball/shared';
import { KBO_TEAMS, assertSelectOk, assertWriteOk } from '@moneyball/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

function createAdminClient(): DB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials required');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Confidence Calibration 업데이트
 * 검증된 예측을 3버킷(low/mid/high)으로 분류하고 실제 적중률 계산
 *
 * cycle 174 — silent drift family agents 차원 첫 진입. predictions select +
 * calibration_buckets upsert 양쪽 .error 무시 → silent fail 시 calibration
 * 미갱신을 무에러처럼 위장. assertSelectOk / assertWriteOk 통일 (throw → caller
 * (daily.ts compound block) try/catch errors[] push). dbInjected param 추가
 * (테스트 가드 위해, default = createAdminClient).
 */
export async function updateCalibration(
  season: number = new Date().getFullYear(),
  dbInjected?: DB,
) {
  const db = dbInjected ?? createAdminClient();

  const predictionsResult = await db
    .from('predictions')
    .select('confidence, is_correct')
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null);
  const { data: predictions } = assertSelectOk<
    Array<{ confidence: number; is_correct: boolean }>
  >(predictionsResult, 'retro.updateCalibration.predictions');

  if (!predictions || predictions.length === 0) return;

  const buckets = {
    low: { total: 0, correct: 0 },   // confidence < 0.60
    mid: { total: 0, correct: 0 },   // 0.60 ~ 0.75
    high: { total: 0, correct: 0 },  // >= 0.75
  };

  for (const pred of predictions) {
    // confidence를 승리확률로 변환 (0.5 + confidence/2)
    const winProb = 0.5 + (pred.confidence as number) / 2;
    const bucket = winProb < 0.60 ? 'low' : winProb < 0.75 ? 'mid' : 'high';
    buckets[bucket].total++;
    if (pred.is_correct) buckets[bucket].correct++;
  }

  for (const [bucket, stats] of Object.entries(buckets)) {
    const accuracy = stats.total > 0 ? stats.correct / stats.total : null;
    const upsertResult = await db.from('calibration_buckets').upsert({
      bucket,
      season,
      total_predictions: stats.total,
      correct_predictions: stats.correct,
      actual_accuracy: accuracy,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'bucket,season' });
    assertWriteOk(upsertResult, `retro.updateCalibration.calibration_buckets.${bucket}`);
  }

  // 단조성 검사: high > mid > low 여야 정상
  const lowAcc = buckets.low.total > 5 ? buckets.low.correct / buckets.low.total : null;
  const midAcc = buckets.mid.total > 5 ? buckets.mid.correct / buckets.mid.total : null;
  const highAcc = buckets.high.total > 5 ? buckets.high.correct / buckets.high.total : null;

  let monotonic = true;
  if (lowAcc != null && midAcc != null && midAcc < lowAcc) monotonic = false;
  if (midAcc != null && highAcc != null && highAcc < midAcc) monotonic = false;

  console.log(
    `[Calibration] low: ${lowAcc != null ? Math.round(lowAcc * 100) + '%' : '-'} | ` +
    `mid: ${midAcc != null ? Math.round(midAcc * 100) + '%' : '-'} | ` +
    `high: ${highAcc != null ? Math.round(highAcc * 100) + '%' : '-'} | ` +
    `monotonic: ${monotonic ? 'YES' : 'NO (경고: 높은 confidence가 더 낮은 적중률)'}`
  );

  return { buckets, monotonic };
}

// ============================================
// v4-3 Task 3: memory_type 분류 + home/away 양쪽 row
// ============================================

export type MemoryType = 'strength' | 'weakness' | 'pattern' | 'matchup';

export interface MemoryClassification {
  type: MemoryType;
  content: string;
  confidence: number;
}

/**
 * 팀 관점에서 factor 편향을 memory_type으로 분류 (순수 함수, 테스트 용이)
 *
 * 규칙:
 *   - h2h 팩터(head_to_head) → matchup
 *   - 편향 크기 ≤ 0.05 → pattern (변동 없음)
 *   - 편향 방향이 예측 결과와 일치 → strength (해당 팀의 강점이 반영됨)
 *   - 편향 방향이 예측 결과와 반대 → weakness (해당 팀의 약점이 덜 반영됨)
 *
 * factor value convention: 0.5 중립, >0.5이면 홈팀 유리, <0.5이면 원정팀 유리
 */
export function classifyMemoryType(params: {
  factorKey: string;
  factorValue: number;
  teamSide: 'home' | 'away';
  teamWon: boolean;
}): MemoryType {
  const { factorKey, factorValue, teamSide, teamWon } = params;

  if (factorKey.includes('head_to_head') || factorKey.includes('h2h')) {
    return 'matchup';
  }

  const bias = Math.abs(factorValue - 0.5);
  if (bias <= 0.05) return 'pattern';

  // 팀에게 유리했던 팩터인지 판단
  const favorsTeam = teamSide === 'home' ? factorValue > 0.5 : factorValue < 0.5;

  // 이 팀이 이겼고 factor도 유리했으면 → strength (반영 잘됨)
  // 이 팀이 졌는데 factor가 유리했으면 → weakness (반영 부족)
  // 이 팀이 이겼는데 factor가 불리했으면 → weakness (factor가 틀림)
  // 이 팀이 졌고 factor도 불리했으면 → strength (상대 강점)
  if (teamWon && favorsTeam) return 'strength';
  if (!teamWon && !favorsTeam) return 'strength';
  return 'weakness';
}

/**
 * 7일 뒤 날짜 문자열 (YYYY-MM-DD). valid_until 계산용.
 */
export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 팀 관점의 maxBias factor → memory row 생성 (순수 함수)
 * factors가 비어있거나 모든 bias ≤ 0 이면 null 반환.
 */
export function buildMemoryForTeam(params: {
  factors: Record<string, number>;
  teamCode: string;
  teamSide: 'home' | 'away';
  teamWon: boolean;
  date: string;
  opponentCode: string;
}): MemoryClassification | null {
  const { factors, teamCode, teamSide, teamWon, date, opponentCode } = params;

  let maxBias = '';
  let maxBiasVal = 0;
  for (const [key, val] of Object.entries(factors)) {
    const bias = Math.abs(val - 0.5);
    if (bias > maxBiasVal) {
      maxBiasVal = bias;
      maxBias = key;
    }
  }
  if (!maxBias || maxBiasVal === 0) return null;

  const factorValue = factors[maxBias];
  const type = classifyMemoryType({
    factorKey: maxBias,
    factorValue,
    teamSide,
    teamWon,
  });

  const sign = factorValue > 0.5 ? '+' : '';
  const content = `${teamCode}: ${maxBias} ${sign}${(factorValue - 0.5).toFixed(2)} (${type}, vs ${opponentCode} ${date})`;

  return {
    type,
    content,
    confidence: 0.6,
  };
}

/**
 * 경기 결과 기반 팀 에이전트 메모리 생성 (v4-3 Task 3 개선)
 *
 * 변경점 (v4-2 → v4-3):
 * - 🔴 BUG FIX: home 팀만 insert → home/away **양쪽** insert (eng-review C1)
 * - memory_type: 'pattern' 하드코딩 → strength/weakness/pattern/matchup 분류
 * - valid_until: null → date + 7일
 * - source_game_id: 누락 → FK로 저장
 * - insert → upsert (onConflict) — UNIQUE(team_code, memory_type, content)와 짝,
 *   동일 내용 재발생 시 valid_until만 연장 (중복 row 방지)
 */
export async function generateAgentMemories(date: string, dbInjected?: DB) {
  const db = dbInjected ?? createAdminClient();

  const wrongResult = await db
    .from('predictions')
    .select(`
      game_id, predicted_winner, confidence, reasoning, factors,
      game:games!predictions_game_id_fkey(
        id, game_date, home_score, away_score,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code),
        winner:teams!games_winner_team_id_fkey(code)
      )
    `)
    .eq('prediction_type', 'pre_game')
    .eq('is_correct', false);
  // cycle 174 — silent drift family agents 차원 첫 진입. .error 미체크 시
  // wrong 데이터 누락이 "오답 0건" 으로 위장 → Phase D Compound 루프 학습 누락.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wrongPredictions } = assertSelectOk<any[]>(
    wrongResult,
    'retro.generateAgentMemories.predictions',
  );

  if (!wrongPredictions || wrongPredictions.length === 0) return;

  const newValidUntil = addDays(date, 7);

  for (const pred of wrongPredictions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const game = pred.game as any;
    if (!game || game.game_date !== date) continue;

    const homeCode = game.home_team?.code;
    const awayCode = game.away_team?.code;
    const winnerCode = game.winner?.code;
    if (!homeCode || !awayCode) continue;

    const factors = pred.factors as Record<string, number> | null;
    if (!factors) continue;

    // 🔴 home/away 양쪽 각각의 관점에서 memory 생성
    const teams: Array<{ code: string; side: 'home' | 'away'; opponent: string }> = [
      { code: homeCode, side: 'home', opponent: awayCode },
      { code: awayCode, side: 'away', opponent: homeCode },
    ];

    for (const t of teams) {
      const memory = buildMemoryForTeam({
        factors,
        teamCode: t.code,
        teamSide: t.side,
        teamWon: winnerCode === t.code,
        date,
        opponentCode: t.opponent,
      });
      if (!memory) continue;

      // upsert: 동일 (team_code, memory_type, content) 존재 시 valid_until 연장만.
      // cycle 174 — silent drift family agents 차원 첫 진입. assertWriteOk
      // 통일 (try/catch wrapper 안). console.warn → console.error 로 level
      // 올림 + structured 메시지 (관측 가시성). per-game tolerant 의도 보전 위해
      // throw 안 (다음 game 계속 진행) — postview-daily / backfill-sp 패턴 일관.
      try {
        const upsertResult = await db.from('agent_memories').upsert(
          {
            team_code: t.code,
            memory_type: memory.type,
            content: memory.content,
            confidence: memory.confidence,
            source_game_id: game.id,
            valid_until: newValidUntil,
          },
          { onConflict: 'team_code,memory_type,content' }
        );
        assertWriteOk(upsertResult, `retro.generateAgentMemories.agent_memories.${t.code}`);
      } catch (e) {
        console.error(
          `[retro] agent_memories upsert failed for ${t.code}:`,
          e instanceof Error ? e.message : String(e),
        );
      }
    }
  }
}
