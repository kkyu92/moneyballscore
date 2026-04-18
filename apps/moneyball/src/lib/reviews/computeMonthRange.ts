/**
 * YYYY-MM 형식 기반 월간 범위 유틸.
 * KBO 시즌은 달 단위로 구분되지 않지만 블로그 리뷰 · URL 스키마 일관성을 위해 사용.
 */

export interface MonthRange {
  /** "2026-04" */
  monthId: string;
  year: number;
  month: number; // 1-12
  /** 월 첫날 YYYY-MM-DD (UTC 기준) */
  startDate: string;
  /** 월 마지막날 YYYY-MM-DD */
  endDate: string;
  /** e.g. "2026년 4월" */
  label: string;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function buildMonthRange(year: number, month: number): MonthRange {
  const start = new Date(Date.UTC(year, month - 1, 1));
  // 월의 마지막날: 다음달 0일 = 이번달 말일
  const end = new Date(Date.UTC(year, month, 0));
  return {
    monthId: `${year}-${pad2(month)}`,
    year,
    month,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    label: `${year}년 ${month}월`,
  };
}

export function getMonthRangeFromDate(d: Date): MonthRange {
  return buildMonthRange(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

/**
 * "2026-04" 형식 파싱. 유효하지 않으면 null.
 */
export function parseMonthId(monthId: string): MonthRange | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthId);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;
  if (year < 2000 || year > 2100) return null;
  return buildMonthRange(year, month);
}

export function getCurrentMonth(now: Date = new Date()): MonthRange {
  return getMonthRangeFromDate(now);
}

/**
 * 이전 N개월 (오래된 → 최신).
 */
export function getRecentMonths(count: number, now: Date = new Date()): MonthRange[] {
  const base = getMonthRangeFromDate(now);
  const out: MonthRange[] = [];
  for (let i = count - 1; i >= 0; i--) {
    // month는 1-12 기반, Date 생성자는 0-11 기반
    const d = new Date(Date.UTC(base.year, base.month - 1 - i, 1));
    out.push(getMonthRangeFromDate(d));
  }
  return out;
}

/**
 * 전월 구하기 (1월이면 전년 12월).
 */
export function getPreviousMonth(current: MonthRange): MonthRange {
  if (current.month === 1) {
    return buildMonthRange(current.year - 1, 12);
  }
  return buildMonthRange(current.year, current.month - 1);
}
