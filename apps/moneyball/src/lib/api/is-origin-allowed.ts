import { SITE_URL } from '@moneyball/shared';

const ALLOWED_ORIGINS = [SITE_URL, `https://www.${new URL(SITE_URL).host}`];

/**
 * 익명 device_id 기반 anonymous write endpoint (waitlist/picks/leaderboard sync) 공용 CSRF/Origin 검증.
 * `mlb/waitlist/route.ts` 원본 layer 1 로직 — 다른 route 중복 방지 위해 추출 (cycle 2763 review-code).
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // dev — localhost 임의 port 허용
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
}
