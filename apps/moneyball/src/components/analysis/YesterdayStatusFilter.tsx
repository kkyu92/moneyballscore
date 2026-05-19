'use client';

import { useSyncExternalStore } from 'react';

type StatusFilter = 'all' | 'correct' | 'wrong' | 'pending';

const STORAGE_FILTER = 'mb_analysis_yesterday_status_v1';

interface Props {
  counts: {
    all: number;
    correct: number;
    wrong: number;
    pending: number;
  };
}

const LABELS: Record<StatusFilter, string> = {
  all: '전체',
  correct: '적중',
  wrong: '실패',
  pending: '대기',
};

const ORDER: StatusFilter[] = ['all', 'correct', 'wrong', 'pending'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readFilter(): StatusFilter {
  try {
    const raw = localStorage.getItem(STORAGE_FILTER);
    if (raw === 'correct' || raw === 'wrong' || raw === 'pending') return raw;
    return 'all';
  } catch {
    return 'all';
  }
}

function getServerSnapshot(): StatusFilter {
  return 'all';
}

function writeFilter(value: StatusFilter): void {
  try {
    localStorage.setItem(STORAGE_FILTER, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_FILTER }));
    }
  } catch {
    // ignore
  }
}

function buildHideSelector(filter: StatusFilter): string {
  if (filter === 'all') return '';
  const others = (['correct', 'wrong', 'pending'] as const).filter((s) => s !== filter);
  return others.map((s) => `[data-yesterday-status="${s}"]`).join(',');
}

export function YesterdayStatusFilter({ counts }: Props) {
  const filter = useSyncExternalStore(subscribe, readFilter, getServerSnapshot);
  const hideSelector = buildHideSelector(filter);

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3 mb-3">
      {hideSelector && (
        <style
          dangerouslySetInnerHTML={{
            __html: `${hideSelector}{display:none!important;}`,
          }}
        />
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
