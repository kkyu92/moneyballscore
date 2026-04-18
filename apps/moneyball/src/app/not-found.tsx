import Link from 'next/link';
import type { Metadata } from 'next';
import { toKSTDateString } from '@moneyball/shared';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없음',
  description: '요청하신 페이지가 존재하지 않거나 이동되었습니다.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  const today = toKSTDateString();

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          요청하신 주소가 존재하지 않거나 이동되었습니다.
          <br className="hidden sm:block" />
          아래 링크에서 원하는 데이터를 찾아보세요.
        </p>
      </header>

      <nav aria-label="빠른 이동" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          빠른 이동
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Link
            href="/"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            오늘의 예측
          </Link>
          <Link
            href={`/predictions/${today}`}
            className="bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-4 py-3 transition-colors"
          >
            오늘 경기
          </Link>
          <Link
            href="/analysis"
            className="bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-4 py-3 transition-colors"
          >
            AI 분석
          </Link>
          <Link
            href="/teams"
            className="bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-4 py-3 transition-colors"
          >
            팀 프로필
          </Link>
          <Link
            href="/players"
            className="bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-4 py-3 transition-colors"
          >
            선수 리더보드
          </Link>
          <Link
            href="/dashboard"
            className="bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-4 py-3 transition-colors"
          >
            대시보드
          </Link>
        </div>
      </nav>

      <section className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 text-left text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">
          자주 찾는 페이지 형식
        </h2>
        <ul className="space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <li>· 일자별 예측 — <code>/predictions/2026-04-19</code></li>
          <li>· 경기 분석 — <code>/analysis/game/[id]</code></li>
          <li>· 팀 프로필 — <code>/teams/SS</code> (LG, KT, SS, NC...)</li>
          <li>· 매치업 — <code>/matchup/SS/LG</code></li>
        </ul>
      </section>
    </div>
  );
}
