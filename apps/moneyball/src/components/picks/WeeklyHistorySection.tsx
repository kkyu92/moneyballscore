'use client';

import { useState } from 'react';
import type { WeeklyGroup, PickEntry } from '@/lib/picks/buildPicksStats';

function PastPickRow({ entry }: { entry: PickEntry }) {
  const dateStr = entry.game_date.slice(5); // "MM-DD"
  const myLabel = entry.myPick === 'home' ? entry.homeTeamName : entry.awayTeamName;

  let resultEl: React.ReactNode = (
    <span className="text-xs text-gray-400 dark:text-gray-500">대기중</span>
  );
  if (entry.isResolved) {
    const scoreStr = `${entry.homeScore ?? '-'}:${entry.awayScore ?? '-'}`;
    resultEl = (
      <span className={`text-xs font-semibold ${
        entry.myIsCorrect
          ? 'text-brand-600 dark:text-brand-400'
          : 'text-red-600 dark:text-red-400'
      }`}>
        {entry.myIsCorrect ? '✓' : '✗'} {scoreStr}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-[var(--color-border)] last:border-0">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-10 shrink-0 tabular-nums">{dateStr}</span>
      <span className="flex-1 text-sm truncate min-w-0">
        {entry.awayTeamName ?? '?'} @ {entry.homeTeamName ?? '?'}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-300 shrink-0">
        <span className="font-medium">{myLabel ?? entry.myPick}</span>
      </span>
      <span className="w-16 text-right shrink-0">{resultEl}</span>
    </div>
  );
}

interface Props {
  groups: WeeklyGroup[];
}

export function WeeklyHistorySection({ groups }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  // 이번 주(첫 번째 그룹) 제외 — WeeklyPicksSummary가 이미 표시
  const pastGroups = groups.slice(1);
  if (pastGroups.length === 0) return null;

  const sectionLabel = pastGroups.length === 1 ? '지난 주 기록' : '이전 주 기록';

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">{sectionLabel}</h2>
      {pastGroups.map((group, idx) => {
        const { stats, entries } = group;
        const myRatePct = stats.myRate !== null ? Math.round(stats.myRate * 100) : null;
        const beatAI =
          myRatePct !== null &&
          stats.aiRate !== null &&
          myRatePct > Math.round(stats.aiRate * 100);
        const isOpen = openIdx === idx;

        return (
          <div
            key={group.weekStart}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-hidden"
          >
            <button
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{stats.weekLabel}</span>
                {beatAI && (
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white shrink-0">
                    AI 격파
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {stats.myCorrect}/{stats.resolved}
                  {myRatePct !== null ? ` (${myRatePct}%)` : ''}
                </span>
                <span className="text-xs text-gray-400" aria-hidden="true">
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-3 border-t border-gray-100 dark:border-[var(--color-border)]">
                {entries.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-2">픽 기록 없음</p>
                ) : (
                  entries.map((entry) => (
                    <PastPickRow key={entry.gameId} entry={entry} />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
