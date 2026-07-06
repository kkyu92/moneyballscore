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
export const ALL_SCORING_RULES = ['v1.5', 'v1.6', 'v1.7-revert', 'v1.8', 'v1.8-credit-fail', 'v2.1-B-shadow', 'v2.0-shadow', 'tabpfn-shadow'] as const;

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

/**
 * 현 가중치 버전. daily / live / postview 3-path 모두 본 상수 참조.
 *
 * silent drift family wave 88 (cycle 1296) — 사용자 가시 layer (OG image / 메서드론
 * 페이지 헤딩 / 가이드 카드 / glossary 라벨) 의 hardcoded "v1.8" string 5개 + 메서드론
 * 카드 v2.0 예정 행 본문 1개 → 본 상수 참조 swap. v2.0 promotion 시 본 상수 1개만
 * 갱신하면 사용자 가시 layer 자동 동기.
 */
export const CURRENT_SCORING_RULE: ScoringRule = 'v1.8';

/**
 * 사용자 가시 layer cohort (alert / 통계 / OG image). v1.8 + v1.8-credit-fail
 * 양쪽 포함 — credit-fail 분리 (cycle 1021 plan #14 C1c #1342) 가 baseline
 * 정합성 회복 의도 단 사용자 가시 alert silent 누락 부작용 (cycle 1022 hotfix).
 *
 * baseline 분석 (accuracy/page.tsx / buildAccuracyData) 은 CURRENT_SCORING_RULE
 * (v1.8) 만 사용 — credit-fail 분리 cohort 정합 유지.
 *
 * 본 cohort 사용 site: getVerifyResults / buildDailySummary / postponed alert /
 * updateAccuracy / opengraph-image / predict_final gap count / todayTotal count /
 * existingSet predict check.
 */
export const PRODUCTION_COHORT_RULES: readonly ScoringRule[] = ['v1.8', 'v1.8-credit-fail'] as const;

/**
 * Production 진화 이력 (사용자 가시 layer — guide/accuracy Brier 추세 chart 설명).
 * 순서 = 시간 순 (오래된 → 최신). shadow / credit-fail 제외 — 실제 prod era 만.
 *
 * silent drift family wave 182 (cycle 1443) — guide/page.tsx + accuracy/page.tsx 안
 * "v1.5 → v1.6 → v1.7-revert → v1.8" 하드코딩 progression list 를 본 registry 로
 * 통합. v2.0 promotion 시 본 tuple 에 'v2.0' append = 사용자 가시 layer 2곳 동기.
 */
export const PRODUCTION_ERA_HISTORY: readonly ScoringRule[] = ['v1.5', 'v1.6', 'v1.7-revert', 'v1.8'] as const;

/**
 * Shadow cohort 라벨 — production 가중치 변경 X. quant only 재계산 (debate LLM 호출 X).
 * v2.1-B 가중치 (apps/moneyball/src/lib/predictions/v2Predictor.ts V2_1_B_WEIGHTS) +
 * shadow factor (park_weather, umpire_sz) weight>0 양쪽 evidence 누적.
 * accuracy/shadow page 안 v1.8 vs shadow Brier delta 측정 source.
 */
export const SHADOW_SCORING_RULE: ScoringRule = 'v2.1-B-shadow';

/**
 * v2.0 후보 가중치 shadow 라벨 — plan #14 C1a (cycle 1019, 2026-05-28).
 * cycle 231 박제 가중치 (elo 0.13 / bullpen_fip 0.14 / recent_form 0.13) shadow 실주행.
 * v1.8 production 영향 X (DEFAULT_WEIGHTS invariant 유지). cycle 1447 (2026-07-06) —
 * n=178 crossed n=150 threshold, plan #16 2차 fire = DEFAULT vs SHADOW_V20 Brier 차이
 * < 0.01pp = v1.8 유지 확정. 본 shadow 라벨은 신규 evidence 도래 시 재평가 accumulator.
 */
export const SHADOW_V20_SCORING_RULE: ScoringRule = 'v2.0-shadow';

/**
 * TabPFN inference shadow 라벨 — cycle 1137 v18 candidate Y.
 * scripts/import-tabpfn-predictions.ts 가 TabPFN Python output CSV 읽어 import.
 * v1.8 production 영향 X. /accuracy/shadow 안 TabPFN vs v1.8 비교 source.
 */
export const TABPFN_SCORING_RULE: ScoringRule = 'tabpfn-shadow';

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

/**
 * v2.0 가중치 확정 임계 cohort 표본 — v1.8 유지 확정 임계 (cycle 1447, 2026-07-06).
 *
 * silent drift family wave 89 (cycle 1297) — 사용자 가시 layer (v2-shadow-monitor /
 * methodology / about / accuracy/shadow / mlb factors KO+EN) 6 파일 11 occurrence
 * hardcoded "n=150" → 본 상수 참조 swap.
 *
 * cycle 1447 (2026-07-06) evidence: n=178 crossed n=150 threshold, plan #16 2차 fire
 * DEFAULT vs SHADOW_V20 Brier 차이 < 0.01pp → v1.8 유지 확정. v2.1-B rejected (Brier 0.4635).
 * 본 상수는 historic evidence marker (n=150 threshold 도달 지점 박제). 신규 evidence 도래
 * 시 별도 임계 (예: n=300 / n=500) 재정의 path 유지.
 */
export const V2_PROMOTION_COHORT_N = 150 as const;
