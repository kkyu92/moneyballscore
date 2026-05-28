import { describe, it, expect } from 'vitest';
import {
  buildFactorTimeline,
  FACTOR_ANOMALY_Z_THRESHOLD,
  type PredictionFactorRow,
} from '../factorDeltaStats';

function row(
  date: string,
  scoring_rule: string,
  factors: Record<string, number>,
): PredictionFactorRow {
  return { date, scoring_rule, factors };
}

describe('buildFactorTimeline (M-D FactorDeltaTimeline)', () => {
  it('test 4 — empty input → rows=[], anomalies=[], factorKeys=[] (empty state fallback)', () => {
    const result = buildFactorTimeline([]);
    expect(result.rows).toEqual([]);
    expect(result.anomalies).toEqual([]);
    expect(result.factorKeys).toEqual([]);
  });

  it('test 2 — scoring_rule cohort 분리 (v1.8 + v2.1-B-shadow 별도 row)', () => {
    const rows: PredictionFactorRow[] = [
      row('2026-05-28', 'v1.8', { sp_fip: 0.6, elo: 0.55 }),
      row('2026-05-28', 'v2.1-B-shadow', { sp_fip: 0.6, elo: 0.55, park_weather: 0.5 }),
    ];
    const result = buildFactorTimeline(rows);
    expect(result.rows).toHaveLength(2);
    const cohorts = result.rows.map((r) => r.cohort).sort();
    expect(cohorts).toEqual(['v1.8', 'v2.1-B-shadow']);
    // shadow factor 는 shadow cohort row 안만 등장
    const shadowRow = result.rows.find((r) => r.cohort === 'v2.1-B-shadow')!;
    expect(shadowRow.factorMeans.park_weather).toBe(0.5);
    // v1.8 row 안 park_weather 부재
    const v18Row = result.rows.find((r) => r.cohort === 'v1.8')!;
    expect(v18Row.factorMeans.park_weather).toBeUndefined();
  });

  it('test 1 — mock data 안 factor 평균 계산 (같은 date + cohort group)', () => {
    const rows: PredictionFactorRow[] = [
      row('2026-05-28', 'v1.8', { sp_fip: 0.5 }),
      row('2026-05-28', 'v1.8', { sp_fip: 0.7 }),
      row('2026-05-28', 'v1.8', { sp_fip: 0.6 }),
    ];
    const result = buildFactorTimeline(rows);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].factorMeans.sp_fip).toBeCloseTo(0.6, 6);
    expect(result.rows[0].n).toBe(3);
  });

  it('test 3 — z-score>3 anomaly trigger 가시화', () => {
    // 단일 outlier 의 z-score = sqrt(n) (mathematical identity, n=baseline 수). z>3 → n>=10 필요.
    // 11일 baseline (각 0.50) + 1일 outlier (0.95) = z ≈ 3.16
    const baseline = Array.from({ length: 11 }, (_, i) => {
      const d = new Date(2026, 4, 17 + i); // 2026-05-17 ~ 2026-05-27
      return row(d.toISOString().slice(0, 10), 'v1.8', { sp_fip: 0.50 });
    });
    const outlier = row('2026-05-28', 'v1.8', { sp_fip: 0.95 });
    const rows: PredictionFactorRow[] = [...baseline, outlier];
    const result = buildFactorTimeline(rows);
    expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
    const hit = result.anomalies.find(
      (a) => a.factorKey === 'sp_fip' && a.date === '2026-05-28',
    );
    expect(hit).toBeDefined();
    expect(hit!.zScore).toBeGreaterThan(FACTOR_ANOMALY_Z_THRESHOLD);
    expect(hit!.cohort).toBe('v1.8');
  });

  it('factorKeys 전체 집합 + 정렬', () => {
    const rows: PredictionFactorRow[] = [
      row('2026-05-28', 'v1.8', { sp_fip: 0.5, elo: 0.5 }),
      row('2026-05-28', 'v2.1-B-shadow', { sp_fip: 0.5, park_weather: 0.5, umpire_sz: 0.5 }),
    ];
    const result = buildFactorTimeline(rows);
    expect(result.factorKeys).toEqual(['elo', 'park_weather', 'sp_fip', 'umpire_sz']);
  });

  it('non-finite factor 값 skip (NaN / Infinity)', () => {
    const rows: PredictionFactorRow[] = [
      row('2026-05-28', 'v1.8', { sp_fip: 0.6 }),
      row('2026-05-28', 'v1.8', { sp_fip: Number.NaN }),
      row('2026-05-28', 'v1.8', { sp_fip: Number.POSITIVE_INFINITY }),
    ];
    const result = buildFactorTimeline(rows);
    expect(result.rows[0].factorMeans.sp_fip).toBe(0.6);
  });

  it('null factors row → skip 전체', () => {
    const rows: PredictionFactorRow[] = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { date: '2026-05-28', scoring_rule: 'v1.8', factors: null as any },
      row('2026-05-28', 'v1.8', { sp_fip: 0.6 }),
    ];
    const result = buildFactorTimeline(rows);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].factorMeans.sp_fip).toBe(0.6);
  });
});
