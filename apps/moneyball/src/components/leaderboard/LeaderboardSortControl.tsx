'use client';

import { useSyncExternalStore } from 'react';

export type LeaderboardSortMode = 'accuracy' | 'streak' | 'sample';

const STORAGE_SORT = 'mb_leaderboard_sort_v1';

const LABELS: Record<LeaderboardSortMode, string> = {
  accuracy: '정확도순',
  streak: '연속순',
  sample: '표본순',
};

const ORDER: LeaderboardSortMode[] = ['accuracy', 'streak', 'sample'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readSort(): LeaderboardSortMode {
  try {
    const raw = localStorage.getItem(STORAGE_SORT);
    if (raw === 'streak') return 'streak';
    if (raw === 'sample') return 'sample';
    return 'accuracy';
  } catch {
    return 'accuracy';
  }
}

function getServerSnapshot(): LeaderboardSortMode {
  return 'accuracy';
}

function writeSort(value: LeaderboardSortMode): void {
  try {
    localStorage.setItem(STORAGE_SORT, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_SORT }));
    }
  } catch {
    // ignore
  }
}

const STREAK_ORDER_CSS = Array.from(
  { length: 50 },
  (_, i) => `[data-leaderboard-list] [data-streak-rank="${i}"]{order:${i};}`,
).join('');

const SAMPLE_ORDER_CSS = Array.from(
  { length: 50 },
  (_, i) => `[data-leaderboard-list] [data-sample-rank="${i}"]{order:${i};}`,
).join('');

interface Props {
  streakEnabled: boolean;
}

export function LeaderboardSortControl({ streakEnabled }: Props) {
  const sort = useSyncExternalStore(subscribe, readSort, getServerSnapshot);

  const effectiveSort: LeaderboardSortMode =
    sort === 'streak' && !streakEnabled ? 'accuracy' : sort;

  const visibleOrder: LeaderboardSortMode[] = streakEnabled
    ? ORDER
    : ORDER.filter((m) => m !== 'streak');

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3">
      {effectiveSort === 'streak' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-leaderboard-list]{display:flex;flex-direction:column;}${STREAK_ORDER_CSS}`,
          }}
        />
      )}
      {effectiveSort === 'sample' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-leaderboard-list]{display:flex;flex-direction:column;}${SAMPLE_ORDER_CSS}`,
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-1">
          정렬
        </span>
        {visibleOrder.map((key) => {
          const active = effectiveSort === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => writeSort(key)}
              aria-pressed={active}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors min-h-[32px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                active
                  ? 'bg-brand-600 text-white border-transparent'
                  : 'text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500'
              }`}
            >
              {LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
