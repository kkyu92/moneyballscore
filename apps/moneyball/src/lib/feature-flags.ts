/**
 * v4-4 Task 7: Server-side feature flags.
 *
 * 원칙 (Eng 리뷰 A1 critical):
 * - `NEXT_PUBLIC_` 접두 금지 — build-time inline 방지
 * - Server Component에서 process.env 직접 읽기 → 런타임 반영 (재배포 불필요)
 * - 기본값 false (안전)
 */

export function isBigMatchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.BIGMATCH_ENABLED === 'true';
}
