import type { CalibrationBucket } from "@/lib/dashboard/compareModels";

export interface ShadowCohortPair {
  v18Prob: number | null;
  shadowProb: number | null;
  homeWin: boolean | null;
}

function buildBuckets(
  pairs: Array<{ p: number; y: number }>,
  bins = 10,
): CalibrationBucket[] {
  const out: CalibrationBucket[] = [];
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    let sumP = 0;
    let sumY = 0;
    let cnt = 0;
    for (const { p, y } of pairs) {
      const inBucket = b === bins - 1 ? p >= lo && p <= hi : p >= lo && p < hi;
      if (inBucket) {
        sumP += p;
        sumY += y;
        cnt++;
      }
    }
    out.push({
      lo,
      hi,
      n: cnt,
      avgPredicted: cnt > 0 ? sumP / cnt : 0,
      actualRate: cnt > 0 ? sumY / cnt : 0,
    });
  }
  return out;
}

export function buildShadowCalibration(
  pairs: ShadowCohortPair[],
  bins = 10,
): { v18: CalibrationBucket[]; shadow: CalibrationBucket[] } {
  const v18Pairs: Array<{ p: number; y: number }> = [];
  const shadowPairs: Array<{ p: number; y: number }> = [];
  for (const p of pairs) {
    if (p.homeWin === null) continue;
    const y = p.homeWin ? 1 : 0;
    if (p.v18Prob !== null) v18Pairs.push({ p: p.v18Prob, y });
    if (p.shadowProb !== null) shadowPairs.push({ p: p.shadowProb, y });
  }
  return {
    v18: buildBuckets(v18Pairs, bins),
    shadow: buildBuckets(shadowPairs, bins),
  };
}
