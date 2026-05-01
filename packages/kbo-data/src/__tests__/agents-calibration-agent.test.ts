/**
 * runCalibrationAgent — 데이터 부족 (totalPredictions < 5) 가드 regression
 *
 * `calibration-agent.ts:119` 의 early return 은 LLM 호출 없이 no-op CalibrationHint
 * 를 돌려준다. 이 가드가 사라지거나 임계값이 흔들리면 모델이 5건 미만 표본으로
 * ±5% 보정을 시도해 운영 데이터를 오염시킨다 (v4-3 시점부터 박제된 정책).
 *
 * 본 테스트는 LLM 미호출 path 만 검증 — fetch 모킹 없이도 안정적.
 */
import { describe, it, expect } from 'vitest';
import { runCalibrationAgent, type PredictionHistory } from '../agents/calibration-agent';

function makeHistory(totalPredictions: number): PredictionHistory {
  return {
    totalPredictions,
    correctPredictions: 0,
    recentResults: [],
    homeTeamAccuracy: null,
    awayTeamAccuracy: null,
    teamAccuracy: {},
  };
}

describe('runCalibrationAgent — sparse-history guard', () => {
  it('returns no-op hint when totalPredictions is 0 (cold start, no LLM call)', async () => {
    const result = await runCalibrationAgent('LG', 'OB', makeHistory(0));

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.tokensUsed).toBe(0);
    expect(result.durationMs).toBe(0);
    expect(result.data).toEqual({
      recentBias: null,
      teamSpecific: null,
      modelWeakness: null,
      adjustmentSuggestion: 0,
    });
  });

  it('returns no-op hint at boundary (totalPredictions = 4 < 5, no LLM call)', async () => {
    const result = await runCalibrationAgent('HT', 'SS', makeHistory(4));

    expect(result.success).toBe(true);
    expect(result.tokensUsed).toBe(0);
    expect(result.durationMs).toBe(0);
    // 가장 핵심: 표본 부족 시 보정 0 — 운영 데이터 오염 차단
    expect(result.data?.adjustmentSuggestion).toBe(0);
    expect(result.data?.recentBias).toBeNull();
    expect(result.data?.teamSpecific).toBeNull();
    expect(result.data?.modelWeakness).toBeNull();
  });
});
