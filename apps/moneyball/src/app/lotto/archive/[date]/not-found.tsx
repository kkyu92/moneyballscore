import Link from "next/link";
import type { Metadata } from "next";
import { listArchiveDates } from "@/lib/lotto/archive";

export const metadata: Metadata = {
  title: "해당 회차 50조합 archive 를 찾을 수 없음",
  description:
    "요청하신 회차의 50조합 archive 가 존재하지 않거나 잘못된 날짜 형식입니다.",
  robots: { index: false, follow: false },
};

export default function LottoArchiveDateNotFound() {
  const recentDates = listArchiveDates().slice(0, 8);

  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">
          해당 회차 archive 가 없습니다
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          요청하신 회차의 50조합 archive 가 박제되지 않았거나 잘못된 날짜 형식입니다.
          <br className="hidden sm:block" />
          아래에서 최근 박제된 회차 archive 를 확인하세요.
        </p>
      </header>

      {recentDates.length > 0 ? (
        <nav aria-label="최근 회차" className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            최근 박제된 회차
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {recentDates.map((date) => (
              <li key={date}>
                <Link
                  href={`/lotto/archive/${date}`}
                  className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  {date}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <section className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 rounded-xl p-5 text-left text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">URL 형식</h2>
        <ul className="space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <li>
            · 회차별 archive — <code>/lotto/archive/YYYY-MM-DD</code>
          </li>
          <li>· 날짜 형식 — 토요일 추첨일 (KST 기준)</li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link
          href="/lotto/methodology"
          className="text-brand-600 dark:text-brand-400 hover:underline"
        >
          Lotto 통계 방법론 →
        </Link>
        <Link
          href="/"
          className="text-gray-600 dark:text-gray-300 hover:underline"
        >
          오늘의 예측 →
        </Link>
      </div>
    </div>
  );
}
