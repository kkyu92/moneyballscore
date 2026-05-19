'use client';

import { useSyncExternalStore } from 'react';

type MonthFilter = 'all' | string;

const STORAGE_MONTH = 'mb_predictions_month_v1';

interface Props {
  months: string[];
  counts: Record<string, number>;
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readFilter(): MonthFilter {
  try {
    const raw = localStorage.getItem(STORAGE_MONTH);
    if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
    return 'all';
  } catch {
    return 'all';
  }
}

function getServerSnapshot(): MonthFilter {
  return 'all';
}

function writeFilter(value: MonthFilter): void {
  try {
    localStorage.setItem(STORAGE_MONTH, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_MONTH }));
    }
  } catch {
    // ignore
  }
}

function chipLabel(key: MonthFilter): string {
  if (key === 'all') return '전체';
  const [y, m] = key.split('-');
  return `${y}.${m}`;
}

export function PredictionsMonthFilter({ months, counts }: Props) {
  const filter = useSyncExternalStore(subscribe, readFilter, getServerSnapshot);

  const order: MonthFilter[] = ['all', ...months];
  const hideRule =
    filter === 'all'
      ? ''
      : `[data-prediction-month]:not([data-prediction-month="${filter}"]){display:none!important;}`;

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
          월
        </span>
        {order.map((key) => {
          const active = filter === key;
          const count = key === 'all' ? counts.all ?? 0 : counts[key] ?? 0;
          const empty = key !== 'all' && count === 0;
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
              {chipLabel(key)} <span className="opacity-75">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
