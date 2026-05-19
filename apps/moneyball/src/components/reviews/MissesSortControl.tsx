'use client';

import { useSyncExternalStore } from 'react';

type SortMode = 'confidence' | 'recent';

const STORAGE_SORT = 'mb_misses_sort_v1';

const LABELS: Record<SortMode, string> = {
  confidence: '확신도순',
  recent: '최신순',
};

const ORDER: SortMode[] = ['confidence', 'recent'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readSort(): SortMode {
  try {
    const raw = localStorage.getItem(STORAGE_SORT);
    if (raw === 'recent') return 'recent';
    return 'confidence';
  } catch {
    return 'confidence';
  }
}

function getServerSnapshot(): SortMode {
  return 'confidence';
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

export function MissesSortControl() {
  const sort = useSyncExternalStore(subscribe, readSort, getServerSnapshot);

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3">
      {sort === 'recent' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-misses-list]{display:flex;flex-direction:column;}[data-misses-list] > *{order:var(--mb-miss-date-order,0);}`,
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
