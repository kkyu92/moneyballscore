import Link from "next/link";
import type { Metadata } from "next";
import { KBO_TEAMS, KBO_TEAM_SHORT_NAME, type TeamCode } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "팀을 찾을 수 없음",
  description: "요청하신 팀 코드가 KBO 10팀에 존재하지 않습니다.",
  robots: { index: false, follow: false },
};

const TEAM_CODES = Object.keys(KBO_TEAMS) as TeamCode[];

export default function TeamNotFound() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">
          팀을 찾을 수 없습니다
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          요청하신 팀 코드가 KBO 10팀에 존재하지 않습니다.
          <br className="hidden sm:block" />
          아래에서 원하는 팀을 선택하세요.
        </p>
      </header>

      <nav aria-label="KBO 10팀" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          KBO 10팀
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TEAM_CODES.map((code) => (
            <li key={code}>
              <Link
                href={`/teams/${code}`}
                className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {KBO_TEAM_SHORT_NAME[code]}
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
          <li>· 팀 프로필 — <code>/teams/SS</code></li>
          <li>· 사용 가능 코드 — <code>{TEAM_CODES.join(", ")}</code></li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/teams" className="text-brand-600 dark:text-brand-400 hover:underline">
          팀 목록 hub →
        </Link>
        <Link href="/" className="text-gray-600 dark:text-gray-300 hover:underline">
          오늘의 예측 →
        </Link>
      </div>
    </div>
  );
}
