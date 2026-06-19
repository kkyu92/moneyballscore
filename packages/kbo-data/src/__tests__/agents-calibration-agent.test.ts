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
import { runCalibrationAgent, buildCalibrationContextBlock, type PredictionHistory } from '../agents/calibration-agent';

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

describe('buildCalibrationContextBlock — plan #23 Step 5 wave 47 domain hints prepend', () => {
  // mid-season (6월) 고정 — getSeasonPhase 가 안정 박제
  const midSeason = new Date('2026-06-19T00:00:00Z');

  it('LG home → 잠실 park hint + season + time windows 박제', () => {
    const block = buildCalibrationContextBlock('LG', 'HT', midSeason);

    expect(block.startsWith('[도메인 컨텍스트]')).toBe(true);
    expect(block).toContain('잠실');
    expect(block).toContain('park_factor=');
    expect(block).toContain('시즌');   // renderSeasonForLLM 의 한글 라벨
    expect(block).toContain('분석 윈도우');
  });

  it('non-rivalry 매치 시 라이벌리 hint 자동 제외', () => {
    // KT vs NC = 일반적으로 KBO_RIVALRIES 미포함
    const block = buildCalibrationContextBlock('KT', 'NC', midSeason);

    expect(block).not.toContain('라이벌리 매치');
  });
});
