import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TeamCode } from '@moneyball/shared';
import { KBO_TEAMS } from '@moneyball/shared';

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
 */
export async function updateCalibration(season: number = new Date().getFullYear()) {
  const db = createAdminClient();

  const { data: predictions } = await db
    .from('predictions')
    .select('confidence, is_correct')
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null);

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
    await db.from('calibration_buckets').upsert({
      bucket,
      season,
      total_predictions: stats.total,
      correct_predictions: stats.correct,
      actual_accuracy: accuracy,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'bucket,season' });
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

/**
 * 경기 결과 기반 팀 에이전트 메모리 생성
 * 틀린 예측에서 "왜 틀렸는지" 패턴을 추출하여 메모리에 저장
 */
export async function generateAgentMemories(date: string) {
  const db = createAdminClient();

  // 해당 날짜의 검증된 예측 중 틀린 것
  const { data: wrongPredictions } = await db
    .from('predictions')
    .select(`
      predicted_winner, confidence, reasoning, factors,
      game:games!predictions_game_id_fkey(
        game_date, home_score, away_score, winner_team_id,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code)
      )
    `)
    .eq('prediction_type', 'pre_game')
    .eq('is_correct', false);

  if (!wrongPredictions || wrongPredictions.length === 0) return;

  for (const pred of wrongPredictions) {
    const game = pred.game as any;
    if (!game || game.game_date !== date) continue;

    const homeCode = game.home_team?.code;
    const awayCode = game.away_team?.code;
    if (!homeCode || !awayCode) continue;

    // 어떤 팩터가 가장 크게 기여했는데 틀렸는지 분석
    const factors = pred.factors as Record<string, number> | null;
    if (!factors) continue;

    // 가장 편향된 팩터 찾기 (0.5에서 가장 먼 것)
    let maxBias = '';
    let maxBiasVal = 0;
    for (const [key, val] of Object.entries(factors)) {
      const bias = Math.abs((val as number) - 0.5);
      if (bias > maxBiasVal) {
        maxBiasVal = bias;
        maxBias = key;
      }
    }

    if (maxBias) {
      const memoryContent = `${date} ${homeCode} vs ${awayCode}: ${maxBias} 팩터가 가장 큰 편향(${Math.round(maxBiasVal * 100)}%)을 보였으나 예측 실패. 이 팩터의 신뢰도를 재검토 필요.`;

      await db.from('agent_memories').insert({
        team_code: homeCode,
        memory_type: 'pattern',
        content: memoryContent,
        confidence: 0.6,
        valid_until: null,
      });
    }
  }
}
