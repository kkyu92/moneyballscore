'use client';

import { useSyncExternalStore } from 'react';

type StatusFilter = 'all' | 'verified' | 'pending';

const STORAGE_FILTER = 'mb_predictions_status_filter_v1';

interface Props {
  counts: {
    all: number;
    verified: number;
    pending: number;
  };
}

const LABELS: Record<StatusFilter, string> = {
  all: '전체',
  verified: '결과 확인 가능',
  pending: '결과 대기 중',
};

const ORDER: StatusFilter[] = ['all', 'verified', 'pending'];

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readFilter(): StatusFilter {
  try {
    const raw = localStorage.getItem(STORAGE_FILTER);
    if (raw === 'verified' || raw === 'pending') return raw;
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

export function PredictionsStatusFilter({ counts }: Props) {
  const filter = useSyncExternalStore(subscribe, readFilter, getServerSnapshot);

  const hideSelector =
    filter === 'verified'
      ? '[data-prediction-status="pending"]'
      : filter === 'pending'
        ? '[data-prediction-status="verified"]'
        : '';

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3">
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
          return (
            <button
              key={key}
              type="button"
              onClick={() => writeFilter(key)}
              aria-pressed={active}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors min-h-[32px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
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
