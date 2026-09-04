/**
 * ISO 8601 주차 (월요일 시작) 기반 주간 범위 유틸.
 * KBO 리그는 월~일 사이클로 운영되지 않지만, 블로그 리뷰 일관성 + URL
 * 스키마(`2026-W16`)를 위해 ISO 주차 사용.
 */

import { DAY_MS, WEEK_MS, KST_OFFSET_MS } from '@moneyball/shared';

type ReviewRangeLocale = 'ko' | 'en';

const EN_MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export interface WeekRange {
  /** ISO 주차 문자열 e.g. "2026-W16" */
  weekId: string;
  year: number;
  week: number;
  /** 시작일 (월요일, YYYY-MM-DD) */
  startDate: string;
  /** 종료일 (일요일, YYYY-MM-DD) */
  endDate: string;
  /** 사람이 읽기 좋은 라벨 e.g. "2026년 4월 14일 ~ 20일" */
  label: string;
}

/**
 * 입력 Date를 해당 주(KST 기준 요일)의 월요일 00:00 UTC로 고정.
 *
 * KST_OFFSET_MS 로 먼저 shift 후 UTC 필드를 읽어 요일을 KST 달력 기준으로 판정 —
 * "now" 처럼 실제 시각을 넘기는 호출(getWeekRangeFromDate/getRecentWeeks)에서
 * 월요일 00:00~09:00 KST(= 일요일 15:00~24:00 UTC) 구간에 이전 주로 오판정되던
 * 버그 정정. jan4/targetMonday 같이 이미 00:00 UTC 인 달력 날짜를 넘기는 호출은
 * +9h shift 해도 같은 UTC 날짜에 머물러 영향 없음 (CLAUDE.md: 날짜는 KST 기준).
 */
function toMondayUTC(d: Date): Date {
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  const out = new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()),
  );
  const day = out.getUTCDay();
  // day: 0=Sun,1=Mon,...6=Sat → 월요일까지의 offset
  const offset = (day + 6) % 7;
  out.setUTCDate(out.getUTCDate() - offset);
  return out;
}

/** ISO 8601 week number of the given date (Date-only, UTC). */
function isoWeekParts(d: Date): { year: number; week: number } {
  // ISO: 주 번호는 해당 주의 목요일이 속한 해 기준.
  // week 1은 항상 1월 4일을 포함하는 주 (ISO 8601 §3.2.2).
  const monday = toMondayUTC(d);
  const thursday = new Date(monday.getTime() + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = toMondayUTC(jan4);
  const diff = thursday.getTime() - week1Monday.getTime();
  const week = Math.round(diff / WEEK_MS) + 1;
  return { year, week };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function buildLabel(start: Date, end: Date, locale: ReviewRangeLocale = 'ko'): string {
  const y = start.getUTCFullYear();
  const sm = start.getUTCMonth() + 1;
  const sd = start.getUTCDate();
  const em = end.getUTCMonth() + 1;
  const ed = end.getUTCDate();
  if (locale === 'en') {
    const endYear = end.getUTCFullYear();
    if (sm === em) {
      return `${EN_MONTH_ABBR[sm - 1]} ${sd}–${ed}, ${endYear}`;
    }
    return `${EN_MONTH_ABBR[sm - 1]} ${sd} – ${EN_MONTH_ABBR[em - 1]} ${ed}, ${endYear}`;
  }
  if (sm === em) {
    return `${y}년 ${sm}월 ${sd}일 ~ ${ed}일`;
  }
  return `${y}년 ${sm}월 ${sd}일 ~ ${em}월 ${ed}일`;
}

export function getWeekRangeFromDate(d: Date, locale: ReviewRangeLocale = 'ko'): WeekRange {
  const monday = toMondayUTC(d);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const { year, week } = isoWeekParts(monday);
  return {
    weekId: `${year}-W${pad2(week)}`,
    year,
    week,
    startDate: toIsoDate(monday),
    endDate: toIsoDate(sunday),
    label: buildLabel(monday, sunday, locale),
  };
}

/**
 * "2026-W16" 형식 파싱. 유효하지 않으면 null.
 */
export function parseWeekId(weekId: string, locale: ReviewRangeLocale = 'ko'): WeekRange | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(week)) return null;
  if (week < 1 || week > 53) return null;

  // ISO week 1은 1월 4일을 포함하는 주.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = toMondayUTC(jan4);
  const targetMonday = new Date(
    week1Monday.getTime() + (week - 1) * WEEK_MS,
  );
  // 다시 ISO week 파츠를 검증 (예: week 53이 유효한 해인지)
  const parts = isoWeekParts(targetMonday);
  if (parts.year !== year || parts.week !== week) return null;

  const sunday = new Date(targetMonday.getTime() + 6 * DAY_MS);
  return {
    weekId: `${year}-W${pad2(week)}`,
    year,
    week,
    startDate: toIsoDate(targetMonday),
    endDate: toIsoDate(sunday),
    label: buildLabel(targetMonday, sunday, locale),
  };
}

/** 현재 UTC 기준 주차. */
export function getCurrentWeek(now: Date = new Date(), locale: ReviewRangeLocale = 'ko'): WeekRange {
  return getWeekRangeFromDate(now, locale);
}

/** 이전 N주 WeekRange 배열 (오래된 → 최신 순). */
export function getRecentWeeks(count: number, now: Date = new Date(), locale: ReviewRangeLocale = 'ko'): WeekRange[] {
  const out: WeekRange[] = [];
  const base = toMondayUTC(now);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * WEEK_MS);
    out.push(getWeekRangeFromDate(d, locale));
  }
  return out;
}
