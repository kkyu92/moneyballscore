/**
 * runCalibrationAgent — callLLM API 실패 Sentry capture (cycle 2738)
 *
 * captureCalibrationParseFallback 은 parseResponse catch(JSON parse 실패)에서만 호출돼,
 * callLLM 이 파싱 단계 도달 전 실패(네트워크/크레딧/4xx)하면 완전 무신호였던 gap.
 * debate.ts 의 evaluateAndCaptureAgentFallback 도 calibResult 를 애초 설계(#372)부터
 * 미포함이라 이 경로는 어디서도 잡히지 않았음 — captureCalibrationApiFallback 으로 패치.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../agents/llm', () => ({
  callLLM: vi.fn(),
}));

vi.mock('../agents/validator', async () => {
  const actual = await vi.importActual<typeof import('../agents/validator')>('../agents/validator');
  return {
    ...actual,
    captureCalibrationApiFallback: vi.fn(),
  };
});

import { runCalibrationAgent, type PredictionHistory } from '../agents/calibration-agent';
import { callLLM } from '../agents/llm';
import { captureCalibrationApiFallback } from '../agents/validator';
import type { AgentResult, CalibrationHint } from '../agents/types';

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

describe('runCalibrationAgent — callLLM API 실패 capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('callLLM success:false — captureCalibrationApiFallback 호출 + fallback 그대로 반환', async () => {
    const failed: AgentResult<CalibrationHint> = {
      success: false,
      data: null,
      error: 'CREDIT_EXHAUSTED: insufficient balance',
      model: 'haiku',
      tokensUsed: 0,
      durationMs: 100,
    };
    vi.mocked(callLLM).mockResolvedValue(failed);

    const result = await runCalibrationAgent('LG', 'OB', makeHistory());

    expect(result).toEqual(failed);
    expect(captureCalibrationApiFallback).toHaveBeenCalledTimes(1);
    const call = vi.mocked(captureCalibrationApiFallback).mock.calls[0][0];
    expect(call.homeTeam).toBe('LG');
    expect(call.awayTeam).toBe('OB');
    expect(call.errorMessage).toBe('CREDIT_EXHAUSTED: insufficient balance');
  });

  it('callLLM success:true 지만 data:null — captureCalibrationApiFallback 호출', async () => {
    const noData: AgentResult<CalibrationHint> = {
      success: true,
      data: null,
      error: null,
      model: 'haiku',
      tokensUsed: 0,
      durationMs: 100,
    };
    vi.mocked(callLLM).mockResolvedValue(noData);

    await runCalibrationAgent('LG', 'OB', makeHistory());

    expect(captureCalibrationApiFallback).toHaveBeenCalledTimes(1);
    expect(vi.mocked(captureCalibrationApiFallback).mock.calls[0][0].errorMessage).toBe('unknown');
  });

  it('callLLM 정상 성공 — captureCalibrationApiFallback 미호출', async () => {
    vi.mocked(callLLM).mockResolvedValue({
      success: true,
      data: { recentBias: null, teamSpecific: null, modelWeakness: null, adjustmentSuggestion: 0 },
      error: null,
      model: 'haiku',
      tokensUsed: 100,
      durationMs: 500,
    });

    await runCalibrationAgent('LG', 'OB', makeHistory());

    expect(captureCalibrationApiFallback).not.toHaveBeenCalled();
  });
});
