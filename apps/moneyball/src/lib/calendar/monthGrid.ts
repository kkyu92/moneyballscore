import { KST_OFFSET_MS } from '@moneyball/shared';

// KBO calendar/page.tsx 와 MLB mlb/calendar/page.tsx 가 공유하는 월별 7x6 grid 골격.
// 리그별 차이(예측 집계 쿼리)는 각 페이지가 채우고, 이 유틸은 순수 달력 골격만 담당.

export interface DayCell {
  date: string; // YYYY-MM-DD (KST)
  inMonth: boolean;
  dayOfMonth: number;
  totalPredictions: number;
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null; // 0..1, null if verifiedN === 0
}

export interface MonthInfo {
  year: number;
  month: number; // 1..12
  monthLabel: string; // "2026년 5월"
  firstDay: string; // YYYY-MM-DD
  lastDay: string; // YYYY-MM-DD
}

export function getKstMonthInfo(now: Date = new Date()): MonthInfo {
  // KST = UTC+9
  const kstMs = now.getTime() + KST_OFFSET_MS;
  const kst = new Date(kstMs);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1; // 1..12

  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  // 다음달 1일 - 1일 = 이번달 마지막 날
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;

  return {
    year,
    month,
    monthLabel: `${year}년 ${month}월`,
    firstDay,
    lastDay,
  };
}

// YYYY-MM-DD 캘린더 날짜를 순수 UTC 달력 연산(Date.UTC 컴포넌트 생성)으로 다루는 헬퍼.
// `new Date(iso + 'T00:00:00+09:00')` 식 타임존 오프셋 파싱은 KST 자정을 "전날 15:00 UTC"
// 인스턴트로 만들어버려 getUTCDay()/getUTCDate() 가 의도한 캘린더 날짜보다 하루 이른 값을
// 반환한다 — 요일 정렬이 매달 1칸씩 밀리고, 말일 다음 날 계산은 같은 UTC 날짜로 수렴해
// 다음달 패딩 6칸이 전부 말일로 중복되는 실제 프로덕션 버그였다(explore-idea cycle 2123,
// mlb/calendar 신규 구현 중 monthGrid 공용 추출하며 회귀 테스트로 발견).
function toUtcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysIso(iso: string, delta: number): string {
  const d = toUtcDate(iso);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function emptyDayCell(date: string, inMonth: boolean, dayOfMonth: number): DayCell {
  return {
    date,
    inMonth,
    dayOfMonth,
    totalPredictions: 0,
    verifiedN: 0,
    correctN: 0,
    accuracyRate: null,
  };
}

export function buildEmptyGrid(info: MonthInfo): DayCell[] {
  // 7x6 grid (월요일 시작). 월요일=0, 일요일=6 정렬.
  const cells: DayCell[] = [];
  // JS getUTCDay: 0=일, 1=월, ..., 6=토. 월요일 시작 grid → (getUTCDay+6)%7
  const dowMon = (toUtcDate(info.firstDay).getUTCDay() + 6) % 7;

  // 이번달 첫 주 앞 빈칸 (이전달 끝 일부)
  for (let i = 0; i < dowMon; i++) {
    const iso = addDaysIso(info.firstDay, -(dowMon - i));
    cells.push(emptyDayCell(iso, false, toUtcDate(iso).getUTCDate()));
  }

  // 이번달 모든 날
  const lastDate = Number(info.lastDay.slice(8, 10));
  for (let day = 1; day <= lastDate; day++) {
    const iso = `${info.year}-${String(info.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push(emptyDayCell(iso, true, day));
  }

  // 다음달 시작 일부 (총 42칸 채우기 = 7x6)
  let cursor = info.lastDay;
  while (cells.length < 42) {
    cursor = addDaysIso(cursor, 1);
    cells.push(emptyDayCell(cursor, false, toUtcDate(cursor).getUTCDate()));
  }

  return cells;
}
