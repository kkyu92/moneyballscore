import Link from "next/link";
import type { Metadata } from "next";
import { toKSTDateString, kstDateOffset } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "경기를 찾을 수 없음",
  description: "요청하신 경기 ID가 데이터베이스에 존재하지 않습니다.",
  robots: { index: false, follow: false },
};

export default function AnalysisGameNotFound() {
  const today = toKSTDateString();
  const recentDates = [0, 1, 2, 3, 4, 5, 6].map((d) => kstDateOffset(d));

  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">
          경기를 찾을 수 없습니다
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          요청하신 경기 ID가 데이터베이스에 존재하지 않거나 아직 편성되지 않은 경기입니다.
          <br className="hidden sm:block" />
          아래에서 최근 일자별 경기 예측을 확인하세요.
        </p>
      </header>

      <nav aria-label="최근 7일 경기" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          최근 7일 경기 예측
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {recentDates.map((date, i) => (
            <li key={date}>
              <Link
                href={`/predictions/${date}`}
                className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {i === 0 ? "오늘" : i === 1 ? "어제" : date}
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
          <li>· 경기 분석 — <code>/analysis/game/{`{gameId}`}</code></li>
          <li>· 일자별 예측 — <code>/predictions/{today}</code></li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/analysis" className="text-brand-600 dark:text-brand-400 hover:underline">
          AI 분석 hub →
        </Link>
        <Link href="/" className="text-gray-600 dark:text-gray-300 hover:underline">
          오늘의 예측 →
        </Link>
      </div>
    </div>
  );
}
