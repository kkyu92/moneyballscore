import { toKSTDateString } from "@moneyball/shared";

/**
 * 현재 시각 기준으로 KST 어제 날짜 (YYYY-MM-DD) 를 계산.
 *
 * 예시 (KST 기준):
 *   - 2026-04-30 09:00 KST → "2026-04-29"
 *   - 2026-05-01 00:30 KST → "2026-04-30"
 *
 * UTC 시각이 입력으로 들어와도 toKSTDateString 이 KST 변환을 책임짐.
 *
 * @param now 기준 시각 (테스트용 주입). 기본값: new Date()
 */
export function getYesterdayKSTDateString(now: Date = new Date()): string {
  const kstNow = new Date(now.getTime());
  const yesterday = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000);
  return toKSTDateString(yesterday);
}
