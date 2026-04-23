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
 * confidence 는 debate 모델의 judge 가 부여한 주관 확신도 (0-1). v1 정량 모델의
 * `|hwp-0.5|×2` 공식은 debate 에선 성립하지 않으므로 라벨도 confidence 수치로
 * 직접 표시 — "승률" 로 환산하지 않음 (홈팀 승률 관점 제거 2026-04-23).
 *
 *   confidence < 0.55  → 확신 낮음
 *   0.55 ~ 0.60        → 확신 보통
 *   0.60 ~ 0.65        → 확신 높음
 *   ≥ 0.65             → 확신 최상
 *
 * 전체 검증 표본이 MIN_TOTAL 미만이면 gated=true 반환 (UI는 "집계 중" 렌더).
 * 경계값은 하한 포함 / 상한 미포함.
 */
const MIN_TOTAL = 10;

const BUCKET_DEFS: Array<{ label: string; min: number; max: number }> = [
  { label: '확신 낮음', min: 0, max: 0.55 },
  { label: '확신 보통', min: 0.55, max: 0.6 },
  { label: '확신 높음', min: 0.6, max: 0.65 },
  { label: '확신 최상', min: 0.65, max: 1.01 },
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
