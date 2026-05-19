'use client';

import { useSyncExternalStore } from 'react';

type CloseFilter = 'all' | 'close';

const STORAGE_FILTER = 'mb_matchup_close_v1';

interface Props {
  counts: {
    all: number;
    close: number;
  };
}

const LABELS: Record<CloseFilter, string> = {
  all: '전체',
  close: '박빙만',
};

const ORDER: CloseFilter[] = ['all', 'close'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readFilter(): CloseFilter {
  try {
    const raw = localStorage.getItem(STORAGE_FILTER);
    if (raw === 'close') return 'close';
    return 'all';
  } catch {
    return 'all';
  }
}

function getServerSnapshot(): CloseFilter {
  return 'all';
}

function writeFilter(value: CloseFilter): void {
  try {
    localStorage.setItem(STORAGE_FILTER, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_FILTER }));
    }
  } catch {
    // ignore
  }
}

export function MatchupGamesCloseFilter({ counts }: Props) {
  const filter = useSyncExternalStore(subscribe, readFilter, getServerSnapshot);

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3">
      {filter === 'close' && (
        <style
          dangerouslySetInnerHTML={{
            __html:
              '[data-matchup-games] tr[data-margin-close="false"]{display:none;}' +
              '[data-matchup-section]:not(:has(tr[data-margin-close="true"])){display:none;}',
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-1">
          접전
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
