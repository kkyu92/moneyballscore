import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractReasoningHomeWinProb } from '../types';

describe('extractReasoningHomeWinProb — cycle 199 silent drift family pipeline 차원 첫 진입', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('정상 reasoning + 유효 homeWinProb 그대로 리턴 (no warn)', () => {
    expect(extractReasoningHomeWinProb({ homeWinProb: 0.62 }, 'X')).toBe(0.62);
    expect(extractReasoningHomeWinProb({ homeWinProb: 0 }, 'X')).toBe(0);
    expect(extractReasoningHomeWinProb({ homeWinProb: 1 }, 'X')).toBe(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('reasoning null → fallback 0.5 + no_reasoning warn', () => {
    expect(extractReasoningHomeWinProb(null, 'live.preGame')).toBe(0.5);
    expect(warnSpy).toHaveBeenCalledWith(
      '[homeWinProb] live.preGame: no_reasoning → fallback 0.5',
    );
  });

  it('reasoning undefined → fallback 0.5 + no_reasoning warn', () => {
    expect(extractReasoningHomeWinProb(undefined, 'daily-summary')).toBe(0.5);
    expect(warnSpy).toHaveBeenCalledWith(
      '[homeWinProb] daily-summary: no_reasoning → fallback 0.5',
    );
  });

  it('reasoning 있으나 homeWinProb 필드 부재 → fallback 0.5 + no_field warn', () => {
    expect(extractReasoningHomeWinProb({}, 'X')).toBe(0.5);
    expect(warnSpy).toHaveBeenCalledWith('[homeWinProb] X: no_field → fallback 0.5');
  });

  it('homeWinProb null/undefined 도 no_field 분기 (== null 가드)', () => {
    expect(extractReasoningHomeWinProb({ homeWinProb: null }, 'X')).toBe(0.5);
    expect(extractReasoningHomeWinProb({ homeWinProb: undefined }, 'X')).toBe(0.5);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    for (const call of warnSpy.mock.calls) {
      expect(call[0]).toContain('no_field');
    }
  });

  it('범위 밖 (음수 / 1 초과 / NaN / Infinity) → fallback 0.5 + invalid_value warn', () => {
    expect(extractReasoningHomeWinProb({ homeWinProb: -0.1 }, 'X')).toBe(0.5);
    expect(extractReasoningHomeWinProb({ homeWinProb: 1.5 }, 'X')).toBe(0.5);
    expect(extractReasoningHomeWinProb({ homeWinProb: NaN }, 'X')).toBe(0.5);
    expect(extractReasoningHomeWinProb({ homeWinProb: Infinity }, 'X')).toBe(0.5);
    expect(warnSpy).toHaveBeenCalledTimes(4);
    for (const call of warnSpy.mock.calls) {
      expect(call[0]).toContain('invalid_value');
    }
  });

  it('문자열 형태 숫자도 Number 변환 후 검증 (정상 path)', () => {
    expect(extractReasoningHomeWinProb({ homeWinProb: '0.55' as unknown as number }, 'X')).toBe(0.55);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('non-numeric 문자열 → invalid_value', () => {
    expect(extractReasoningHomeWinProb({ homeWinProb: 'abc' as unknown as number }, 'X')).toBe(0.5);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid_value'),
    );
  });

  it('label 이 warn 메시지에 박제 — 호출 site 식별 가능', () => {
    extractReasoningHomeWinProb(null, 'live.runLiveUpdate preGame');
    extractReasoningHomeWinProb(null, 'daily-summary.buildSummaryPredictions');
    expect(warnSpy.mock.calls[0][0]).toContain('live.runLiveUpdate preGame');
    expect(warnSpy.mock.calls[1][0]).toContain('daily-summary.buildSummaryPredictions');
  });
});
