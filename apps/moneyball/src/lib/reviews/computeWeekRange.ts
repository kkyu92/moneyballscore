/**
 * ISO 8601 주차 (월요일 시작) 기반 주간 범위 유틸.
 * KBO 리그는 월~일 사이클로 운영되지 않지만, 블로그 리뷰 일관성 + URL
 * 스키마(`2026-W16`)를 위해 ISO 주차 사용.
 */

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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 입력 Date를 해당 주의 월요일 00:00 UTC로 고정. */
function toMondayUTC(d: Date): Date {
  const out = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
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
  const thursday = new Date(monday.getTime() + 3 * 24 * 60 * 60 * 1000);
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

function buildLabel(start: Date, end: Date): string {
  const y = start.getUTCFullYear();
  const sm = start.getUTCMonth() + 1;
  const sd = start.getUTCDate();
  const em = end.getUTCMonth() + 1;
  const ed = end.getUTCDate();
  if (sm === em) {
    return `${y}년 ${sm}월 ${sd}일 ~ ${ed}일`;
  }
  return `${y}년 ${sm}월 ${sd}일 ~ ${em}월 ${ed}일`;
}

export function getWeekRangeFromDate(d: Date): WeekRange {
  const monday = toMondayUTC(d);
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  const { year, week } = isoWeekParts(monday);
  return {
    weekId: `${year}-W${pad2(week)}`,
    year,
    week,
    startDate: toIsoDate(monday),
    endDate: toIsoDate(sunday),
    label: buildLabel(monday, sunday),
  };
}

/**
 * "2026-W16" 형식 파싱. 유효하지 않으면 null.
 */
export function parseWeekId(weekId: string): WeekRange | null {
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

  const sunday = new Date(targetMonday.getTime() + 6 * 24 * 60 * 60 * 1000);
  return {
    weekId: `${year}-W${pad2(week)}`,
    year,
    week,
    startDate: toIsoDate(targetMonday),
    endDate: toIsoDate(sunday),
    label: buildLabel(targetMonday, sunday),
  };
}

/** 현재 UTC 기준 주차. */
export function getCurrentWeek(now: Date = new Date()): WeekRange {
  return getWeekRangeFromDate(now);
}

/** 이전 N주 WeekRange 배열 (오래된 → 최신 순). */
export function getRecentWeeks(count: number, now: Date = new Date()): WeekRange[] {
  const out: WeekRange[] = [];
  const base = toMondayUTC(now);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * WEEK_MS);
    out.push(getWeekRangeFromDate(d));
  }
  return out;
}
