export interface ConfidenceBucketInput {
  confidence: number;
  is_correct: boolean;
}

export interface ConfidenceBucket {
  label: string;
  min: number;
  max: number;
  correct: number;
  total: number;
  accuracy: number | null;
}

export interface ConfidenceBucketResult {
  buckets: ConfidenceBucket[];
  gated: boolean;
  totalVerified: number;
}

/**
 * 확신 구간별 적중률.
 *
 * 경계는 **승률 기준** 으로 리라벨 (2026-04-22 UI 개선).
 * confidence = |homeWinProb - 0.5| × 2 이므로 confidence 0.55 = 승률 77.5%.
 *
 *   confidence < 0.55  → 승률 < 77%
 *   0.55 ~ 0.60        → 77-80%
 *   0.60 ~ 0.65        → 80-82%
 *   ≥ 0.65             → 82%+
 *
 * 전체 검증 표본이 MIN_TOTAL 미만이면 gated=true 반환 (UI는 "집계 중" 렌더).
 * 경계값은 하한 포함 / 상한 미포함.
 */
const MIN_TOTAL = 10;

const BUCKET_DEFS: Array<{ label: string; min: number; max: number }> = [
  { label: '승률 <77%', min: 0, max: 0.55 },
  { label: '77-80%', min: 0.55, max: 0.6 },
  { label: '80-82%', min: 0.6, max: 0.65 },
  { label: '82%+', min: 0.65, max: 1.01 },
];

export function buildConfidenceBuckets(
  predictions: ConfidenceBucketInput[],
): ConfidenceBucketResult {
  const totalVerified = predictions.length;

  const buckets: ConfidenceBucket[] = BUCKET_DEFS.map((def) => ({
    ...def,
    correct: 0,
    total: 0,
    accuracy: null,
  }));

  for (const pred of predictions) {
    const bucket = buckets.find(
      (b) => pred.confidence >= b.min && pred.confidence < b.max,
    );
    if (!bucket) continue;
    bucket.total++;
    if (pred.is_correct) bucket.correct++;
  }

  for (const bucket of buckets) {
    bucket.accuracy =
      bucket.total > 0
        ? Math.round((bucket.correct / bucket.total) * 1000) / 10
        : null;
  }

  return {
    buckets,
    gated: totalVerified < MIN_TOTAL,
    totalVerified,
  };
}
