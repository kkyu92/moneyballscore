'use client';

import { useSyncExternalStore } from 'react';
import { KBO_TEAMS, KBO_TEAM_SHORT_NAME, type TeamCode } from '@moneyball/shared';

const STORAGE_QUERY = 'mb_predictions_search_v1';

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

function resolveTeamCode(input: string): TeamCode | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper in KBO_TEAMS) return upper as TeamCode;
  for (const [code, short] of Object.entries(KBO_TEAM_SHORT_NAME)) {
    if (short === trimmed) return code as TeamCode;
  }
  for (const [code, info] of Object.entries(KBO_TEAMS)) {
    if (info.name.startsWith(trimmed) || info.name === trimmed) return code as TeamCode;
  }
  return null;
}

function escapeAttr(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

export function PredictionsSearchBox() {
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
      matchHint = `${KBO_TEAM_SHORT_NAME[teamCode]} (${teamCode})`;
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
          placeholder="팀명 또는 날짜 (예: 두산, 2026-05)"
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
