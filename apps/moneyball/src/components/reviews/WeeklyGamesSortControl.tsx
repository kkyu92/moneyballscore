'use client';

import { useSyncExternalStore } from 'react';

type SortMode = 'date' | 'confidence';

const STORAGE_SORT = 'mb_weekly_games_sort_v1';

const LABELS: Record<SortMode, string> = {
  date: '날짜순',
  confidence: '확신도순',
};

// wave-660 (cycle 2355, en/mlb/reviews/weekly 미러): locale prop 추가 — 기본값 'ko' 라
// 기존 KO callsite 변경 없음 (localStorage key 는 리그/locale 무관 공용 그대로 유지).
const LABELS_EN: Record<SortMode, string> = {
  date: 'By date',
  confidence: 'By confidence',
};

const ORDER: SortMode[] = ['date', 'confidence'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readSort(): SortMode {
  try {
    const raw = localStorage.getItem(STORAGE_SORT);
    if (raw === 'confidence') return 'confidence';
    return 'date';
  } catch {
    return 'date';
  }
}

function getServerSnapshot(): SortMode {
  return 'date';
}

function writeSort(value: SortMode): void {
  try {
    localStorage.setItem(STORAGE_SORT, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_SORT }));
    }
  } catch {
    // ignore
  }
}

export function WeeklyGamesSortControl({ locale = 'ko' }: { locale?: 'ko' | 'en' } = {}) {
  const sort = useSyncExternalStore(subscribe, readSort, getServerSnapshot);
  const labels = locale === 'en' ? LABELS_EN : LABELS;

  return (
    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700/40 bg-gray-50 dark:bg-[var(--color-surface)]">
      {sort === 'confidence' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-weekly-games]{display:flex;flex-direction:column;}[data-weekly-games] > *{order:var(--mb-weekly-game-order,0);}`,
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-1">
          {locale === 'en' ? 'Sort' : '정렬'}
        </span>
        {ORDER.map((key) => {
          const active = sort === key;
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
              {labels[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
