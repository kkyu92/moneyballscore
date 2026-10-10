'use client';

import { useSyncExternalStore } from 'react';

type SortMode = 'accuracy' | 'sample';

const STORAGE_SORT = 'mb_monthly_team_stats_sort_v1';

const LABELS: Record<SortMode, string> = {
  accuracy: '정확도순',
  sample: '표본순',
};

// cycle 2356 (en/mlb/reviews/monthly 미러): locale prop 추가 — 기본값 'ko' 라
// 기존 KO callsite 무변경 (WeeklyGamesSortControl 과 동일 패턴).
const LABELS_EN: Record<SortMode, string> = {
  accuracy: 'By accuracy',
  sample: 'By sample size',
};

const ORDER: SortMode[] = ['accuracy', 'sample'];

// cycle 3010: 고정 20랭크 CSS 룰(`[data-sample-rank="N"]`, N<20) 은 KBO(10팀) 기준 설계라
// MLB(30팀) monthly review 에서 월간 예측 승리팀이 20팀을 넘으면 21번째+ 팀이 order 룰 누락으로
// 표본순 정렬 시 맨 앞으로 밀리는 실제 버그. WeeklyGamesSortControl/MissesSortControl 과 동일한
// CSS var(--mb-monthly-team-stats-order) 패턴으로 교체 — 팀 수 무관하게 상한 없음.
function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readSort(): SortMode {
  try {
    const raw = localStorage.getItem(STORAGE_SORT);
    if (raw === 'sample') return 'sample';
    return 'accuracy';
  } catch {
    return 'accuracy';
  }
}

function getServerSnapshot(): SortMode {
  return 'accuracy';
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

export function MonthlyTeamStatsSortControl({ locale = 'ko' }: { locale?: 'ko' | 'en' } = {}) {
  const sort = useSyncExternalStore(subscribe, readSort, getServerSnapshot);
  const labels = locale === 'en' ? LABELS_EN : LABELS;

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3">
      {sort === 'sample' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-monthly-team-stats-list]{display:flex;flex-direction:column;}[data-monthly-team-stats-list] > *{order:var(--mb-monthly-team-stats-order,0);}`,
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-1">
          {locale === 'en' ? 'Sort' : '정렬'}
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
              {labels[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
