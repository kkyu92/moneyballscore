import Link from 'next/link';
import { TEAM_STRENGTH_FORM_STRONG, TEAM_STRENGTH_FORM_WEAK } from '@moneyball/shared';
import { MlbTeamLogo } from '@/components/shared/MlbTeamLogo';
import type { MlbTeamStrengthRow } from '@/lib/mlb/buildMlbTeamStrengthSnapshot';

interface Props {
  rows: MlbTeamStrengthRow[];
  /** en/mlb/analysis(cycle 2338, explore-idea heavy) 대응 — href 프리픽스 + 승/패 문구 전환. */
  locale?: 'ko' | 'en';
}

function StreakTag({ streak, locale }: { streak: MlbTeamStrengthRow['streak']; locale: 'ko' | 'en' }) {
  if (!streak) return null;
  const isWin = streak.result === 'win';
  return (
    <span
      className={`font-mono text-xs tabular-nums ${
        isWin ? 'text-brand-500 dark:text-brand-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      {locale === 'en'
        ? `${streak.length}${isWin ? 'W' : 'L'} streak`
        : `${streak.length}${isWin ? '연승' : '연패'}`}
    </span>
  );
}

function RecentRecordBar({ record, locale }: { record: MlbTeamStrengthRow['recentRecord']; locale: 'ko' | 'en' }) {
  const pct = Math.round((record.wins / record.sampleSize) * 100);
  const winRate = record.wins / record.sampleSize;
  const isStrong = winRate >= TEAM_STRENGTH_FORM_STRONG;
  const isWeak = winRate <= TEAM_STRENGTH_FORM_WEAK;
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
          {locale === 'en'
            ? `Last ${record.sampleSize}: ${record.wins}-${record.losses}`
            : `최근 ${record.sampleSize}경기 ${record.wins}승 ${record.losses}패`}
        </span>
        <span className={`text-xs font-semibold tabular-nums ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * KBO TeamStrengthGrid 의 MLB 대체 설계(plan #28 Phase 2 carry-over) — Elo/모델 recent_form
 * 은 MLB 쪽 데이터 미구현(placeholder/전량 null)이라 포팅 불가, 대신 mlb_schedule 실제
 * 완료 경기 기준 "진짜 전적"(최근 N경기 승패 + 연승/연패)으로 대체.
 */
export function MlbTeamStrengthGrid({ rows, locale = 'ko' }: Props) {
  if (rows.length === 0) return null;
  const teamHrefPrefix = locale === 'en' ? '/en/mlb/team' : '/mlb/team';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {rows.map((row, idx) => (
        <Link
          key={row.teamCode}
          href={`${teamHrefPrefix}/${row.teamCode}`}
          className="group rounded-xl border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] px-3 py-2.5 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 tabular-nums w-4 text-right">
              {idx + 1}
            </span>
            <MlbTeamLogo team={row.teamCode} size={24} />
            <span className="text-sm font-semibold truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {row.teamName}
            </span>
          </div>
          <StreakTag streak={row.streak} locale={locale} />
          <RecentRecordBar record={row.recentRecord} locale={locale} />
        </Link>
      ))}
    </div>
  );
}
