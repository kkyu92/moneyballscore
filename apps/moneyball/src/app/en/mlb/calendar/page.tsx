import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, CALENDAR_ISR_HOURS, ACCURACY_GOOD_RATE, WEEKDAY_LABELS_EN_MON_FIRST } from '@moneyball/shared';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { EmptyState } from '@/components/shared/EmptyState';
import { getKstMonthInfo, buildEmptyGrid, type MonthInfo, type DayCell } from '@/lib/calendar/monthGrid';
import { getMlbMonthHeatmap } from '@/lib/mlb/buildMlbCalendarHeatmap';

// /en/mlb/calendar — EN mirror of /mlb/calendar (explore-idea, cycle 2126).
// Same monthGrid skeleton + getMlbMonthHeatmap aggregation query as the KO page,
// English-only labels/copy (locale text does not affect the shared calendar math).

export const revalidate = 3600; // CALENDAR_ISR_SECONDS (Next.js 16 Turbopack: literal required)

function monthLabelEn(info: MonthInfo): string {
  return new Date(Date.UTC(info.year, info.month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

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
  const label = monthLabelEn(info);
  const title = `${label} MLB Prediction Calendar`;
  const description = `${label} MLB daily prediction counts + accuracy heatmap. Click any date to jump to that day's games.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/en/mlb/calendar`,
      languages: {
        en: `${SITE_URL}/en/mlb/calendar`,
        ko: `${SITE_URL}/mlb/calendar`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/en/mlb/calendar`,
      type: 'website',
      locale: 'en_US',
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

export default async function MlbCalendarPageEn() {
  const info = getKstMonthInfo();
  const label = monthLabelEn(info);
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

  const weekHeaders = WEEKDAY_LABELS_EN_MON_FIRST;

  return (
    <main className="max-w-4xl mx-auto space-y-6 py-4">
      <Breadcrumb items={[{ href: '/en/mlb', label: 'MLB Analysis' }, { label: 'Monthly Calendar' }]} locale="en" />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{label} MLB Prediction Calendar</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          MLB daily prediction counts + accuracy for {label}.
          {monthRate !== null
            ? ` Month-to-date accuracy ${monthRate}% (${monthTotal.correct}/${monthTotal.verified}, ${monthTotal.total} predictions total).`
            : monthTotal.total > 0
              ? ` ${monthTotal.total} predictions total, awaiting verification.`
              : ' No prediction data for this month yet.'}
        </p>
      </header>

      <section
        aria-labelledby="mlb-calendar-grid-title-en"
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 md:p-5"
      >
        <h2 id="mlb-calendar-grid-title-en" className="sr-only">
          {label} MLB daily prediction grid
        </h2>
        <div className="grid grid-cols-7 gap-1 md:gap-1.5">
          {weekHeaders.map((day) => (
            <div
              key={day}
              className="text-2xs md:text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1"
            >
              {day}
            </div>
          ))}
          {cells.map((cell) => {
            const cellClass = accuracyClass(cell.accuracyRate, cell.verifiedN);
            const badge = accuracyBadge(cell.accuracyRate, cell.verifiedN);

            if (!cell.inMonth) {
              return (
                <div
                  key={cell.date}
                  className="aspect-square rounded-lg border border-transparent flex flex-col items-center justify-center text-xs opacity-40"
                >
                  <span className="text-gray-300 dark:text-gray-700">{cell.dayOfMonth}</span>
                </div>
              );
            }

            const hasData = cell.totalPredictions > 0;

            return (
              <Link
                key={cell.date}
                href={`/en/mlb/games/${cell.date}`}
                aria-label={`${cell.date} MLB predictions ${cell.totalPredictions} games${cell.verifiedN > 0 ? `, accuracy ${Math.round((cell.correctN / cell.verifiedN) * 100)}%` : ''}`}
                data-calendar-date={cell.date}
                data-has-data={hasData ? 'true' : 'false'}
                className={`aspect-square rounded-lg border border-gray-100 dark:border-[var(--color-border)] flex flex-col items-center justify-center gap-0.5 text-xs hover:border-brand-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 transition-transform ${cellClass}`}
              >
                <span className="font-medium">{cell.dayOfMonth}</span>
                {hasData && (
                  <>
                    <span className="text-3xs md:text-2xs text-gray-500 dark:text-gray-400 leading-none">
                      {cell.totalPredictions}g
                    </span>
                    <span className="text-3xs md:text-2xs font-mono leading-none">{badge}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <Link href="/en/mlb" className="hover:text-brand-500 transition-colors">
          ← MLB Analysis hub
        </Link>
        <span aria-hidden>·</span>
        <span>KST-based {label} (auto-refresh every {CALENDAR_ISR_HOURS}h)</span>
      </section>

      {monthTotal.total === 0 && (
        <EmptyState
          icon="📅"
          title={`No MLB prediction data for ${label} yet`}
          description="Data will populate automatically once MLB games start this month."
        />
      )}
    </main>
  );
}
