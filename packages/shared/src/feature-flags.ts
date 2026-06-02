/**
 * Server-side feature flags (shared across apps + pipelines).
 *
 * 원칙:
 * - `NEXT_PUBLIC_` 접두 금지 — build-time inline 방지
 * - Server Component / pipeline 양쪽에서 process.env 직접 읽기 → 런타임 반영 (재배포 불필요)
 * - 두 가지 default 패턴:
 *   - **rollout flag** (default false): `env === 'true'` 만 활성. 점진 출시용
 *   - **kill switch** (default true): `env !== 'false'` 활성. 운영 즉시 차단용
 */

/**
 * BIGMATCH UI feature. rollout flag (default false).
 */
export function isBigMatchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.BIGMATCH_ENABLED === 'true';
}

/**
 * v2.0 cohort model. rollout flag (default false).
 * n=150 v1.8 cohort 측정 완료 후 활성 예정 (ETA 2026-07-22, cycle 1098 갱신).
 * 활성 시 production predict() 가 SHADOW_V20_WEIGHTS 사용 (cycle 1127 plan-v17 candidate N Tier 2 callsite swap).
 */
export function isV2ModelEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.V2_MODEL_ENABLED === 'true';
}

/**
 * v2.1-B shadow cohort. kill switch (default true).
 * 현재 shadow path 활성 (v2.1-B 후보 가중치 병렬 측정).
 * `V21B_SHADOW_ENABLED=false` 박제 시 shadow 즉시 차단 (운영 incident kill switch).
 */
export function isV21BShadowEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.V21B_SHADOW_ENABLED !== 'false';
}

/**
 * LLM debate (pre-game). kill switch (default true).
 * 현재 ANTHROPIC API key 존재 + debate 호출 성공 시 활성.
 * `DEBATE_ENABLED=false` 박제 시 debate path 즉시 차단 → QUANT_PREGAME fallback only.
 * Anthropic credit 소진 / 비용 controlling 운영 kill switch.
 */
export function isDebateEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEBATE_ENABLED !== 'false';
}

/**
 * LLM postview (post-game). kill switch (default true).
 * 현재 ANTHROPIC API key 존재 + agents 호출 성공 시 활성.
 * `POSTVIEW_ENABLED=false` 박제 시 postview path 즉시 차단 → QUANT_POSTVIEW fallback only.
 * Anthropic credit 소진 / 비용 controlling 운영 kill switch.
 */
export function isPostviewEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.POSTVIEW_ENABLED !== 'false';
}
