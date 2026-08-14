import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, CALENDAR_ISR_HOURS, ACCURACY_GOOD_RATE, WEEKDAY_LABELS_KO_MON_FIRST } from '@moneyball/shared';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { EmptyState } from '@/components/shared/EmptyState';
import { getKstMonthInfo, buildEmptyGrid, type MonthInfo, type DayCell } from '@/lib/calendar/monthGrid';
import { getMlbMonthHeatmap } from '@/lib/mlb/buildMlbCalendarHeatmap';

// /mlb/calendar — 현재 월 (KST) 의 MLB 일별 예측 경기 수 + 적중률 히트맵.
// KBO calendar/page.tsx 병렬 복제(월 grid 골격은 @/lib/calendar/monthGrid 공유),
// 집계 쿼리만 MLB 전용(mlb_schedule + predictions.league='mlb', deriveMlbOutcome 사용
// — MLB predictions.is_correct 는 전량 NULL 이라 KBO 처럼 DB row 직접 못 읽음).

export const revalidate = 3600; // CALENDAR_ISR_SECONDS (Next.js 16 Turbopack: literal required)

async function getMonthHeatmap(info: MonthInfo): Promise<DayCell[]> {
  const cells = buildEmptyGrid(info);
  const byDate = await getMlbMonthHeatmap(info.firstDay, info.lastDay);

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
  const title = `${info.monthLabel} 승부예측 캘린더 — MLB`;
  const description = `${info.monthLabel} MLB 일별 예측 경기 수 + 적중률 캘린더 히트맵. 각 날짜 클릭 시 해당일 경기 상세로 이동.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/mlb/calendar` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/mlb/calendar`,
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
  if (rate >= ACCURACY_GOOD_RATE) return 'bg-brand-500/15 text-brand-600 dark:text-brand-300';
  if (rate >= 0.5) return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
  return 'bg-red-500/10 text-red-600 dark:text-red-300';
}

function accuracyBadge(rate: number | null, verifiedN: number): string {
  if (rate == null || verifiedN === 0) return '-';
  return `${Math.round(rate * 100)}%`;
}

export default async function MlbCalendarPage() {
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

  const weekHeaders = WEEKDAY_LABELS_KO_MON_FIRST;

  return (
    <main className="max-w-4xl mx-auto space-y-6 py-4">
      <Breadcrumb items={[{ href: '/mlb', label: 'MLB 분석' }, { label: '월별 캘린더' }]} />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{info.monthLabel} MLB 승부예측 캘린더</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          MLB {info.monthLabel} 일별 예측 경기 수 + 적중률.
          {monthRate !== null
            ? ` 월 누적 적중률 ${monthRate}% (${monthTotal.correct}/${monthTotal.verified}, 총 ${monthTotal.total}예측).`
            : monthTotal.total > 0
              ? ` 총 ${monthTotal.total}예측, 검증 대기 중.`
              : ' 이번 달 예측 데이터 집계 전.'}
        </p>
      </header>

      <section
        aria-labelledby="mlb-calendar-grid-title"
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 md:p-5"
      >
        <h2 id="mlb-calendar-grid-title" className="sr-only">
          {info.monthLabel} MLB 일별 예측 그리드
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
                  <span className="text-gray-300 dark:text-gray-700">{cell.dayOfMonth}</span>
                </div>
              );
            }

            const hasData = cell.totalPredictions > 0;

            return (
              <Link
                key={cell.date}
                href={`/mlb/games/${cell.date}`}
                aria-label={`${cell.date} MLB 예측 ${cell.totalPredictions}경기${cell.verifiedN > 0 ? ` 적중률 ${Math.round((cell.correctN / cell.verifiedN) * 100)}%` : ''}`}
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
                    <span className="text-[9px] md:text-[10px] font-mono leading-none">{badge}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <Link href="/mlb" className="hover:text-brand-500 transition-colors">
          ← MLB 분석 hub
        </Link>
        <span aria-hidden>·</span>
        <span>KST 기준 {info.monthLabel} (자동 갱신 {CALENDAR_ISR_HOURS}시간 주기)</span>
      </section>

      {monthTotal.total === 0 && (
        <EmptyState
          icon="📅"
          title={`${info.monthLabel} MLB 예측 데이터가 아직 없습니다`}
          description="해당 월 MLB 경기가 시작되면 자동으로 집계됩니다."
        />
      )}
    </main>
  );
}
