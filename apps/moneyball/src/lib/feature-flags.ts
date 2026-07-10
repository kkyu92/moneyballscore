/**
 * Server-side feature flags — `@moneyball/shared` re-export.
 *
 * 단일 source = `packages/shared/src/feature-flags.ts`.
 * `@/lib/feature-flags` import path 유지 (apps/moneyball 안 backwards-compat).
 * 신규 pipeline 측 callsite (kbo-data) 는 `@moneyball/shared` 직접 import.
 */
export {
  isBigMatchEnabled,
  isV2ModelEnabled,
  isV21BShadowEnabled,
  isDebateEnabled,
  isPostviewEnabled,
} from '@moneyball/shared';
