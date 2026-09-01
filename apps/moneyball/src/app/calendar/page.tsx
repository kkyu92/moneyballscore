import type { Metadata } from 'next';
import Link from 'next/link';
import { assertSelectOk, PRODUCTION_COHORT_RULES, CALENDAR_ISR_HOURS, SITE_URL, ACCURACY_GOOD_RATE, WEEKDAY_LABELS_KO_MON_FIRST } from '@moneyball/shared';
import { createClient } from '@/lib/supabase/server';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { EmptyState } from '@/components/shared/EmptyState';
import { RelatedLinks, type RelatedLink } from '@/components/shared/RelatedLinks';
import { getKstMonthInfo, buildEmptyGrid, type MonthInfo, type DayCell } from '@/lib/calendar/monthGrid';

// /calendar — 현재 월 (KST) 의 daily prediction count + accuracy heatmap.
// 월 grid 골격(getKstMonthInfo/buildEmptyGrid)은 mlb/calendar/page.tsx 와 공유(@/lib/calendar/monthGrid).

export const revalidate = 3600; // CALENDAR_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface CalendarPredictionRow {
  is_correct: boolean | null;
  game: { game_date: string } | null;
}

async function getMonthHeatmap(info: MonthInfo): Promise<DayCell[]> {
  const cells = buildEmptyGrid(info);
  const supabase = await createClient();

  // assertSelectOk — silent drift family detection. PRODUCTION_COHORT_RULES 참조
  // (registry = @moneyball/shared/model-version-labels) — credit-fail row 분리 후 사용자 가시 정합 복원.
  const result = await supabase
    .from('predictions')
    .select(
      'is_correct, game:games!predictions_game_id_fkey(game_date)',
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
  if (rate >= ACCURACY_GOOD_RATE) return 'bg-brand-500/15 text-brand-600 dark:text-brand-300';
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

  const weekHeaders = WEEKDAY_LABELS_KO_MON_FIRST;

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
              className="text-2xs md:text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1"
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
                  className="aspect-square rounded-lg border border-transparent flex flex-col items-center justify-center text-xs opacity-40"
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
                className={`aspect-square rounded-lg border border-gray-100 dark:border-[var(--color-border)] flex flex-col items-center justify-center gap-0.5 text-xs hover:border-brand-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 transition-transform ${cellClass}`}
              >
                <span className="font-medium">{cell.dayOfMonth}</span>
                {hasData && (
                  <>
                    <span className="text-3xs md:text-2xs text-gray-500 dark:text-gray-400 leading-none">
                      {cell.totalPredictions}경기
                    </span>
                    <span className="text-3xs md:text-2xs font-mono leading-none">
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
