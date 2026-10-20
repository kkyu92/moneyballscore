import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "경기 분석을 찾을 수 없음",
  description: "요청하신 날짜에 해당 경기가 존재하지 않거나 slug 형식이 올바르지 않습니다.",
  robots: { index: false, follow: false },
};

export default function MlbGameDetailNotFound() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">경기 분석을 찾을 수 없습니다</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          요청하신 날짜에 해당 경기가 없거나 URL 형식이 올바르지 않습니다.
          <br className="hidden sm:block" />
          아래에서 오늘 경기를 확인하세요.
        </p>
      </header>

      <section className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 rounded-xl p-5 text-left text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">URL 형식</h2>
        <ul className="space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <li>· 경기 분석 — <code>/mlb/games/2026-10-20/nyy-vs-bos</code></li>
          <li>· slug 형식 — <code>&lt;home&gt;-vs-&lt;away&gt;</code> (팀 코드, 소문자)</li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/mlb" className="text-brand-600 dark:text-brand-400 hover:underline">
          MLB 오늘 예측 →
        </Link>
        <Link href="/mlb/team" className="text-gray-600 dark:text-gray-300 hover:underline">
          MLB 팀 목록 →
        </Link>
      </div>
    </div>
  );
}
