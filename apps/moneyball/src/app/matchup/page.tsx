import type { Metadata } from "next";
import Link from "next/link";
import { KBO_TEAMS, type TeamCode, shortTeamName } from '@moneyball/shared';
import { canonicalPair } from "@/lib/matchup/canonicalPair";

export const metadata: Metadata = {
  title: "팀 간 매치업",
  description:
    "KBO 10팀의 45가지 맞대결 조합별 상대전적 · AI 예측 성과 허브.",
};

const TEAMS: TeamCode[] = [
  "HT",
  "HH",
  "KT",
  "LG",
  "LT",
  "NC",
  "OB",
  "SK",
  "SS",
  "WO",
];

export default function MatchupIndexPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">팀 간 매치업</h1>
        <p className="text-gray-500 dark:text-gray-400">
          KBO 10팀 × 45가지 맞대결 조합. 상대전적과 AI 예측 적중률을 조합별로
          확인하세요.
        </p>
      </header>

      <section
        aria-labelledby="matchup-grid-title"
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 overflow-x-auto"
      >
        <h2 id="matchup-grid-title" className="sr-only">
          팀 간 매치업 격자
        </h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-xs text-gray-400 dark:text-gray-500"></th>
              {TEAMS.map((code) => (
                <th
                  key={code}
                  className="p-2 text-xs font-mono text-gray-500 dark:text-gray-400"
                  title={KBO_TEAMS[code].name}
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
                  className="p-2 text-left text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800"
                  title={KBO_TEAMS[row].name}
                >
                  {row}
                </th>
                {TEAMS.map((col) => {
                  if (row === col) {
                    return (
                      <td
                        key={col}
                        className="p-2 text-center text-gray-300 dark:text-gray-700"
                      >
                        —
                      </td>
                    );
                  }
                  const pair = canonicalPair(row, col);
                  if (!pair) return <td key={col}></td>;
                  return (
                    <td key={col} className="p-1 text-center">
                      <Link
                        href={pair.path}
                        className="inline-block text-xs px-2 py-1 rounded hover:bg-brand-500/10 hover:text-brand-500 transition-colors"
                        aria-label={`${KBO_TEAMS[row].name} vs ${KBO_TEAMS[col].name}`}
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

      <section aria-labelledby="matchup-teams-title" className="space-y-3">
        <h2 id="matchup-teams-title" className="text-xl font-bold">
          팀별 매치업 보기
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {TEAMS.map((code) => (
            <Link
              key={code}
              href={`/teams/${code}`}
              className="bg-white dark:bg-[var(--color-surface-card)] rounded-lg border border-gray-200 dark:border-[var(--color-border)] p-3 text-center hover:shadow-md transition-shadow"
            >
              <span
                aria-hidden
                className="inline-block w-3 h-3 rounded-full mr-1 align-middle"
                style={{ backgroundColor: KBO_TEAMS[code].color }}
              />
              <span className="text-sm font-medium">
                {shortTeamName(code)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
