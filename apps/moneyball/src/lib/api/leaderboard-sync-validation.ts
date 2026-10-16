import { NICKNAME_MIN_CHARS, NICKNAME_MAX_CHARS } from '@moneyball/shared';

/**
 * leaderboard sync route (KBO/MLB) 공용 닉네임/device_id 검증.
 * `sync/route.ts`, `mlb-sync/route.ts` 원본 중복 로직 — 추출 (cycle 3216 review-code, is-origin-allowed.ts 와 동일 패턴).
 */
export function isValidNickname(n: string): boolean {
  if (typeof n !== 'string') return false;
  const trimmed = n.trim();
  if (trimmed.length < NICKNAME_MIN_CHARS || trimmed.length > NICKNAME_MAX_CHARS) return false;
  if (/<|>|&|"|'|`/.test(trimmed)) return false;
  return true;
}

export function isValidDeviceId(id: string): boolean {
  return typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id);
}
