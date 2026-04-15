import { describe, it, expect } from 'vitest';
import { deriveFactorErrorsFallback } from '../agents/postview';

describe('deriveFactorErrorsFallback', () => {
  it('홈승인데 factor가 away 쪽 편향 → 그 factor 지목', () => {
    const factors = {
      home_sp_fip: 0.4, // 원정 유리 편향, 하지만 홈승 → wrong
      home_lineup_woba: 0.6, // 홈 유리, 홈승 → correct
      park_factor: 0.35, // 원정 유리 편향, 홈승 → wrong
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toHaveLength(2);
    expect(errors[0].factor).toBe('park_factor'); // 편향 절댓값 큰 순
    expect(errors[0].predictedBias).toBeCloseTo(-0.15, 2);
    expect(errors[1].factor).toBe('home_sp_fip');
  });

  it('원정승인데 factor가 home 쪽 편향 → 그 factor 지목', () => {
    const factors = {
      home_sp_fip: 0.7, // 홈 편향, 원정승 → wrong
      home_bullpen_fip: 0.5, // 중립
      home_recent_form: 0.55, // 홈 편향, 원정승 → wrong (작음)
    };
    const errors = deriveFactorErrorsFallback(factors, false);
    expect(errors).toHaveLength(2);
    expect(errors[0].factor).toBe('home_sp_fip');
    expect(errors[0].predictedBias).toBeCloseTo(0.2, 2);
  });

  it('모든 factor가 결과와 일치 방향 → 빈 배열', () => {
    const factors = {
      home_sp_fip: 0.7,
      home_lineup_woba: 0.65,
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toEqual([]);
  });

  it('상위 3개까지만 반환', () => {
    const factors = {
      f1: 0.2,
      f2: 0.25,
      f3: 0.3,
      f4: 0.35,
      f5: 0.4,
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toHaveLength(3);
    expect(errors.map((e) => e.factor)).toEqual(['f1', 'f2', 'f3']);
  });

  it('diagnosis에 편향 수치 포함', () => {
    const factors = { home_sp_fip: 0.3 };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors[0].diagnosis).toContain('-0.20');
    expect(errors[0].diagnosis).toContain('반대 방향');
  });
});
