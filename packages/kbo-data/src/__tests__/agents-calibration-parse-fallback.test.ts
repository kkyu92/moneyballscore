import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../agents/validator', () => ({
  captureCalibrationParseFallback: vi.fn(),
}));

import { parseResponse } from '../agents/calibration-agent';
import { captureCalibrationParseFallback } from '../agents/validator';

describe('calibration parseResponse — silent fallback Sentry capture (cycle 2281)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('JSON 없는 text — no-op hint 반환 + captureCalibrationParseFallback 호출', () => {
    const hint = parseResponse('LLM 응답 텍스트 그대로', 'LG', 'OB');

    expect(hint).toEqual({
      recentBias: null,
      teamSpecific: null,
      modelWeakness: null,
      adjustmentSuggestion: 0,
    });

    expect(captureCalibrationParseFallback).toHaveBeenCalledTimes(1);
    const call = vi.mocked(captureCalibrationParseFallback).mock.calls[0][0];
    expect(call.homeTeam).toBe('LG');
    expect(call.awayTeam).toBe('OB');
    expect(call.textExcerpt).toContain('LLM 응답');
    expect(call.errorMessage).toContain('No JSON');
  });

  it('JSON 깨진 형식 — fallback + capture 호출', () => {
    parseResponse('{"adjustmentSuggestion": 0.02', 'HT', 'SS');
    expect(captureCalibrationParseFallback).toHaveBeenCalledTimes(1);
  });

  it('정상 JSON — capture 미호출 + adjustmentSuggestion 클램프', () => {
    const hint = parseResponse(
      '{"recentBias": "홈팀 과대평가", "teamSpecific": null, "modelWeakness": null, "adjustmentSuggestion": 0.9}',
      'LG',
      'OB'
    );

    expect(hint.recentBias).toBe('홈팀 과대평가');
    expect(hint.adjustmentSuggestion).toBe(0.05); // ±0.05 클램프
    expect(captureCalibrationParseFallback).not.toHaveBeenCalled();
  });
});
