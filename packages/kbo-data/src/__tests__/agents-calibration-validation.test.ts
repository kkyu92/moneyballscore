/**
 * runCalibrationAgent — Validator Layer 1 wiring (cycle 2636)
 *
 * team-agent / judge-agent 는 validateTeamArgument / validateJudgeReasoning 으로
 * 환각 검증을 받지만, calibration-agent 는 recentBias/teamSpecific/modelWeakness 를
 * (apps/moneyball 의 /analysis/game/[id] 페이지에 그대로 노출되는 텍스트인데도) 검증 없이
 * 그대로 반환하던 갭. validateCalibrationHint + maskViolatedReasoning 로 위반 부분만
 * mask (judge-agent 와 동일 패턴, 전체 reject X) 하는지 확인.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../agents/llm', () => ({
  callLLM: vi.fn(),
}));

import { runCalibrationAgent, type PredictionHistory } from '../agents/calibration-agent';
import { callLLM } from '../agents/llm';
import type { CalibrationHint, AgentResult } from '../agents/types';

function makeHistory(): PredictionHistory {
  return {
    totalPredictions: 12,
    correctPredictions: 7,
    recentResults: [],
    homeTeamAccuracy: 0.6,
    awayTeamAccuracy: 0.5,
    teamAccuracy: {},
  };
}

function mockLLMResult(data: CalibrationHint): AgentResult<CalibrationHint> {
  return {
    success: true,
    data,
    error: null,
    model: 'haiku',
    tokensUsed: 100,
    durationMs: 500,
  };
}

describe('runCalibrationAgent — validator masking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('환각 숫자 3개+ → recentBias 만 mask, adjustmentSuggestion 원본 유지', async () => {
    vi.mocked(callLLM).mockResolvedValue(
      mockLLMResult({
        recentBias: '최근 99건 중 88건 적중(77%).',
        teamSpecific: null,
        modelWeakness: null,
        adjustmentSuggestion: 0.03,
      })
    );

    const result = await runCalibrationAgent('LG', 'OB', makeHistory());

    expect(result.success).toBe(true);
    expect(result.data?.recentBias).toContain('[검증실패:환각숫자]');
    expect(result.data?.recentBias).not.toContain('99');
    expect(result.data?.recentBias).not.toContain('88');
    expect(result.data?.adjustmentSuggestion).toBe(0.03);
  });

  it('주입 데이터(총 예측/적중/적중률)와 일치하는 텍스트 → mask 없음', async () => {
    vi.mocked(callLLM).mockResolvedValue(
      mockLLMResult({
        recentBias: '최근 12건 중 7건 적중(58%).',
        teamSpecific: null,
        modelWeakness: null,
        adjustmentSuggestion: 0.02,
      })
    );

    const result = await runCalibrationAgent('LG', 'OB', makeHistory());

    expect(result.data?.recentBias).toBe('최근 12건 중 7건 적중(58%).');
    expect(result.data?.adjustmentSuggestion).toBe(0.02);
  });

  it('금칙어만 있는 modelWeakness → 해당 필드만 mask, 나머지 필드 보존', async () => {
    vi.mocked(callLLM).mockResolvedValue(
      mockLLMResult({
        recentBias: '최근 12건 중 7건 적중(58%).',
        teamSpecific: null,
        modelWeakness: 'LG 왕조의 시대가 도래한다.',
        adjustmentSuggestion: 0.01,
      })
    );

    const result = await runCalibrationAgent('LG', 'OB', makeHistory());

    expect(result.data?.recentBias).toBe('최근 12건 중 7건 적중(58%).');
    expect(result.data?.modelWeakness).toContain('[검증실패:금칙어]');
  });

  it('모든 텍스트 필드 null (adjustmentSuggestion만) → 검증 skip, 그대로 반환', async () => {
    vi.mocked(callLLM).mockResolvedValue(
      mockLLMResult({
        recentBias: null,
        teamSpecific: null,
        modelWeakness: null,
        adjustmentSuggestion: 0.04,
      })
    );

    const result = await runCalibrationAgent('LG', 'OB', makeHistory());

    expect(result.data).toEqual({
      recentBias: null,
      teamSpecific: null,
      modelWeakness: null,
      adjustmentSuggestion: 0.04,
    });
  });
});
