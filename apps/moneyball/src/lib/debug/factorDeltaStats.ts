/**
 * M-D Factor Delta Timeline 통계 helper.
 *
 * predictions.factors JSONB 7일 분 → factor 별 cohort (scoring_rule) 분리 + z-score
 * anomaly 표시. silent-drift dashboard 안 FactorDeltaTimeline 컴포넌트 source.
 *
 * shadow factor (park_weather, umpire_sz) 도입 후 분포 collapse / 결측 spike 사전 감지.
 * 본 모듈은 pure compute — DB I/O 는 page.tsx 가 담당.
 */

import {
  detectFactorAnomalies,
  FACTOR_ANOMALY_Z_THRESHOLD,
  type FactorAnomaly,
} from '@moneyball/shared';

interface FactorTimelineRow {
  /** 예측 박제 시점 KST date (YYYY-MM-DD) */
  date: string;
  /** scoring_rule (예: 'v1.8' | 'v2.1-B-shadow') */
  cohort: string;
  /** factor 별 분포 평균 (정규화 0~1) */
  factorMeans: Record<string, number>;
  /** 표본 수 */
  n: number;
}

interface FactorTimelineCellAnomaly {
  date: string;
  cohort: string;
  factorKey: string;
  zScore: number;
  value: number;
}

interface FactorTimelineResult {
  rows: FactorTimelineRow[];
  /** 모든 cohort × factor anomaly 리스트 (z-score>3) — UI 강조 표시용 */
  anomalies: FactorTimelineCellAnomaly[];
  /** 본 결과 안 등장한 factor key 전체 (table 컬럼 결정) */
  factorKeys: string[];
}

export interface PredictionFactorRow {
  date: string; // YYYY-MM-DD
  scoring_rule: string | null;
  factors: Record<string, number> | null;
}

/**
 * Build timeline from raw predictions rows.
 * - cohort 별 (scoring_rule) + date 별 group
 * - 각 group 안 factor 별 평균 + 표본 수
 * - 각 cohort × factor 시계열에 z-score 감지 (anomaly hits)
 */
export function buildFactorTimeline(
  rows: PredictionFactorRow[],
): FactorTimelineResult {
  // group: cohort → date → factor → values[]
  const grouped = new Map<string, Map<string, Map<string, number[]>>>();
  const allFactorKeys = new Set<string>();

  for (const row of rows) {
    if (!row.factors || typeof row.factors !== 'object') continue;
    const cohort = row.scoring_rule ?? '(null)';
    if (!grouped.has(cohort)) grouped.set(cohort, new Map());
    const byDate = grouped.get(cohort)!;
    if (!byDate.has(row.date)) byDate.set(row.date, new Map());
    const byFactor = byDate.get(row.date)!;
    for (const [key, val] of Object.entries(row.factors)) {
      if (typeof val !== 'number' || !Number.isFinite(val)) continue;
      allFactorKeys.add(key);
      if (!byFactor.has(key)) byFactor.set(key, []);
      byFactor.get(key)!.push(val);
    }
  }

  const timelineRows: FactorTimelineRow[] = [];
  for (const [cohort, byDate] of grouped.entries()) {
    for (const [date, byFactor] of byDate.entries()) {
      const factorMeans: Record<string, number> = {};
      let n = 0;
      for (const [key, values] of byFactor.entries()) {
        const sum = values.reduce((s, v) => s + v, 0);
        factorMeans[key] = sum / values.length;
        if (values.length > n) n = values.length;
      }
      timelineRows.push({ date, cohort, factorMeans, n });
    }
  }
  // 최신 date 우선 + cohort 순
  timelineRows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.cohort.localeCompare(b.cohort);
  });

  // anomaly detection — 각 cohort × factor 별 시계열 평균 분포에 z-score
  const anomalies: FactorTimelineCellAnomaly[] = [];
  for (const [cohort, byDate] of grouped.entries()) {
    const byFactorTimeseries = new Map<string, Array<{ date: string; mean: number }>>();
    for (const [date, byFactor] of byDate.entries()) {
      for (const [key, values] of byFactor.entries()) {
        if (!byFactorTimeseries.has(key)) byFactorTimeseries.set(key, []);
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        byFactorTimeseries.get(key)!.push({ date, mean });
      }
    }
    for (const [factorKey, ts] of byFactorTimeseries.entries()) {
      const hits: FactorAnomaly[] = detectFactorAnomalies(
        factorKey,
        ts.map((t) => t.mean),
      );
      // hit 의 value 와 매칭되는 ts entry 의 date 표기.
      // 주의: 두 날짜가 동일 평균값(예: sparse 0.5 neutral 중복)이면 value 매칭만으론
      // 둘 다 같은(첫) 날짜로 쏠려 실제 두 번째 날짜의 anomaly 가 누락된다 — hits 는
      // ts 와 동일 순서로 1건씩 생성되므로 이미 사용한 index 는 제외하고 순서대로
      // 소비해 각 hit 를 서로 다른 날짜에 귀속시킨다.
      const usedIndices = new Set<number>();
      for (const hit of hits) {
        const idx = ts.findIndex((t, i) => !usedIndices.has(i) && t.mean === hit.value);
        if (idx !== -1) {
          usedIndices.add(idx);
          anomalies.push({
            date: ts[idx].date,
            cohort,
            factorKey,
            zScore: hit.zScore,
            value: hit.value,
          });
        }
      }
    }
  }

  return {
    rows: timelineRows,
    anomalies,
    factorKeys: [...allFactorKeys].sort(),
  };
}

export { FACTOR_ANOMALY_Z_THRESHOLD };
