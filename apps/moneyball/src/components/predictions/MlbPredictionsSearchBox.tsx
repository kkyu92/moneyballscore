'use client';

import { useSyncExternalStore } from 'react';
import { MLB_TEAMS, mlbShortTeamName, type MlbTeamCode } from '@moneyball/shared';

// PredictionsSearchBox(KBO) 의 MLB 변형 — 별도 storage key(mb_mlb_predictions_search_v1)
// 로 KBO/MLB 검색어 상태 독립. hide 로직(data-prediction-date/data-prediction-teams)은
// 동일 컨벤션 재사용 — /mlb/predictions/page.tsx 가 같은 data attribute 로 렌더.
const STORAGE_QUERY = 'mb_mlb_predictions_search_v1';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readQuery(): string {
  try {
    return localStorage.getItem(STORAGE_QUERY) ?? '';
  } catch {
    return '';
  }
}

function getServerSnapshot(): string {
  return '';
}

function writeQuery(value: string): void {
  try {
    if (value) {
      localStorage.setItem(STORAGE_QUERY, value);
    } else {
      localStorage.removeItem(STORAGE_QUERY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_QUERY }));
    }
  } catch {
    // ignore
  }
}

const DATE_RE = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/;

function normalizeDate(input: string): string | null {
  const m = input.match(DATE_RE);
  if (!m) return null;
  const [, y, mo, da] = m;
  if (da) return `${y}-${mo!.padStart(2, '0')}-${da.padStart(2, '0')}`;
  if (mo) return `${y}-${mo.padStart(2, '0')}`;
  return y;
}

function resolveTeamCode(input: string): MlbTeamCode | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper in MLB_TEAMS) return upper as MlbTeamCode;
  for (const code of Object.keys(MLB_TEAMS) as MlbTeamCode[]) {
    const short = mlbShortTeamName(code);
    if (short === trimmed) return code;
    if (MLB_TEAMS[code].name.startsWith(trimmed) || MLB_TEAMS[code].name === trimmed) return code;
  }
  return null;
}

function escapeAttr(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

export function MlbPredictionsSearchBox() {
  const query = useSyncExternalStore(subscribe, readQuery, getServerSnapshot);

  const trimmed = query.trim();
  let hideRule = '';
  let matchHint: string | null = null;

  if (trimmed) {
    const datePrefix = normalizeDate(trimmed);
    const teamCode = resolveTeamCode(trimmed);
    if (datePrefix) {
      const safe = escapeAttr(datePrefix);
      hideRule = `[data-prediction-date]:not([data-prediction-date^="${safe}"]){display:none!important;}`;
      matchHint = `날짜 ${datePrefix}`;
    } else if (teamCode) {
      const safe = escapeAttr(teamCode);
      hideRule = `[data-prediction-teams]:not([data-prediction-teams~="${safe}"]){display:none!important;}`;
      matchHint = `${mlbShortTeamName(teamCode)} (${teamCode})`;
    } else {
      hideRule = `[data-prediction-date]{display:none!important;}`;
      matchHint = '매칭 없음';
    }
  }

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3">
      {hideRule && (
        <style
          dangerouslySetInnerHTML={{
            __html: hideRule,
          }}
        />
      )}
      <label className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-1">검색</span>
        <input
          type="search"
          value={query}
          onChange={(e) => writeQuery(e.target.value)}
          placeholder="팀명 또는 날짜 (예: Dodgers, 2026-05)"
          className="flex-1 text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--color-border)] bg-transparent text-gray-800 dark:text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-label="팀명 또는 날짜로 예측 검색"
        />
        {trimmed && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {matchHint}
          </span>
        )}
      </label>
    </div>
  );
}
