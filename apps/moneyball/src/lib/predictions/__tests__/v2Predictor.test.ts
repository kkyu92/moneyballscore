import { describe, expect, it } from 'vitest';
import {
  V2_1_B_WEIGHTS,
  applyV2_1_BWeights,
  computeDelta,
} from '../v2Predictor';

describe('V2_1_B_WEIGHTS', () => {
  it('합계 0.85 (DEFAULT_WEIGHTS 와 동일)', () => {
    const sum = (Object.values(V2_1_B_WEIGHTS) as number[]).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBeCloseTo(0.85, 10);
  });

  it('sfr 가중치 0 (Wayback 부분 회귀)', () => {
    expect(V2_1_B_WEIGHTS.sfr).toBe(0);
  });

  it('h2h 가중치 0.02', () => {
    expect(V2_1_B_WEIGHTS.head_to_head).toBe(0.02);
  });
});

describe('applyV2_1_BWeights', () => {
  it('null factors → null 반환', () => {
    expect(applyV2_1_BWeights(null)).toBeNull();
    expect(applyV2_1_BWeights(undefined)).toBeNull();
  });

  it('모든 factor 0.5 (균형) → homeWinProb ≈ 0.5 + HOME_ADVANTAGE 0.015 = 0.515', () => {
    const factors: Record<string, number> = {
      sp_fip: 0.5,
      sp_xfip: 0.5,
      lineup_woba: 0.5,
      bullpen_fip: 0.5,
      recent_form: 0.5,
      war: 0.5,
      head_to_head: 0.5,
      park_factor: 0.5,
      elo: 0.5,
      sfr: 0.5,
    };
    const result = applyV2_1_BWeights(factors);
    expect(result).not.toBeNull();
    expect(result!.homeWinProb).toBeCloseTo(0.515, 5);
    expect(result!.missingFactorKeys).toEqual([]);
  });

  it('홈팀 우세 (모든 factor 0.8) → clamp 0.85', () => {
    const factors: Record<string, number> = {
      sp_fip: 0.8,
      sp_xfip: 0.8,
      lineup_woba: 0.8,
      bullpen_fip: 0.8,
      recent_form: 0.8,
      war: 0.8,
      head_to_head: 0.8,
      park_factor: 0.8,
      elo: 0.8,
      sfr: 0.8,
    };
    const result = applyV2_1_BWeights(factors);
    expect(result!.homeWinProb).toBeCloseTo(0.815, 5);
  });

  it('극단 (모든 factor 1.0) → clamp 상한 0.85', () => {
    const factors: Record<string, number> = {
      sp_fip: 1.0,
      sp_xfip: 1.0,
      lineup_woba: 1.0,
      bullpen_fip: 1.0,
      recent_form: 1.0,
      war: 1.0,
      head_to_head: 1.0,
      park_factor: 1.0,
      elo: 1.0,
      sfr: 1.0,
    };
    const result = applyV2_1_BWeights(factors);
    expect(result!.homeWinProb).toBe(0.85);
  });

  it('극단 (모든 factor 0.0) → clamp 하한 0.15', () => {
    const factors: Record<string, number> = {
      sp_fip: 0.0,
      sp_xfip: 0.0,
      lineup_woba: 0.0,
      bullpen_fip: 0.0,
      recent_form: 0.0,
      war: 0.0,
      head_to_head: 0.0,
      park_factor: 0.0,
      elo: 0.0,
      sfr: 0.0,
    };
    const result = applyV2_1_BWeights(factors);
    expect(result!.homeWinProb).toBe(0.15);
  });

  it('일부 factor 누락 → 0.5 neutral 적용 + missingFactorKeys 누적', () => {
    const factors: Record<string, number> = {
      sp_fip: 0.7,
      lineup_woba: 0.7,
      elo: 0.7,
    };
    const result = applyV2_1_BWeights(factors);
    expect(result).not.toBeNull();
    expect(result!.missingFactorKeys.length).toBe(6);
    expect(result!.missingFactorKeys).not.toContain('sfr');
    expect(result!.appliedFactorCount).toBe(3);
  });

  it('sfr 누락 무관 (weight 0) — missingFactorKeys 미포함', () => {
    const factors: Record<string, number> = {
      sp_fip: 0.5,
      sp_xfip: 0.5,
      lineup_woba: 0.5,
      bullpen_fip: 0.5,
      recent_form: 0.5,
      war: 0.5,
      head_to_head: 0.5,
      park_factor: 0.5,
      elo: 0.5,
    };
    const result = applyV2_1_BWeights(factors);
    expect(result!.missingFactorKeys).toEqual([]);
  });

  it('NaN factor → neutral 0.5 + missing 처리', () => {
    const factors: Record<string, number> = {
      sp_fip: NaN,
      sp_xfip: 0.5,
      lineup_woba: 0.5,
      bullpen_fip: 0.5,
      recent_form: 0.5,
      war: 0.5,
      head_to_head: 0.5,
      park_factor: 0.5,
      elo: 0.5,
      sfr: 0.5,
    };
    const result = applyV2_1_BWeights(factors);
    expect(result!.missingFactorKeys).toContain('sp_fip');
  });

  it('Infinity factor → neutral 처리', () => {
    const factors: Record<string, number> = { sp_fip: Infinity };
    const result = applyV2_1_BWeights(factors);
    expect(result!.missingFactorKeys).toContain('sp_fip');
  });
});

describe('computeDelta', () => {
  it('v2.1-B 가 더 높음 → 양수 deltaPp', () => {
    const d = computeDelta(0.55, 0.62);
    expect(d.deltaPp).toBeCloseTo(7, 5);
  });

  it('v1.8 동일 → deltaPp = 0', () => {
    const d = computeDelta(0.5, 0.5);
    expect(d.deltaPp).toBe(0);
  });

  it('v2.1-B 가 더 낮음 → 음수 deltaPp', () => {
    const d = computeDelta(0.65, 0.6);
    expect(d.deltaPp).toBeCloseTo(-5, 5);
  });
});
