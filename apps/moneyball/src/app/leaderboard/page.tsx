import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';
import { fetchAiBaseline, fetchLeaderboard } from '@/lib/leaderboard/server';

export const revalidate = 30;

export const metadata: Metadata = {
  title: '픽 리더보드 | 머니볼스코어',
  description: 'KBO 승부예측 픽 전체 순위. 닉네임을 설정하고 전국 팬들과 적중률을 겨뤄보세요.',
  alternates: { canonical: 'https://moneyballscore.vercel.app/leaderboard' },
  openGraph: {
    title: '픽 리더보드 | 머니볼스코어',
    description: '내 픽 적중률이 전국 몇 등인지 확인하세요!',
  },
};

export default async function LeaderboardPage() {
  const [weeklyEntries, seasonEntries, weeklyAi, seasonAi] = await Promise.all([
    fetchLeaderboard('weekly'),
    fetchLeaderboard('season'),
    fetchAiBaseline('weekly'),
    fetchAiBaseline('season'),
  ]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: '픽 리더보드' }]} />
      <h1 className="text-2xl font-bold mb-2 mt-4">픽 리더보드</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        KBO 팬들의 승부예측 적중률 순위입니다. 픽 5개 이상 완료 시 등장합니다.
      </p>
      <div className="mb-6 rounded-lg border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] p-4 text-sm space-y-2">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>처음이라면:</strong>{" "}
          <Link href="/picks" className="text-brand-500 hover:underline">
            /picks
          </Link>{" "}
          에서 닉네임 설정 → 매 경기 카드에서 어느 팀이 이길지 선택 → 5건 완료
          시 자동 등재. AI 모델과의 대결 성적도 함께 비교됩니다.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ※ 픽 기록은 분석·재미 목적이며 베팅 안내가 아닙니다. 자세한 사용법은{" "}
          <Link href="/guide" className="text-brand-500 hover:underline">
            사용 가이드
          </Link>{" "}
          참조.
        </p>
      </div>
      <LeaderboardClient
        weeklyEntries={weeklyEntries}
        seasonEntries={seasonEntries}
        weeklyAi={weeklyAi}
        seasonAi={seasonAi}
      />
    </main>
  );
}
