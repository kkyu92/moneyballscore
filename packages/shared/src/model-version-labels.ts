/**
 * model_version / scoring_rule 라벨 단일 source.
 *
 * cycle 445 review-code heavy 가 scoring_rule 만 통합. model_version literal
 * (QUANT_PREGAME_VERSION / QUANT_POSTVIEW_VERSION / QUANT_LIVE_VERSION) 3개도
 * cycle 448 review-code heavy 가 본 모듈로 통합 — CURRENT_SCORING_RULE 1줄 변경
 * = 4개 라벨 동시 박제 (silent drift family 7번째).
 *
 * @moneyball/shared 위치 이유: packages/kbo-data 가 `@sentry/nextjs` dynamic
 * import 보유 → apps/moneyball 의 vitest 가 buildAccuracyData.test 안에서
 * kbo-data 전체 import 시 sentry 해결 실패. shared 는 sentry 의존 X →
 * 양쪽 package 모두 안전 import.
 */

// cycle 475 — tuple 1개 → ScoringRule 타입 + ALL_SCORING_RULES list 동시 도출.
// 신규 버전 추가 시 본 tuple 1줄 변경 = ScoringRule union + 외부 VERSION_ORDER
// 자동 전파 (silent drift family 사전 자동 차단 evidence).
export const ALL_SCORING_RULES = ['v1.5', 'v1.6', 'v1.7-revert', 'v1.8'] as const;

export type ScoringRule = (typeof ALL_SCORING_RULES)[number];

export type ModelVersion =
  | 'v2.0-debate'
  | 'v2.0-postview'
  | ScoringRule
  | `${ScoringRule}-postview`
  | `${ScoringRule}-live`;

// cycle 479 — debate_version literal 단일 source. pre_game (decideModelVersion)
// + postview (decidePostviewModelVersion) + apps/moneyball CURRENT_DEBATE_VERSION
// + kbo-data PERSONA_VERSION 4곳 분산 literal → 본 상수 참조 통일. v2-persona4
// → v2-persona5 bump 시 본 모듈 1줄 변경 = 4곳 동시 박제 (silent drift family
// streak 24 cycle 째).
export const DEBATE_VERSION_PREGAME = 'v2-persona4' as const;
export const DEBATE_VERSION_POSTVIEW = 'v2-postview' as const;

export type DebateVersion =
  | typeof DEBATE_VERSION_PREGAME
  | typeof DEBATE_VERSION_POSTVIEW
  | null;

/** 현 가중치 버전. daily / live / postview 3-path 모두 본 상수 참조. */
export const CURRENT_SCORING_RULE: ScoringRule = 'v1.8';

/** Quant fallback 라벨 — pre_game 경로 (ScoringRule 그대로). */
export const QUANT_PREGAME_VERSION: ModelVersion = CURRENT_SCORING_RULE;
/** Quant fallback 라벨 — postview 경로. */
export const QUANT_POSTVIEW_VERSION: ModelVersion = `${CURRENT_SCORING_RULE}-postview`;
/** Quant 라벨 — live in_game 경로 (항상 quant). */
export const QUANT_LIVE_VERSION: ModelVersion = `${CURRENT_SCORING_RULE}-live`;

// cycle 477 — LLM (debate / postview) 활성 라벨 단일 source. v2.0 → v2.1 bump 시
// 본 상수 1줄 변경 = decideModelVersion / decidePostviewModelVersion 본체 +
// telegram LLM_ACTIVE_VERSIONS + buildAccuracyData LLM_ACTIVE_VERSIONS +
// compareModels 분기 5곳 자동 전파. silent drift family streak 22 cycle 째.
/** LLM debate 활성 라벨 — pre_game 경로 (LLM 성공 시). */
export const LLM_DEBATE_VERSION: ModelVersion = 'v2.0-debate';
/** LLM postview 활성 라벨 — postview 경로 (agents 성공 시). */
export const LLM_POSTVIEW_VERSION: ModelVersion = 'v2.0-postview';
/** LLM 활성 라벨 set — telegram emoji 분기 / accuracy fallback 분류 단일 source. */
export const LLM_ACTIVE_VERSIONS: ReadonlySet<ModelVersion> = new Set<ModelVersion>([
  LLM_DEBATE_VERSION,
  LLM_POSTVIEW_VERSION,
]);
