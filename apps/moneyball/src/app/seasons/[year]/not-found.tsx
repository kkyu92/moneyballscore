import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "시즌을 찾을 수 없음",
  description: "요청하신 시즌 연도가 잘못된 형식이거나 데이터가 없습니다.",
  robots: { index: false, follow: false },
};

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR, 2025, 2024, 2023];

export default function SeasonNotFound() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">
          시즌 리뷰가 없습니다
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          요청하신 시즌 연도가 잘못된 형식이거나 데이터가 없는 시즌입니다.
          <br className="hidden sm:block" />
          아래에서 사용 가능한 시즌을 선택하세요.
        </p>
      </header>

      <nav aria-label="사용 가능한 시즌" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          사용 가능한 시즌
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AVAILABLE_YEARS.map((year, i) => (
            <li key={year}>
              <Link
                href={`/seasons/${year}`}
                className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {year}
                {i === 0 ? " · 진행 중" : ""}
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
          <li>· 시즌 리뷰 — <code>/seasons/{CURRENT_YEAR}</code></li>
          <li>· 연도 형식 — <code>YYYY</code> (4자리)</li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/seasons" className="text-brand-600 dark:text-brand-400 hover:underline">
          시즌 hub →
        </Link>
        <Link href="/" className="text-gray-600 dark:text-gray-300 hover:underline">
          오늘의 예측 →
        </Link>
      </div>
    </div>
  );
}
