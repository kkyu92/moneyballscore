'use client';

import type { WeeklyStats } from '@/lib/picks/buildPicksStats';

interface Props {
  weekly: WeeklyStats;
  currentStreak: number;
}

export function WeeklyPicksSummary({ weekly, currentStreak }: Props) {
  const myRatePct = weekly.myRate !== null ? Math.round(weekly.myRate * 100) : null;
  const aiRatePct = weekly.aiRate !== null ? Math.round(weekly.aiRate * 100) : null;

  const beatAI = myRatePct !== null && aiRatePct !== null && myRatePct > aiRatePct;
  const hasStreak = currentStreak >= 3;
  const hasBadge = beatAI || hasStreak;

  return (
    <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-brand-800 dark:text-brand-200">이번 주 성적</h2>
        <span className="text-xs text-brand-600 dark:text-brand-400">{weekly.weekLabel}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">내 성적</p>
          <p className="text-xl font-bold tabular-nums">
            {weekly.myCorrect}/{weekly.resolved}
            {myRatePct !== null && (
              <span className="text-sm font-normal text-gray-400 dark:text-gray-400">
                {' '}({myRatePct}%)
              </span>
            )}
          </p>
          {weekly.total > weekly.resolved && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              +{weekly.total - weekly.resolved}경기 대기
            </p>
          )}
        </div>

        <div className="w-px h-10 bg-brand-200 dark:bg-brand-800" aria-hidden="true" />

        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">AI 성적</p>
          <p className="text-xl font-bold tabular-nums text-gray-600 dark:text-gray-300">
            {weekly.aiCorrect}/{weekly.aiResolved}
            {aiRatePct !== null && (
              <span className="text-sm font-normal text-gray-400 dark:text-gray-400">
                {' '}({aiRatePct}%)
              </span>
            )}
          </p>
        </div>
      </div>

      {hasBadge && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-brand-200 dark:border-brand-800">
          {beatAI && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              🏆 AI 격파!
            </span>
          )}
          {hasStreak && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
              🔥 {currentStreak}연속 정답
            </span>
          )}
        </div>
      )}
    </div>
  );
}
