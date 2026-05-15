/**
 * model_version / scoring_rule 라벨 단일 source.
 *
 * cycle 445 review-code heavy 가 scoring_rule 만 통합. model_version literal
 * ('v1.8' / 'v1.8-postview' / 'v1.8-live') 3개는 여전히 하드코드 → v2.0 bump 시
 * 4곳 수정 필요 (silent drift family 7번째). cycle 448 review-code heavy 가
 * 본 모듈로 통합 — CURRENT_SCORING_RULE 1줄 변경 = 4개 라벨 동시 박제.
 *
 * @moneyball/shared 위치 이유: packages/kbo-data 가 `@sentry/nextjs` dynamic
 * import 보유 → apps/moneyball 의 vitest 가 buildAccuracyData.test 안에서
 * kbo-data 전체 import 시 sentry 해결 실패. shared 는 sentry 의존 X →
 * 양쪽 package 모두 안전 import.
 */

export type ScoringRule = 'v1.5' | 'v1.6' | 'v1.7-revert' | 'v1.8';

export type ModelVersion =
  | 'v2.0-debate'
  | 'v2.0-postview'
  | ScoringRule
  | `${ScoringRule}-postview`
  | `${ScoringRule}-live`;

export type DebateVersion = 'v2-persona4' | 'v2-postview' | null;

/** 현 가중치 버전. daily / live / postview 3-path 모두 본 상수 참조. */
export const CURRENT_SCORING_RULE: ScoringRule = 'v1.8';

/** Quant fallback 라벨 — pre_game 경로 (ScoringRule 그대로). */
export const QUANT_PREGAME_VERSION: ModelVersion = CURRENT_SCORING_RULE;
/** Quant fallback 라벨 — postview 경로. */
export const QUANT_POSTVIEW_VERSION: ModelVersion = `${CURRENT_SCORING_RULE}-postview`;
/** Quant 라벨 — live in_game 경로 (항상 quant). */
export const QUANT_LIVE_VERSION: ModelVersion = `${CURRENT_SCORING_RULE}-live`;
