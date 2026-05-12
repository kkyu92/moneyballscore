import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MyPicksClient } from '@/components/picks/MyPicksClient';

export const metadata: Metadata = {
  title: '내 픽 기록 | 머니볼스코어',
  description: '내가 픽한 경기 이력과 AI 대결 성적을 확인하세요.',
  robots: { index: false },
};

export default function PicksPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: '홈', href: '/' },
          { label: '내 픽 기록' },
        ]}
      />
      <h1 className="text-2xl font-bold mb-2 mt-4">내 픽 기록</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        AI와 대결한 결과를 한눈에 확인하세요
      </p>
      <MyPicksClient />
    </main>
  );
}
