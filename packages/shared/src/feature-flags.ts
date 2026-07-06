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
 * cycle 1447 (2026-07-06) — v1.8 유지 확정 (n=178 crossed n=150 threshold, plan #16 2차 fire 결과
 * DEFAULT vs SHADOW_V20 Brier 차이 < 0.01pp). 본 flag 는 kill switch 로만 유지 (activation 계획 X,
 * 신규 evidence 도래 시 재평가 path). 활성 시 production predict() 가 SHADOW_V20_WEIGHTS 사용.
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
