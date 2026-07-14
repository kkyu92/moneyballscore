import Link from 'next/link';
import {
  ELO_NEUTRAL,
  RECENT_FORM_GAMES,
  TEAM_STRENGTH_FORM_STRONG,
  TEAM_STRENGTH_FORM_WEAK,
} from '@moneyball/shared';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { TeamStrengthRow } from '@/lib/teams/buildTeamStrengthSnapshot';

interface Props {
  rows: TeamStrengthRow[];
}

function EloTag({ elo }: { elo: number }) {
  const delta = elo - ELO_NEUTRAL;
  const isStrong = delta > 0;
  const isNeutral = Math.abs(delta) <= 10;
  const sign = delta > 0 ? '+' : '';
  const colorClass = isNeutral
    ? 'text-gray-500 dark:text-gray-400'
    : isStrong
      ? 'text-brand-500 dark:text-brand-400'
      : 'text-gray-400 dark:text-gray-500';

  return (
    <span className={`font-mono text-xs tabular-nums ${colorClass}`}>
      Elo {Math.round(elo)}
      <span className="ml-0.5 text-[10px]">
        ({sign}
        {Math.round(delta)})
      </span>
    </span>
  );
}

function FormBar({ form }: { form: number }) {
  const pct = Math.round(form * 100);
  const isStrong = form >= TEAM_STRENGTH_FORM_STRONG;
  const isWeak = form <= TEAM_STRENGTH_FORM_WEAK;
  const barColor = isStrong
    ? 'bg-brand-500 dark:bg-brand-400'
    : isWeak
      ? 'bg-gray-300 dark:bg-gray-600'
      : 'bg-gray-400 dark:bg-gray-500';
  const textColor = isStrong
    ? 'text-brand-600 dark:text-brand-400'
    : isWeak
      ? 'text-gray-400 dark:text-gray-500'
      : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          최근 {RECENT_FORM_GAMES}경기
        </span>
        <span className={`text-xs font-semibold tabular-nums ${textColor}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function TeamStrengthGrid({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {rows.map((row, idx) => (
        <Link
          key={row.teamCode}
          href={`/teams/${row.teamCode}`}
          className="group rounded-xl border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] px-3 py-2.5 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 tabular-nums w-4 text-right">
              {idx + 1}
            </span>
            <TeamLogo team={row.teamCode} size={24} />
            <span className="text-sm font-semibold truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {row.teamName}
            </span>
          </div>
          <EloTag elo={row.elo} />
          <FormBar form={row.recentForm} />
        </Link>
      ))}
    </div>
  );
}
