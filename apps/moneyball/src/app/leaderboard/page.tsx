import type { Metadata } from 'next';
import Link from 'next/link';
import { LEADERBOARD_ISR_SECONDS, MIN_LEADERBOARD_PICKS, SITE_URL } from '@moneyball/shared';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { HallOfFame } from '@/components/leaderboard/HallOfFame';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';
import { fetchAiBaseline, fetchLeaderboard } from '@/lib/leaderboard/server';
import type { LeaderboardMode } from '@/lib/leaderboard/types';

export const revalidate = 30; // LEADERBOARD_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export const metadata: Metadata = {
  title: '픽 리더보드 | 머니볼스코어',
  description:
    'KBO 승부예측 픽 순위. 이번 달 / 시즌 / 누적 3개 탭으로 적중률 1위에 도전하세요.',
  alternates: { canonical: `${SITE_URL}/leaderboard` },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: `${SITE_URL}/leaderboard`,
    siteName: 'MoneyBall Score',
    title: '픽 리더보드 | 머니볼스코어',
    description: '내 픽 적중률이 전국 몇 등인지 확인하세요!',
  },
  twitter: {
    card: 'summary_large_image',
    title: '픽 리더보드 | 머니볼스코어',
    description: '내 픽 적중률이 전국 몇 등인지 확인하세요!',
  },
};

// cycle 1021 c10: URL search param 기반 탭. 'use client' 회피 + SEO 친화.
type PeriodTab = Extract<LeaderboardMode, 'monthly' | 'season' | 'all'>;
const PERIODS: ReadonlyArray<PeriodTab> = ['monthly', 'season', 'all'];
const PERIOD_LABEL: Record<PeriodTab, string> = {
  monthly: '이번 달',
  season: '시즌',
  all: '누적',
};
const PERIOD_NOTE: Record<PeriodTab, string> = {
  monthly: `매월 1일 (KST) 초기화 · 픽 ${MIN_LEADERBOARD_PICKS}개 이상 완료 시 등장`,
  season: `현재 KBO 시즌 누적 · 픽 ${MIN_LEADERBOARD_PICKS}개 이상 완료 시 등장`,
  all: `전체 기간 누적 · 픽 ${MIN_LEADERBOARD_PICKS}개 이상 완료 시 등장`,
};

function parsePeriod(raw: string | string[] | undefined): PeriodTab {
  if (typeof raw === 'string' && (PERIODS as readonly string[]).includes(raw)) {
    return raw as PeriodTab;
  }
  return 'monthly';
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params.period);

  const [entries, aiBaseline] = await Promise.all([
    fetchLeaderboard(period),
    fetchAiBaseline(period),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '픽 리더보드',
    description:
      'KBO 승부예측 픽 적중률 순위 — 월간·시즌·누적 리더보드 + AI 모델 baseline 대결.',
    url: `${SITE_URL}/leaderboard${period === 'monthly' ? '' : `?period=${period}`}`,
    mainEntity: {
      '@type': 'ItemList',
      name: `${PERIOD_LABEL[period]} 리더보드`,
      numberOfItems: entries.length,
      itemListElement: entries.slice(0, 10).map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: e.nickname ?? `참가자 ${i + 1}`,
      })),
    },
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb items={[{ label: '픽 리더보드' }]} />
      <h1 className="text-2xl font-bold mb-2 mt-4">픽 리더보드</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        KBO 팬들의 승부예측 적중률 순위입니다. 픽 {MIN_LEADERBOARD_PICKS}개 이상 완료 시 등장합니다.
      </p>
      <div className="mb-6 rounded-lg border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] p-4 text-sm space-y-2">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>처음이라면:</strong>{' '}
          <Link href="/picks" className="text-brand-500 hover:underline">
            /picks
          </Link>{' '}
          에서 닉네임 설정 → 매 경기 카드에서 어느 팀이 이길지 선택 → {MIN_LEADERBOARD_PICKS}건 완료
          시 자동 등재. AI 모델과의 대결 성적도 함께 비교됩니다.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ※ 픽 기록은 분석·재미 목적이며 베팅 안내가 아닙니다. 자세한 사용법은{' '}
          <Link href="/guide" className="text-brand-500 hover:underline">
            사용 가이드
          </Link>{' '}
          참조.
        </p>
      </div>

      {/* 시즌 탭 — URL search param 기반 (Server Component) */}
      <div className="mb-2" role="tablist" aria-label="리더보드 기간">
        <div className="flex gap-1 bg-gray-100 dark:bg-[var(--color-surface-card)] rounded-lg p-1">
          {PERIODS.map((p) => {
            const active = p === period;
            const href = p === 'monthly' ? '/leaderboard' : `/leaderboard?period=${p}`;
            return (
              <Link
                key={p}
                href={href}
                role="tab"
                aria-selected={active}
                prefetch={false}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md text-center transition-colors ${
                  active
                    ? 'bg-white dark:bg-[var(--color-surface-card)] shadow-sm text-brand-700 dark:text-brand-300'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {PERIOD_LABEL[p]}
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 px-1">
          {PERIOD_NOTE[period]}
        </p>
      </div>

      {/* cycle 1021 Tier 1 carry-over B: Hall of Fame (top 3 medal) */}
      {entries.length > 0 && (
        <div className="mb-5">
          <HallOfFame entries={entries} periodLabel={PERIOD_LABEL[period]} />
        </div>
      )}

      <LeaderboardClient entries={entries} aiBaseline={aiBaseline} />
    </main>
  );
}
