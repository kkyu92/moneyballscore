'use client';

import { useSyncExternalStore } from 'react';

export type GlossaryCategorySlug =
  | 'pitcher'
  | 'batter'
  | 'composite'
  | 'context'
  | 'validation';

type CategoryFilter = 'all' | GlossaryCategorySlug;

const STORAGE_KEY = 'mb_glossary_category_v1';

const ORDER: CategoryFilter[] = [
  'all',
  'pitcher',
  'batter',
  'composite',
  'context',
  'validation',
];

const LABEL: Record<CategoryFilter, string> = {
  all: '전체',
  pitcher: '투수',
  batter: '타격',
  composite: '종합',
  context: '팀·맥락',
  validation: '검증·평가',
};

interface Props {
  counts: Record<GlossaryCategorySlug, number> & { all: number };
}

function isCategorySlug(value: string | null): value is CategoryFilter {
  return (
    value === 'pitcher' ||
    value === 'batter' ||
    value === 'composite' ||
    value === 'context' ||
    value === 'validation'
  );
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readFilter(): CategoryFilter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isCategorySlug(raw)) return raw;
    return 'all';
  } catch {
    return 'all';
  }
}

function getServerSnapshot(): CategoryFilter {
  return 'all';
}

function writeFilter(value: CategoryFilter): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    }
  } catch {
    // ignore
  }
}

export function GlossaryCategoryFilter({ counts }: Props) {
  const filter = useSyncExternalStore(subscribe, readFilter, getServerSnapshot);

  const hideRule =
    filter === 'all'
      ? ''
      : `[data-glossary-category]:not([data-glossary-category="${filter}"]){display:none!important;}`;

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
          카테고리
        </span>
        {ORDER.map((key) => {
          const active = filter === key;
          const count = key === 'all' ? counts.all : counts[key];
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
              {LABEL[key]}{' '}
              <span className="opacity-75">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
