import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentMonth } from "@/lib/reviews/computeMonthRange";

export const metadata: Metadata = {
  title: "월간 리뷰를 찾을 수 없음",
  description: "요청하신 월이 잘못된 형식이거나 데이터가 없습니다.",
  robots: { index: false, follow: false },
};

function monthIdOffset(monthsAgo: number): string {
  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() - monthsAgo);
  return getCurrentMonth(now).monthId;
}

export default function MonthlyReviewNotFound() {
  const recentMonths = [0, 1, 2, 3, 4, 5].map((m) => monthIdOffset(m));

  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">
          월간 리뷰가 없습니다
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          요청하신 월이 잘못된 형식이거나 시즌 외 월입니다.
          <br className="hidden sm:block" />
          아래에서 최근 월 리뷰를 확인하세요.
        </p>
      </header>

      <nav aria-label="최근 6개월" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          최근 6개월
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {recentMonths.map((monthId, i) => (
            <li key={monthId}>
              <Link
                href={`/reviews/monthly/${monthId}`}
                className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {i === 0 ? "이번 달" : i === 1 ? "지난 달" : monthId}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 rounded-xl p-5 text-left text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">
          URL 형식
        </h2>
        <ul className="space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <li>· 월간 리뷰 — <code>/reviews/monthly/{recentMonths[0]}</code></li>
          <li>· 월 형식 — <code>YYYY-MM</code></li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/reviews" className="text-brand-600 dark:text-brand-400 hover:underline">
          리뷰 hub →
        </Link>
        <Link href="/" className="text-gray-600 dark:text-gray-300 hover:underline">
          오늘의 예측 →
        </Link>
      </div>
    </div>
  );
}
