/**
 * Weekly/monthly review 하이라이트 배지 라벨 단일 source.
 *
 * cycle 3273 review-code heavy 가 "박빙 적중"/"고확신 적중"/"대역전 실패"
 * 리터럴이 lib/reviews/{shared,mlb-shared}.ts (타입 union) + buildWeeklyReview /
 * buildMonthlyReview / buildMlbWeeklyReview / buildMlbMonthlyReview (배지 부여) +
 * HighlightCard / MlbHighlightCard (배지 비교) 에 분산 중복됨을 확인 — cycle 3274
 * 본 모듈로 통합.
 */
export const REVIEW_BADGE_CLOSE_HIT = '박빙 적중' as const;
export const REVIEW_BADGE_HIGH_CONFIDENCE_HIT = '고확신 적중' as const;
export const REVIEW_BADGE_BIG_MISS = '대역전 실패' as const;

export type ReviewHighlightBadge =
  | typeof REVIEW_BADGE_CLOSE_HIT
  | typeof REVIEW_BADGE_HIGH_CONFIDENCE_HIT
  | typeof REVIEW_BADGE_BIG_MISS
  | null;
