/**
 * YYYY-MM-DD 달력 날짜 문자열의 전날/다음날 계산.
 *
 * `new Date(\`${date}T00:00:00+09:00\`)` 로 파싱하면 KST 리터럴이 UTC 로 변환되며
 * 하루 앞선 UTC 날짜(전날 15:00Z)가 되고, 이후 setUTCDate + toISOString().slice(0,10)
 * 로 되읽으면 그 UTC 날짜가 그대로 나와 결과가 하루씩 밀린다 (predictions/[date]
 * 이전/다음 날짜 네비게이션이 실제로는 date-2 / date+0 을 가리키던 버그, cycle 2513).
 * 달력 날짜 문자열은 moment-in-time 이 아니라 순수 캘린더 값이므로 Date.UTC 로만
 * 다뤄야 타임존 shift 가 개입하지 않는다.
 */
export function computeAdjacentDates(date: string): { prev: string; next: string } {
  const [y, m, d] = date.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return {
    prev: fmt(base - 24 * 60 * 60 * 1000),
    next: fmt(base + 24 * 60 * 60 * 1000),
  };
}
