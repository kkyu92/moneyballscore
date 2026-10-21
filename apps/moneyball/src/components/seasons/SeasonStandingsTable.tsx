'use client';

import Link from 'next/link';
import { shortTeamName } from '@moneyball/shared';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { TeamRecord } from '@/lib/seasons/buildSeasonSummary';
import { useSeasonStandingsSortMode } from './SeasonStandingsSortControl';

function formatWinPct(v: number): string {
  if (v === 0) return "-.---";
  return v.toFixed(3).replace(/^0/, "");
}

interface Props {
  teams: TeamRecord[];
}

export function SeasonStandingsTable({ teams }: Props) {
  const sort = useSeasonStandingsSortMode();

  const runDiffRankMap = new Map<string, number>();
  [...teams]
    .sort((a, b) => b.runDiff - a.runDiff)
    .forEach((t, i) => runDiffRankMap.set(t.code, i));
  const sampleRankMap = new Map<string, number>();
  [...teams]
    .sort((a, b) => b.games - a.games)
    .forEach((t, i) => sampleRankMap.set(t.code, i));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem_3rem_4rem_3.5rem_3.5rem_3.5rem] text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)] py-2 pr-1">
          <span className="text-center font-medium">#</span>
          <span className="font-medium">팀</span>
          <span className="text-right font-medium">경기</span>
          <span className="text-right font-medium">승</span>
          <span className="text-right font-medium">패</span>
          <span className="text-right font-medium">무</span>
          <span className="text-right font-medium">승률</span>
          <span className="text-right font-medium">득점</span>
          <span className="text-right font-medium">실점</span>
          <span className="text-right font-medium">득실</span>
        </div>
        <div data-season-standings-list>
          {teams.map((t, idx) => {
            const runDiffRank = runDiffRankMap.get(t.code);
            const sampleRank = sampleRankMap.get(t.code);
            const rank =
              sort === 'runDiff' && runDiffRank !== undefined
                ? runDiffRank + 1
                : sort === 'sample' && sampleRank !== undefined
                ? sampleRank + 1
                : idx + 1;
            return (
              <div
                key={t.code}
                data-rundiff-rank={runDiffRank}
                data-sample-rank={sampleRank}
                className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem_3rem_4rem_3.5rem_3.5rem_3.5rem] items-center border-b border-gray-100 dark:border-[var(--color-border)] py-2 pr-1 text-sm"
              >
                <span className="text-center text-gray-400 dark:text-gray-500 font-mono">{rank}</span>
                <span className="pr-3">
                  <Link href={`/teams/${t.code}`} className="flex items-center gap-2 hover:underline">
                    <TeamLogo team={t.code} size={24} />
                    <span className="font-medium whitespace-nowrap">{shortTeamName(t.code) ?? t.name}</span>
                  </Link>
                </span>
                <span className="text-right font-mono">{t.games}</span>
                <span className="text-right font-mono">{t.wins}</span>
                <span className="text-right font-mono">{t.losses}</span>
                <span className="text-right font-mono text-gray-500 dark:text-gray-400">{t.draws}</span>
                <span className="text-right font-mono font-semibold">{formatWinPct(t.winPct)}</span>
                <span className="text-right font-mono">{t.runsScored}</span>
                <span className="text-right font-mono">{t.runsAllowed}</span>
                <span className={`text-right font-mono ${t.runDiff > 0 ? "text-brand-600 dark:text-brand-400" : t.runDiff < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {t.runDiff > 0 ? "+" : ""}{t.runDiff}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
