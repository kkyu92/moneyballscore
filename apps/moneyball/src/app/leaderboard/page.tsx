import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';
import { fetchLeaderboard } from '@/lib/leaderboard/server';

export const revalidate = 30;

export const metadata: Metadata = {
  title: '픽 리더보드 | 머니볼스코어',
  description: 'KBO 승부예측 픽 전체 순위. 닉네임을 설정하고 전국 팬들과 적중률을 겨뤄보세요.',
  openGraph: {
    title: '픽 리더보드 | 머니볼스코어',
    description: '내 픽 적중률이 전국 몇 등인지 확인하세요!',
  },
};

export default async function LeaderboardPage() {
  const [weeklyEntries, seasonEntries] = await Promise.all([
    fetchLeaderboard('weekly'),
    fetchLeaderboard('season'),
  ]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          { label: '픽 리더보드' },
        ]}
      />
      <h1 className="text-2xl font-bold mb-2 mt-4">픽 리더보드</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        KBO 팬들의 승부예측 적중률 순위입니다. 픽 5개 이상 완료 시 등장합니다.
      </p>
      <LeaderboardClient
        weeklyEntries={weeklyEntries}
        seasonEntries={seasonEntries}
      />
    </main>
  );
}
