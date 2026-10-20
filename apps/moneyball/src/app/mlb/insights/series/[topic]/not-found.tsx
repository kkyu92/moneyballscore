import Link from "next/link";
import type { Metadata } from "next";
import { MLB_TEAM_COUNT } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "MLB AI 인사이트 시리즈를 찾을 수 없음",
  description: "요청하신 팀 조합의 MLB AI 인사이트 시리즈가 존재하지 않거나 잘못된 URL 형식입니다.",
  robots: { index: false, follow: false },
};

export default function MlbSeriesTopicNotFound() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">인사이트 시리즈를 찾을 수 없습니다</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          요청하신 팀 조합이 잘못됐거나 URL 형식이 올바르지 않습니다.
          <br className="hidden sm:block" />
          두 팀 코드를 알파벳 오름차순으로 입력해야 합니다.
        </p>
      </header>

      <section className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 rounded-xl p-5 text-left text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">URL 형식</h2>
        <ul className="space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <li>· 시리즈 — <code>/mlb/insights/series/nyy-vs-bos</code> (팀 코드 2개, 알파벳 오름차순, 소문자)</li>
          <li>· MLB {MLB_TEAM_COUNT}팀 코드는 아래 hub 에서 확인</li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/mlb/insights" className="text-brand-600 dark:text-brand-400 hover:underline">
          MLB AI 인사이트 hub →
        </Link>
        <Link href="/mlb/team" className="text-gray-600 dark:text-gray-300 hover:underline">
          MLB 팀 목록 →
        </Link>
      </div>
    </div>
  );
}
