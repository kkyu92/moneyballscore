import type { Metadata } from "next";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_TEAM_COUNT,
  MLB_HEAD_TO_HEAD_PAIRS,
  SITE_URL,
  type MlbTeamCode,
} from "@moneyball/shared";
import { mlbCanonicalPair } from "@/lib/mlb/mlbCanonicalPair";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbTeamLogo } from "@/components/shared/MlbTeamLogo";

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export const metadata: Metadata = {
  title: `MLB 팀 간 매치업 — ${MLB_HEAD_TO_HEAD_PAIRS}가지 조합 | MoneyBall Score`,
  description: `MLB ${MLB_TEAM_COUNT}팀의 ${MLB_HEAD_TO_HEAD_PAIRS}가지 맞대결 조합별 AI 예측 성과 허브.`,
  alternates: {
    canonical: `${SITE_URL}/mlb/matchup`,
    languages: {
      en: `${SITE_URL}/en/mlb/matchup`,
      ko: `${SITE_URL}/mlb/matchup`,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: `${SITE_URL}/mlb/matchup`,
    siteName: "MoneyBall Score",
    title: "MLB 팀 간 매치업 | MoneyBall Score",
    description: `MLB ${MLB_TEAM_COUNT}팀의 ${MLB_HEAD_TO_HEAD_PAIRS}가지 맞대결 조합별 AI 예측 성과 허브.`,
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB 팀 간 매치업 | MoneyBall Score",
    description: `MLB ${MLB_TEAM_COUNT}팀 × ${MLB_HEAD_TO_HEAD_PAIRS}가지 맞대결 AI 예측 적중률.`,
  },
};

const TEAMS = Object.keys(MLB_TEAMS) as MlbTeamCode[];

export default function MlbMatchupIndexPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/mlb", label: "MLB 분석" }, { label: "매치업" }]} />
      <header className="bg-gradient-to-r from-brand-800 to-brand-700 rounded-2xl p-6 md:p-8 text-white space-y-1">
        <h1 className="text-2xl font-bold">MLB 팀 간 매치업</h1>
        <p className="text-sm text-white/70">
          MLB {MLB_TEAM_COUNT}팀 × {MLB_HEAD_TO_HEAD_PAIRS}가지 맞대결 조합. 상대전적과 AI 예측 적중률을 조합별로 확인하세요.
        </p>
      </header>

      <section
        aria-labelledby="mlb-matchup-grid-title"
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 overflow-x-auto"
      >
        <h2 id="mlb-matchup-grid-title" className="sr-only">
          MLB 팀 간 매치업 격자
        </h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-xs text-gray-400 dark:text-gray-500"></th>
              {TEAMS.map((code) => (
                <th
                  key={code}
                  className="p-2 text-xs font-mono text-gray-500 dark:text-gray-400"
                  title={MLB_TEAMS[code].name}
                >
                  {code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TEAMS.map((row) => (
              <tr key={row}>
                <th
                  className="p-2 text-left text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[var(--color-surface-card)]"
                  title={MLB_TEAMS[row].name}
                >
                  {row}
                </th>
                {TEAMS.map((col) => {
                  if (row === col) {
                    return (
                      <td key={col} className="p-2 text-center text-gray-300 dark:text-gray-700">
                        —
                      </td>
                    );
                  }
                  const pair = mlbCanonicalPair(row, col);
                  if (!pair) return <td key={col}></td>;
                  return (
                    <td key={col} className="p-1 text-center">
                      <Link
                        href={pair.path}
                        className="inline-block text-xs px-2 py-1 rounded hover:bg-brand-500/10 hover:text-brand-500 transition-colors"
                        aria-label={`${MLB_TEAMS[row].name} vs ${MLB_TEAMS[col].name}`}
                      >
                        →
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="mlb-matchup-teams-title" className="space-y-3">
        <h2 id="mlb-matchup-teams-title" className="text-xl font-bold">
          팀별 매치업 보기
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {TEAMS.map((code) => {
            const team = MLB_TEAMS[code];
            return (
              <Link
                key={code}
                href={`/mlb/team/${code}`}
                className="bg-white dark:bg-[var(--color-surface-card)] rounded-lg border border-gray-200 dark:border-[var(--color-border)] p-3 flex items-center justify-center gap-2 hover:shadow-md transition-shadow"
              >
                <MlbTeamLogo team={code} size={16} className="rounded-full shrink-0" />
                <span className="text-sm font-medium">{team.shortName}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
