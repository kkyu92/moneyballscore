'use client';

import { useSyncExternalStore } from 'react';

type SortMode = 'desc' | 'asc';

const STORAGE_SORT = 'mb_picks_sort_v1';

const LABELS: Record<SortMode, string> = {
  desc: '최신순',
  asc: '오래된 순',
};

const ORDER: SortMode[] = ['desc', 'asc'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readSort(): SortMode {
  try {
    const raw = localStorage.getItem(STORAGE_SORT);
    if (raw === 'asc') return 'asc';
    return 'desc';
  } catch {
    return 'desc';
  }
}

function getServerSnapshot(): SortMode {
  return 'desc';
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

export function PicksSortControl() {
  const sort = useSyncExternalStore(subscribe, readSort, getServerSnapshot);

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3">
      {sort === 'asc' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-picks-list]{display:flex;flex-direction:column-reverse;}`,
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-1">
          정렬
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
              {LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
