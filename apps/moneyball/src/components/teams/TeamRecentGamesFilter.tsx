'use client';

import { useSyncExternalStore } from 'react';

type LocationFilter = 'all' | 'home' | 'away';
type ResultFilter = 'all' | 'correct' | 'incorrect';

const STORAGE_LOCATION = 'mb_team_recent_location_v1';
const STORAGE_RESULT = 'mb_team_recent_result_v1';

interface Props {
  counts: {
    location: { all: number; home: number; away: number };
    result: { all: number; correct: number; incorrect: number };
  };
}

const LOCATION_LABELS: Record<LocationFilter, string> = {
  all: '전체',
  home: '홈',
  away: '원정',
};

const RESULT_LABELS: Record<ResultFilter, string> = {
  all: '전체',
  correct: '적중',
  incorrect: '미적중',
};

const LOCATION_ORDER: LocationFilter[] = ['all', 'home', 'away'];
const RESULT_ORDER: ResultFilter[] = ['all', 'correct', 'incorrect'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readLocation(): LocationFilter {
  try {
    const raw = localStorage.getItem(STORAGE_LOCATION);
    if (raw === 'home' || raw === 'away') return raw;
    return 'all';
  } catch {
    return 'all';
  }
}

function readResult(): ResultFilter {
  try {
    const raw = localStorage.getItem(STORAGE_RESULT);
    if (raw === 'correct' || raw === 'incorrect') return raw;
    return 'all';
  } catch {
    return 'all';
  }
}

function getLocationServerSnapshot(): LocationFilter {
  return 'all';
}

function getResultServerSnapshot(): ResultFilter {
  return 'all';
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key }));
    }
  } catch {
    // ignore
  }
}

export function TeamRecentGamesFilter({ counts }: Props) {
  const location = useSyncExternalStore(
    subscribe,
    readLocation,
    getLocationServerSnapshot,
  );
  const result = useSyncExternalStore(
    subscribe,
    readResult,
    getResultServerSnapshot,
  );

  const hideSelectors: string[] = [];
  if (location === 'home') {
    hideSelectors.push('[data-team-game-location="away"]');
  } else if (location === 'away') {
    hideSelectors.push('[data-team-game-location="home"]');
  }
  if (result === 'correct') {
    hideSelectors.push('[data-team-game-result="incorrect"]');
    hideSelectors.push('[data-team-game-result="pending"]');
  } else if (result === 'incorrect') {
    hideSelectors.push('[data-team-game-result="correct"]');
    hideSelectors.push('[data-team-game-result="pending"]');
  }
  const hideCss = hideSelectors.length
    ? `${hideSelectors.join(',')}{display:none!important;}`
    : '';

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3 space-y-2">
      {hideCss && (
        <style dangerouslySetInnerHTML={{ __html: hideCss }} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-1">
          위치
        </span>
        {LOCATION_ORDER.map((key) => {
          const active = location === key;
          const empty = key !== 'all' && counts.location[key] === 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => writeStorage(STORAGE_LOCATION, key)}
              aria-pressed={active}
              disabled={empty}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors min-h-[32px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? 'bg-brand-600 text-white border-transparent'
                  : 'text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500'
              }`}
            >
              {LOCATION_LABELS[key]}{' '}
              <span className="opacity-75">({counts.location[key]})</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-1">
          결과
        </span>
        {RESULT_ORDER.map((key) => {
          const active = result === key;
          const empty = key !== 'all' && counts.result[key] === 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => writeStorage(STORAGE_RESULT, key)}
              aria-pressed={active}
              disabled={empty}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors min-h-[32px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? 'bg-brand-600 text-white border-transparent'
                  : 'text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500'
              }`}
            >
              {RESULT_LABELS[key]}{' '}
              <span className="opacity-75">({counts.result[key]})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
