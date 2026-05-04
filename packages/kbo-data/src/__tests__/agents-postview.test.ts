import { describe, it, expect } from 'vitest';
import { deriveFactorErrorsFallback, isWeightedFactor } from '../agents/postview';

describe('isWeightedFactor', () => {
  it('가중치 > 0% factor (sp_fip / lineup_woba / bullpen_fip / recent_form / war / sp_xfip / elo) 통과', () => {
    expect(isWeightedFactor('sp_fip')).toBe(true);
    expect(isWeightedFactor('home_lineup_woba')).toBe(true);
    expect(isWeightedFactor('away_bullpen_fip')).toBe(true);
    expect(isWeightedFactor('home_recent_form')).toBe(true);
    expect(isWeightedFactor('war')).toBe(true);
    expect(isWeightedFactor('home_sp_xfip')).toBe(true);
    expect(isWeightedFactor('elo')).toBe(true);
  });

  it('가중치 0% factor (head_to_head / park_factor / sfr) 차단', () => {
    expect(isWeightedFactor('head_to_head')).toBe(false);
    expect(isWeightedFactor('home_head_to_head')).toBe(false);
    expect(isWeightedFactor('park_factor')).toBe(false);
    expect(isWeightedFactor('sfr')).toBe(false);
    expect(isWeightedFactor('away_sfr')).toBe(false);
  });

  it('알려지지 않은 factor 차단', () => {
    expect(isWeightedFactor('unknown')).toBe(false);
    expect(isWeightedFactor('')).toBe(false);
  });
});

describe('deriveFactorErrorsFallback', () => {
  it('홈승인데 가중치 factor 가 away 쪽 편향 → 그 factor 지목', () => {
    const factors = {
      home_sp_fip: 0.4, // 원정 유리 편향, 하지만 홈승 → wrong (weighted)
      home_lineup_woba: 0.6, // 홈 유리, 홈승 → correct
      park_factor: 0.35, // 원정 유리 편향이지만 가중치 0% → 차단
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toHaveLength(1);
    expect(errors[0].factor).toBe('home_sp_fip');
    expect(errors[0].predictedBias).toBeCloseTo(-0.1, 2);
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

  it('가중치 0% factor 만 들어와도 빈 배열 (head_to_head / sfr / park_factor 차단)', () => {
    const factors = {
      home_head_to_head: 0.2,
      away_sfr: 0.7,
      park_factor: 0.3,
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toEqual([]);
  });

  it('상위 3개까지만 반환 (가중치 factor 만)', () => {
    const factors = {
      home_sp_fip: 0.2,
      home_sp_xfip: 0.25,
      home_bullpen_fip: 0.3,
      home_recent_form: 0.35,
      home_war: 0.4,
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toHaveLength(3);
    expect(errors.map((e) => e.factor)).toEqual([
      'home_sp_fip',
      'home_sp_xfip',
      'home_bullpen_fip',
    ]);
  });

  it('diagnosis에 편향 수치 포함', () => {
    const factors = { home_sp_fip: 0.3 };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors[0].diagnosis).toContain('-0.20');
    expect(errors[0].diagnosis).toContain('반대 방향');
  });
});
