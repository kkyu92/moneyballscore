import type { Metadata } from 'next';
import Link from 'next/link';
import { assertSelectOk, KST_OFFSET_MS, PRODUCTION_COHORT_RULES, CALENDAR_ISR_HOURS, CALENDAR_ISR_SECONDS, SITE_URL } from '@moneyball/shared';
import { createClient } from '@/lib/supabase/server';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { EmptyState } from '@/components/shared/EmptyState';
import { RelatedLinks, type RelatedLink } from '@/components/shared/RelatedLinks';

// /calendar — 현재 월 (KST) 의 daily prediction count + accuracy heatmap.
// cycle 1021 (b8) — 사용자 가시 entry route 추가. 월별 view + 각 cell 클릭 시
// /predictions/[date] 진입. PRODUCTION_COHORT_RULES filter (v1.8 + v1.8-credit-fail, 사례 17 family wave 15).

export const revalidate = CALENDAR_ISR_SECONDS;

interface DayCell {
  date: string; // YYYY-MM-DD (KST)
  inMonth: boolean;
  dayOfMonth: number;
  totalPredictions: number;
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null; // 0..1, null if verifiedN === 0
}

interface MonthInfo {
  year: number;
  month: number; // 1..12
  monthLabel: string; // "2026년 5월"
  firstDay: string; // YYYY-MM-DD
  lastDay: string; // YYYY-MM-DD
}

function getKstMonthInfo(now: Date = new Date()): MonthInfo {
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

function buildEmptyGrid(info: MonthInfo): DayCell[] {
  // 7x6 grid (월요일 시작). 월요일=0, 일요일=6 정렬.
  const cells: DayCell[] = [];
  const first = new Date(`${info.firstDay}T00:00:00+09:00`);
  // JS getDay: 0=일, 1=월, ..., 6=토. 월요일 시작 grid → (getDay+6)%7
  const dowMon = (first.getUTCDay() + 6) % 7;

  // 이번달 첫 주 앞 빈칸 (이전달 끝 일부)
  for (let i = 0; i < dowMon; i++) {
    const d = new Date(first);
    d.setUTCDate(d.getUTCDate() - (dowMon - i));
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      date: iso,
      inMonth: false,
      dayOfMonth: d.getUTCDate(),
      totalPredictions: 0,
      verifiedN: 0,
      correctN: 0,
      accuracyRate: null,
    });
  }

  // 이번달 모든 날
  const lastDate = Number(info.lastDay.slice(8, 10));
  for (let day = 1; day <= lastDate; day++) {
    const iso = `${info.year}-${String(info.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      date: iso,
      inMonth: true,
      dayOfMonth: day,
      totalPredictions: 0,
      verifiedN: 0,
      correctN: 0,
      accuracyRate: null,
    });
  }

  // 다음달 시작 일부 (총 42칸 채우기 = 7x6)
  while (cells.length < 42) {
    const last = cells[cells.length - 1];
    const d = new Date(`${last.date}T00:00:00+09:00`);
    d.setUTCDate(d.getUTCDate() + 1);
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      date: iso,
      inMonth: false,
      dayOfMonth: d.getUTCDate(),
      totalPredictions: 0,
      verifiedN: 0,
      correctN: 0,
      accuracyRate: null,
    });
  }

  return cells;
}

interface CalendarPredictionRow {
  is_correct: boolean | null;
  prediction_type: string;
  scoring_rule: string | null;
  game: { game_date: string } | null;
}

async function getMonthHeatmap(info: MonthInfo): Promise<DayCell[]> {
  const cells = buildEmptyGrid(info);
  const supabase = await createClient();

  // assertSelectOk — silent drift family detection. PRODUCTION_COHORT_RULES filter
  // (v1.8 + v1.8-credit-fail) — 사용자 가시 layer, credit-fail row 분리 후 정합 복원
  // (사례 17 family wave 15, cycle 1096).
  const result = await supabase
    .from('predictions')
    .select(
      'is_correct, prediction_type, scoring_rule, game:games!predictions_game_id_fkey(game_date)',
    )
    .eq('prediction_type', 'pre_game')
    .in('scoring_rule', PRODUCTION_COHORT_RULES)
    .gte('game.game_date', info.firstDay)
    .lte('game.game_date', info.lastDay);

  const { data } = assertSelectOk(result, 'calendar getMonthHeatmap');
  const rows = ((data ?? []) as unknown as CalendarPredictionRow[]).filter(
    (r) => r.game?.game_date,
  );

  const byDate = new Map<string, { total: number; verified: number; correct: number }>();
  for (const r of rows) {
    const d = r.game!.game_date;
    const cur = byDate.get(d) ?? { total: 0, verified: 0, correct: 0 };
    cur.total += 1;
    if (r.is_correct === true) {
      cur.verified += 1;
      cur.correct += 1;
    } else if (r.is_correct === false) {
      cur.verified += 1;
    }
    byDate.set(d, cur);
  }

  return cells.map((cell) => {
    if (!cell.inMonth) return cell;
    const agg = byDate.get(cell.date);
    if (!agg) return cell;
    return {
      ...cell,
      totalPredictions: agg.total,
      verifiedN: agg.verified,
      correctN: agg.correct,
      accuracyRate: agg.verified > 0 ? agg.correct / agg.verified : null,
    };
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const info = getKstMonthInfo();
  const title = `${info.monthLabel} 승부예측 캘린더 — KBO`;
  const description = `${info.monthLabel} KBO 일별 예측 경기 수 + 적중률 캘린더 히트맵. 각 날짜 클릭 시 해당일 예측 카드 상세로 이동.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/calendar` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/calendar`,
      type: 'website',
      locale: 'ko_KR',
      siteName: 'MoneyBall Score',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

function accuracyClass(rate: number | null, verifiedN: number): string {
  if (rate == null || verifiedN === 0) {
    return 'bg-gray-50 dark:bg-[var(--color-surface-card)] text-gray-400 dark:text-gray-500';
  }
  if (rate >= 0.6) return 'bg-brand-500/15 text-brand-600 dark:text-brand-300';
  if (rate >= 0.5) return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
  return 'bg-red-500/10 text-red-600 dark:text-red-300';
}

function accuracyBadge(rate: number | null, verifiedN: number): string {
  if (rate == null || verifiedN === 0) return '-';
  return `${Math.round(rate * 100)}%`;
}

export default async function CalendarPage() {
  const info = getKstMonthInfo();
  const cells = await getMonthHeatmap(info);

  const monthTotal = cells.reduce(
    (acc, c) => {
      if (!c.inMonth) return acc;
      acc.total += c.totalPredictions;
      acc.verified += c.verifiedN;
      acc.correct += c.correctN;
      return acc;
    },
    { total: 0, verified: 0, correct: 0 },
  );
  const monthRate =
    monthTotal.verified > 0
      ? Math.round((monthTotal.correct / monthTotal.verified) * 100)
      : null;

  const weekHeaders = ['월', '화', '수', '목', '금', '토', '일'];

  const related: RelatedLink[] = [
    { href: '/predictions', label: '예측 hub', hint: '전체 카드 모음' },
    { href: '/accuracy', label: '누적 적중률', hint: '캘리브레이션 + 트렌드' },
    { href: '/reviews', label: '예측 리뷰', hint: '주간 / 월간' },
    { href: '/standings', label: '순위', hint: '시즌 standings' },
  ];

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <Breadcrumb items={[{ label: '월별 캘린더' }]} />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{info.monthLabel} 승부예측 캘린더</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          KBO {info.monthLabel} 일별 예측 경기 수 + 적중률.
          {monthRate !== null
            ? ` 월 누적 적중률 ${monthRate}% (${monthTotal.correct}/${monthTotal.verified}, 총 ${monthTotal.total}예측).`
            : monthTotal.total > 0
              ? ` 총 ${monthTotal.total}예측, 검증 대기 중.`
              : ' 이번 달 예측 데이터 집계 전.'}
        </p>
      </header>

      <section
        aria-labelledby="calendar-grid-title"
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 md:p-5"
      >
        <h2 id="calendar-grid-title" className="sr-only">
          {info.monthLabel} 일별 예측 그리드
        </h2>
        <div className="grid grid-cols-7 gap-1 md:gap-1.5">
          {weekHeaders.map((label) => (
            <div
              key={label}
              className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1"
            >
              {label}
            </div>
          ))}
          {cells.map((cell) => {
            const cellClass = accuracyClass(cell.accuracyRate, cell.verifiedN);
            const badge = accuracyBadge(cell.accuracyRate, cell.verifiedN);

            if (!cell.inMonth) {
              return (
                <div
                  key={cell.date}
                  className="aspect-square rounded-md border border-transparent flex flex-col items-center justify-center text-xs opacity-40"
                >
                  <span className="text-gray-300 dark:text-gray-700">
                    {cell.dayOfMonth}
                  </span>
                </div>
              );
            }

            // 이번달 + 예측 없음 → 비활성 (링크는 유지)
            const hasData = cell.totalPredictions > 0;

            return (
              <Link
                key={cell.date}
                href={`/predictions/${cell.date}`}
                aria-label={`${cell.date} 예측 ${cell.totalPredictions}경기${cell.verifiedN > 0 ? ` 적중률 ${Math.round((cell.correctN / cell.verifiedN) * 100)}%` : ''}`}
                data-calendar-date={cell.date}
                data-has-data={hasData ? 'true' : 'false'}
                className={`aspect-square rounded-md border border-gray-100 dark:border-[var(--color-border)] flex flex-col items-center justify-center gap-0.5 text-xs hover:border-brand-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 transition-transform ${cellClass}`}
              >
                <span className="font-medium">{cell.dayOfMonth}</span>
                {hasData && (
                  <>
                    <span className="text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400 leading-none">
                      {cell.totalPredictions}경기
                    </span>
                    <span className="text-[9px] md:text-[10px] font-mono leading-none">
                      {badge}
                    </span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <Link
          href={`/predictions`}
          className="hover:text-brand-500 transition-colors"
        >
          ← 전체 예측 hub
        </Link>
        <span aria-hidden>·</span>
        <span>KST 기준 {info.monthLabel} (자동 갱신 {CALENDAR_ISR_HOURS}시간 주기)</span>
      </section>

      {monthTotal.total === 0 && (
        <EmptyState
          icon="📅"
          title={`${info.monthLabel} 예측 데이터가 아직 없습니다`}
          description="해당 월 KBO 경기가 시작되면 자동으로 집계됩니다."
        />
      )}

      <RelatedLinks title="관련 페이지" items={related} />
    </article>
  );
}
