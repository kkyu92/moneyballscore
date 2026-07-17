import { describe, it, expect } from 'vitest';
import { DEFAULT_WEIGHTS, FACTOR_PICK_WEIGHT_TOTAL, ACTIVE_FACTOR_KEYS } from '@moneyball/shared';

// wave-420: 팩터 수렴 픽 가중 우위 % 표시 — cycle 1773.
// favoredSlugs.reduce(sum, DEFAULT_WEIGHTS[slug]) / FACTOR_PICK_WEIGHT_TOTAL * 100 = 가중 우위 %.
// 팩터 수 기반 비율(8/10=80%)이 아닌 가중치 기반 비율 — sp_fip(15%)·lineup_woba(15%) 우세가
// head_to_head(3%)·sfr(5%) 우세보다 가중치 비율이 높음을 명시적으로 표시.

describe('wave-420 — FACTOR_PICK_WEIGHT_TOTAL 상수', () => {
  it('FACTOR_PICK_WEIGHT_TOTAL 값 = 0.85', () => {
    expect(FACTOR_PICK_WEIGHT_TOTAL).toBe(0.85);
  });

  it('ACTIVE_FACTOR_KEYS DEFAULT_WEIGHTS 합계 = 정확히 0.85 (부동소수점 정합)', () => {
    // wave-421: FACTOR_PICK_WEIGHT_TOTAL 은 파생값. 가중치 변경 시 합계 = 0.85 유지 필요.
    const sum = ACTIVE_FACTOR_KEYS.reduce<number>(
      (acc, key) => acc + DEFAULT_WEIGHTS[key],
      0
    );
    expect(sum).toBe(0.85);
  });
});

describe('wave-420 — 가중 우위 % 계산 로직', () => {
  function favoredWeightPct(slugs: string[]): number {
    const w = slugs.reduce(
      (sum, slug) => sum + (DEFAULT_WEIGHTS[slug as keyof typeof DEFAULT_WEIGHTS] ?? 0),
      0
    );
    return Math.round((w / FACTOR_PICK_WEIGHT_TOTAL) * 100);
  }

  it('sp_fip + lineup_woba 우세 = 가중 35% (30pp / 0.85)', () => {
    expect(favoredWeightPct(['sp_fip', 'lineup_woba'])).toBe(35);
  });

  it('head_to_head + sfr 우세 = 가중 9%', () => {
    expect(favoredWeightPct(['head_to_head', 'sfr'])).toBe(9);
  });

  it('10팩터 전부 우세(완전수렴) = 가중 100%', () => {
    expect(favoredWeightPct(ACTIVE_FACTOR_KEYS as unknown as string[])).toBe(100);
  });

  it('0팩터 우세 = 가중 0%', () => {
    expect(favoredWeightPct([])).toBe(0);
  });

  it('가중 우위 % ≥ 팩터 수 비율 — sp_fip·lineup_woba 우세 (2/10=20% vs 가중 35%)', () => {
    const weightPct = favoredWeightPct(['sp_fip', 'lineup_woba']);
    const countPct = Math.round((2 / 10) * 100);
    expect(weightPct).toBeGreaterThan(countPct);
  });

  it('가중 우위 % ≤ 팩터 수 비율 — head_to_head·sfr 우세 (2/10=20% vs 가중 9%)', () => {
    const weightPct = favoredWeightPct(['head_to_head', 'sfr']);
    const countPct = Math.round((2 / 10) * 100);
    expect(weightPct).toBeLessThan(countPct);
  });
});
