'use client';

import { useSyncExternalStore } from 'react';

type PickStatusFilter = 'all' | 'correct' | 'incorrect' | 'pending';

const STORAGE_KEY = 'mb_picks_status_v1';

interface Props {
  counts: {
    all: number;
    correct: number;
    incorrect: number;
    pending: number;
  };
}

const LABELS: Record<PickStatusFilter, string> = {
  all: '전체',
  correct: '적중',
  incorrect: '실패',
  pending: '대기',
};

const ORDER: PickStatusFilter[] = ['all', 'correct', 'incorrect', 'pending'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readFilter(): PickStatusFilter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'correct' || raw === 'incorrect' || raw === 'pending') return raw;
    return 'all';
  } catch {
    return 'all';
  }
}

function getServerSnapshot(): PickStatusFilter {
  return 'all';
}

function writeFilter(value: PickStatusFilter): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    }
  } catch {
    // ignore
  }
}

export function PicksStatusFilter({ counts }: Props) {
  const filter = useSyncExternalStore(subscribe, readFilter, getServerSnapshot);

  const hideSelectors: string[] = [];
  if (filter === 'correct') {
    hideSelectors.push('[data-pick-status="incorrect"]', '[data-pick-status="pending"]');
  } else if (filter === 'incorrect') {
    hideSelectors.push('[data-pick-status="correct"]', '[data-pick-status="pending"]');
  } else if (filter === 'pending') {
    hideSelectors.push('[data-pick-status="correct"]', '[data-pick-status="incorrect"]');
  }
  const hideRule = hideSelectors.length > 0
    ? `${hideSelectors.join(',')}{display:none!important;}`
    : '';

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3">
      {hideRule && (
        <style dangerouslySetInnerHTML={{ __html: hideRule }} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-1">
          결과
        </span>
        {ORDER.map((key) => {
          const active = filter === key;
          const empty = key !== 'all' && counts[key] === 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => writeFilter(key)}
              aria-pressed={active}
              disabled={empty}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors min-h-[32px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? 'bg-brand-600 text-white border-transparent'
                  : 'text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500'
              }`}
            >
              {LABELS[key]}{' '}
              <span className="opacity-75">({counts[key]})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
