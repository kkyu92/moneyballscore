'use client';

import { useSyncExternalStore } from 'react';
import { WINNER_TIER_LABEL, pickTierEmoji, type WinnerConfidenceTier } from '@moneyball/shared';

type TierFilter = 'all' | WinnerConfidenceTier;

const STORAGE_TIER = 'mb_predictions_tier_v1';

interface Props {
  counts: {
    all: number;
    confident: number;
    lean: number;
    tossup: number;
  };
}

const ORDER: TierFilter[] = ['all', 'confident', 'lean', 'tossup'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readFilter(): TierFilter {
  try {
    const raw = localStorage.getItem(STORAGE_TIER);
    if (raw === 'confident' || raw === 'lean' || raw === 'tossup') return raw;
    return 'all';
  } catch {
    return 'all';
  }
}

function getServerSnapshot(): TierFilter {
  return 'all';
}

function writeFilter(value: TierFilter): void {
  try {
    localStorage.setItem(STORAGE_TIER, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_TIER }));
    }
  } catch {
    // ignore
  }
}

function chipLabel(key: TierFilter): string {
  if (key === 'all') return '전체';
  return `${pickTierEmoji(key)} ${WINNER_TIER_LABEL[key]}`;
}

export function PredictionsTierFilter({ counts }: Props) {
  const filter = useSyncExternalStore(subscribe, readFilter, getServerSnapshot);

  const hideRule =
    filter === 'all'
      ? ''
      : `[data-prediction-tiers]:not([data-prediction-tiers~="${filter}"]){display:none!important;}`;

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3">
      {hideRule && (
        <style
          dangerouslySetInnerHTML={{
            __html: hideRule,
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-1">
          티어
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
              {chipLabel(key)}{' '}
              <span className="opacity-75">({counts[key]})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
