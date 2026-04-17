import { describe, it, expect } from "vitest";
import {
  analyzeFactorAccuracy,
  type FactorSample,
} from "../factor-accuracy";

function buildSamples(
  n: number,
  factorFn: (i: number) => Record<string, number>,
  actualFn: (i: number) => 0 | 1
): FactorSample[] {
  return Array.from({ length: n }, (_, i) => ({
    factors: factorFn(i),
    actualHomeWin: actualFn(i),
  }));
}

describe("analyzeFactorAccuracy", () => {
  it("샘플 수가 minSamples 미만이면 proposedWeight = null", () => {
    const samples = buildSamples(
      10,
      () => ({ sp_fip: 0.6, lineup_woba: 0.4 }),
      () => 1 as const
    );
    const report = analyzeFactorAccuracy(samples, { minSamples: 30 });
    expect(report.totalSamples).toBe(10);
    for (const s of report.stats) {
      expect(s.proposedWeight).toBeNull();
    }
    expect(report.proposedWeightsDelta).toBe(0);
  });

  it("완벽한 positive correlation: directional accuracy 1", () => {
    const samples = buildSamples(
      40,
      (i) => ({ sp_fip: i % 2 === 0 ? 0.8 : 0.2 }),
      (i) => (i % 2 === 0 ? 1 : 0)
    );
    const report = analyzeFactorAccuracy(samples, { minSamples: 30 });
    const spFip = report.stats.find((s) => s.factor === "sp_fip");
    expect(spFip?.correlation).toBeCloseTo(1, 1);
    expect(spFip?.directionalAccuracy).toBe(1);
  });

  it("완벽한 negative correlation: 방향 완전 반대", () => {
    const samples = buildSamples(
      40,
      (i) => ({ sp_fip: i % 2 === 0 ? 0.8 : 0.2 }),
      (i) => (i % 2 === 0 ? 0 : 1)
    );
    const report = analyzeFactorAccuracy(samples, { minSamples: 30 });
    const spFip = report.stats.find((s) => s.factor === "sp_fip");
    expect(spFip?.correlation).toBeCloseTo(-1, 1);
    expect(spFip?.directionalAccuracy).toBe(0);
  });

  it("mean bias: 홈팀 과대 예측 감지", () => {
    // factor value 항상 0.7, 실제 홈승률 0.5 → bias = +0.2
    const samples = buildSamples(
      40,
      () => ({ sp_fip: 0.7 }),
      (i) => (i % 2 === 0 ? 1 : 0)
    );
    const report = analyzeFactorAccuracy(samples, { minSamples: 30 });
    const spFip = report.stats.find((s) => s.factor === "sp_fip");
    expect(spFip?.meanBias).toBeCloseTo(0.2, 1);
  });

  it("중립 영역(0.45-0.55)은 directional accuracy 계산에서 제외", () => {
    const samples = buildSamples(
      40,
      () => ({ sp_fip: 0.5 }),
      (i) => (i % 2 === 0 ? 1 : 0)
    );
    const report = analyzeFactorAccuracy(samples, { minSamples: 30 });
    const spFip = report.stats.find((s) => s.factor === "sp_fip");
    expect(spFip?.directionalN).toBe(0);
    expect(spFip?.directionalAccuracy).toBeNull();
  });

  it("proposed weight: positive correlation 높은 팩터 증가, 음수는 0 근처", () => {
    // sp_fip: 완벽 positive correlation
    // lineup_woba: 완벽 negative correlation
    // 나머지: noise
    const samples = buildSamples(
      40,
      (i) => ({
        sp_fip: i % 2 === 0 ? 0.8 : 0.2,
        lineup_woba: i % 2 === 0 ? 0.2 : 0.8,
        sp_xfip: 0.5,
        bullpen_fip: 0.5,
        recent_form: 0.5,
        war: 0.5,
        head_to_head: 0.5,
        park_factor: 0.5,
        elo: 0.5,
        sfr: 0.5,
      }),
      (i) => (i % 2 === 0 ? 1 : 0)
    );
    const report = analyzeFactorAccuracy(samples, { minSamples: 30 });
    const spFip = report.stats.find((s) => s.factor === "sp_fip");
    const woba = report.stats.find((s) => s.factor === "lineup_woba");
    expect(spFip?.proposedWeight).not.toBeNull();
    expect(woba?.proposedWeight).not.toBeNull();
    // sp_fip이 유용성 크므로 weight 증가 (현재 0.15)
    expect(spFip?.proposedWeight ?? 0).toBeGreaterThan(0.15);
    // lineup_woba는 negative correlation이라 0 제안
    expect(woba?.proposedWeight).toBe(0);
  });

  it("proposedWeightsDelta: 변경량 합계", () => {
    const samples = buildSamples(
      40,
      (i) => ({ sp_fip: i % 2 === 0 ? 0.8 : 0.2, lineup_woba: 0.5 }),
      (i) => (i % 2 === 0 ? 1 : 0)
    );
    const report = analyzeFactorAccuracy(samples, { minSamples: 30 });
    expect(report.proposedWeightsDelta).toBeGreaterThan(0);
  });

  it("factor 값이 없는 샘플은 해당 factor stat에서 제외", () => {
    const samples: FactorSample[] = [
      { factors: { sp_fip: 0.6 }, actualHomeWin: 1 },
      { factors: {}, actualHomeWin: 0 },
      { factors: { sp_fip: 0.4 }, actualHomeWin: 0 },
    ];
    const report = analyzeFactorAccuracy(samples, { minSamples: 2 });
    const spFip = report.stats.find((s) => s.factor === "sp_fip");
    expect(spFip?.n).toBe(2);
  });
});
