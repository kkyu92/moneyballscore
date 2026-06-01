import Link from "next/link";
import type { Metadata } from "next";
import { MLB_TEAMS, type MlbTeamCode, mlbShortTeamName } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "MLB Statcast 팀을 찾을 수 없음",
  description: "요청하신 팀 코드가 MLB 30팀에 존재하지 않습니다.",
  robots: { index: false, follow: false },
};

const TEAM_CODES = Object.keys(MLB_TEAMS) as MlbTeamCode[];

export default function MlbPlayersDetailNotFound() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">MLB Statcast 팀을 찾을 수 없습니다</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          요청하신 팀 코드가 MLB 30팀에 존재하지 않습니다.
          <br className="hidden sm:block" />
          아래에서 원하는 팀의 Statcast deep-dive 를 선택하세요.
        </p>
      </header>

      <nav aria-label="MLB 30팀 Statcast" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">MLB 30팀</h2>
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {TEAM_CODES.map((code) => (
            <li key={code}>
              <Link
                href={`/mlb/players/${code}`}
                className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {mlbShortTeamName(code)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/mlb/players" className="text-brand-600 dark:text-brand-400 hover:underline">
          MLB Statcast hub →
        </Link>
        <Link href="/mlb" className="text-gray-600 dark:text-gray-300 hover:underline">
          MLB 오늘 예측 →
        </Link>
      </div>
    </div>
  );
}
