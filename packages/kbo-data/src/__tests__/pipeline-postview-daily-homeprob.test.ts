import { describe, it, expect } from 'vitest';
import {
  estimateHomeWinProb,
  resolveOriginalHomeWinProb,
} from '../pipeline/postview-daily';

describe('estimateHomeWinProb (legacy quant fallback)', () => {
  it('홈 예측 + confidence 0.5 → 0.75', () => {
    expect(estimateHomeWinProb(0.5, true)).toBeCloseTo(0.75);
  });
  it('원정 예측 + confidence 0.5 → 0.25', () => {
    expect(estimateHomeWinProb(0.5, false)).toBeCloseTo(0.25);
  });
  it('confidence 0 → 0.5 (tossup)', () => {
    expect(estimateHomeWinProb(0, true)).toBeCloseTo(0.5);
    expect(estimateHomeWinProb(0, false)).toBeCloseTo(0.5);
  });
});

describe('resolveOriginalHomeWinProb (cycle 379 silent drift fix)', () => {
  it('reasoning.homeWinProb 있으면 그 값 사용 (debate-success source of truth)', () => {
    const reasoning = { homeWinProb: 0.62, confidence: 0.45 };
    // confidence=0.45 + home → legacy estimate=0.725. 실제 = 0.62.
    expect(resolveOriginalHomeWinProb(reasoning, 0.45, true)).toBeCloseTo(0.62);
  });

  it('일요일 cap 시나리오: judge.confidence=0.45 capped, hwp=0.68 (high) — hwp 우선', () => {
    // Sunday cap 적용 row: confidence 0.45 로 capped 됐지만 hwp 는 0.68 그대로.
    // 기존 버그: estimate(0.45, true)=0.725 (실제 0.68 와 다름).
    const reasoning = { homeWinProb: 0.68 };
    expect(resolveOriginalHomeWinProb(reasoning, 0.45, true)).toBeCloseTo(0.68);
  });

  it('reasoning 이 string (legacy v1.5 row) → estimate fallback', () => {
    expect(resolveOriginalHomeWinProb('legacy reasoning text', 0.4, true)).toBeCloseTo(0.7);
  });

  it('reasoning null → estimate fallback', () => {
    expect(resolveOriginalHomeWinProb(null, 0.3, false)).toBeCloseTo(0.35);
  });

  it('reasoning.homeWinProb 비정상값 (NaN/범위초과) → estimate fallback', () => {
    expect(resolveOriginalHomeWinProb({ homeWinProb: NaN }, 0.4, true)).toBeCloseTo(0.7);
    expect(resolveOriginalHomeWinProb({ homeWinProb: -0.1 }, 0.4, true)).toBeCloseTo(0.7);
    expect(resolveOriginalHomeWinProb({ homeWinProb: 1.5 }, 0.4, true)).toBeCloseTo(0.7);
  });

  it('reasoning.homeWinProb=0 / 1 (extreme but valid) → 사용', () => {
    expect(resolveOriginalHomeWinProb({ homeWinProb: 0 }, 0.9, true)).toBe(0);
    expect(resolveOriginalHomeWinProb({ homeWinProb: 1 }, 0.9, false)).toBe(1);
  });

  it('reasoning.homeWinProb=0.5 (tossup) — confidence 무관 0.5 박제', () => {
    expect(resolveOriginalHomeWinProb({ homeWinProb: 0.5 }, 0.99, true)).toBe(0.5);
  });
});
