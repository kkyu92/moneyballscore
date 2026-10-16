'use client';

import Link from 'next/link';
import { shortTeamName, SMALL_SAMPLE_N, type TeamCode } from '@moneyball/shared';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { useTeamAccuracySortMode } from './TeamAccuracySortControl';

interface TeamAccuracyRow {
  teamCode: TeamCode;
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null;
}

interface Props {
  rows: TeamAccuracyRow[];
}

export function TeamAccuracyList({ rows }: Props) {
  const sort = useTeamAccuracySortMode();

  const sampleRankMap = new Map<string, number>();
  [...rows]
    .sort((a, b) => b.verifiedN - a.verifiedN)
    .forEach((row, idx) => sampleRankMap.set(row.teamCode, idx));

  return (
    <ul className="space-y-2" data-team-accuracy-list>
      {rows.map((row, i) => {
        const pct = row.accuracyRate != null ? Math.round(row.accuracyRate * 100) : null;
        const barWidth = pct ?? 0;
        const sampleRank = sampleRankMap.get(row.teamCode) ?? 0;
        const rank = sort === 'sample' ? sampleRank + 1 : i + 1;
        const isReliable = row.verifiedN >= SMALL_SAMPLE_N;
        return (
          <li
            key={row.teamCode}
            className="flex items-center gap-3"
            data-accuracy-rank={i}
            data-sample-rank={sampleRank}
          >
            <span className="w-5 text-xs text-gray-400 dark:text-gray-500 tabular-nums text-right shrink-0">
              {rank}
            </span>
            <Link
              href={`/teams/${row.teamCode}`}
              className="flex items-center gap-2 min-w-[6rem] hover:opacity-80 transition-opacity shrink-0"
            >
              <TeamLogo team={row.teamCode} size={20} />
              <span className="text-sm font-medium whitespace-nowrap">{shortTeamName(row.teamCode)}</span>
            </Link>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-gray-100 dark:bg-[var(--color-surface-card)] rounded-full h-1.5">
                <div
                  className="bg-brand-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span
                className={`text-sm font-semibold tabular-nums w-10 text-right ${
                  isReliable ? "" : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {pct != null ? `${pct}%` : "-"}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0">
              {row.correctN}/{row.verifiedN}
              {!isReliable && row.verifiedN > 0 && <span className="ml-1">참고용</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
