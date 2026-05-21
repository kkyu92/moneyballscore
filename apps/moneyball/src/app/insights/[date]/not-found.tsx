import Link from "next/link";
import type { Metadata } from "next";
import { toKSTDateString } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "해당 일자 AI 인사이트를 찾을 수 없음",
  description: "요청하신 일자의 AI 인사이트가 존재하지 않거나 잘못된 날짜 형식입니다.",
  robots: { index: false, follow: false },
};

function ksTDateOffset(daysAgo: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - daysAgo);
  return toKSTDateString(now);
}

export default function InsightsDateNotFound() {
  const today = toKSTDateString();
  const recentDates = [0, 1, 2, 3, 4, 5, 6].map((d) => ksTDateOffset(d));

  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">해당 일자 AI 인사이트가 없습니다</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          요청하신 일자에 누적된 AI reasoning 이 없거나 잘못된 형식입니다.
          <br className="hidden sm:block" />
          아래에서 최근 일자 인사이트를 확인하세요.
        </p>
      </header>

      <nav aria-label="최근 일자" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">최근 일자 인사이트</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {recentDates.map((date, i) => {
            const label = i === 0 ? "오늘" : i === 1 ? "어제" : date;
            return (
              <li key={date}>
                <Link
                  href={`/insights/${date}`}
                  className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 rounded-xl p-5 text-left text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">URL 형식</h2>
        <ul className="space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <li>· 일자별 인사이트 — <code>/insights/{today}</code></li>
          <li>· 일자 형식 — <code>YYYY-MM-DD</code> (KST 기준, 최근 90일)</li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/insights" className="text-brand-600 dark:text-brand-400 hover:underline">
          AI 인사이트 hub →
        </Link>
        <Link href="/" className="text-gray-600 dark:text-gray-300 hover:underline">
          오늘의 예측 →
        </Link>
      </div>
    </div>
  );
}
