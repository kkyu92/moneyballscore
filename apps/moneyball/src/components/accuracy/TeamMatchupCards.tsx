import { shortTeamName, KBO_TEAMS, type TeamCode } from '@moneyball/shared';
import type { MatchupRow, TeamHomeAwayRow, TeamAccuracyRow } from '@/lib/standings/buildTeamAccuracy';

interface Props {
  matchups: MatchupRow[];
  homeAway: TeamHomeAwayRow[];
  teamAccuracy: TeamAccuracyRow[];
}

function fmtPct(v: number | null): string {
  return v !== null ? `${(v * 100).toFixed(0)}%` : '—';
}

export function TeamMatchupCards({ matchups, homeAway, teamAccuracy }: Props) {
  const teamCodes = Object.keys(KBO_TEAMS) as TeamCode[];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {teamCodes.map((teamCode) => {
        const overall = teamAccuracy.find((t) => t.teamCode === teamCode);
        const ha = homeAway.find((t) => t.teamCode === teamCode);
        const opponents = matchups
          .filter((m) => m.teamCode === teamCode && m.n > 0)
          .sort((a, b) => (b.accuracyRate ?? -1) - (a.accuracyRate ?? -1));

        return (
          <div
            key={teamCode}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 space-y-3"
          >
            {/* 헤더 */}
            <div className="flex items-baseline justify-between gap-1">
              <span className="font-bold text-sm">{shortTeamName(teamCode)}</span>
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                {overall ? fmtPct(overall.accuracyRate) : '—'}
              </span>
            </div>

            {/* 홈/원정 split */}
            {ha && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>홈</span>
                  <span className="font-mono">
                    {fmtPct(ha.homeAccuracy)}{' '}
                    <span className="text-gray-400 dark:text-gray-500">({ha.homeN})</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>원정</span>
                  <span className="font-mono">
                    {fmtPct(ha.awayAccuracy)}{' '}
                    <span className="text-gray-400 dark:text-gray-500">({ha.awayN})</span>
                  </span>
                </div>
              </div>
            )}

            {/* 상대팀 목록 */}
            {opponents.length > 0 && (
              <div className="space-y-0.5 border-t border-gray-100 dark:border-[var(--color-border)] pt-2">
                {opponents.map((m) => (
                  <div
                    key={m.opponentCode}
                    className={`flex justify-between text-[11px] ${m.n === 1 ? 'opacity-50' : ''}`}
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      vs {shortTeamName(m.opponentCode)}
                    </span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      {m.correct}/{m.n}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
