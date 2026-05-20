'use client';

import { useSyncExternalStore } from 'react';

export type SeasonStandingsSortMode = 'winRate' | 'runDiff' | 'sample';

const STORAGE_SORT = 'mb_season_standings_sort_v1';

const LABELS: Record<SeasonStandingsSortMode, string> = {
  winRate: '승률순',
  runDiff: '득실순',
  sample: '표본순',
};

const ORDER: SeasonStandingsSortMode[] = ['winRate', 'runDiff', 'sample'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readSort(): SeasonStandingsSortMode {
  try {
    const raw = localStorage.getItem(STORAGE_SORT);
    if (raw === 'runDiff') return 'runDiff';
    if (raw === 'sample') return 'sample';
    return 'winRate';
  } catch {
    return 'winRate';
  }
}

function getServerSnapshot(): SeasonStandingsSortMode {
  return 'winRate';
}

function writeSort(value: SeasonStandingsSortMode): void {
  try {
    localStorage.setItem(STORAGE_SORT, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_SORT }));
    }
  } catch {
    // ignore
  }
}

const RUNDIFF_ORDER_CSS = Array.from(
  { length: 12 },
  (_, i) => `[data-season-standings-list] [data-rundiff-rank="${i}"]{order:${i};}`,
).join('');

const SAMPLE_ORDER_CSS = Array.from(
  { length: 12 },
  (_, i) => `[data-season-standings-list] [data-sample-rank="${i}"]{order:${i};}`,
).join('');

export function SeasonStandingsSortControl() {
  const sort = useSyncExternalStore(subscribe, readSort, getServerSnapshot);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {sort === 'runDiff' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-season-standings-list]{display:flex;flex-direction:column;}${RUNDIFF_ORDER_CSS}`,
          }}
        />
      )}
      {sort === 'sample' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-season-standings-list]{display:flex;flex-direction:column;}${SAMPLE_ORDER_CSS}`,
          }}
        />
      )}
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
  );
}
