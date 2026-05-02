'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';

const STORAGE_FAVORITES = 'mb_favorite_teams_v1';
const STORAGE_FILTER_ON = 'mb_filter_active_v1';

interface GameMeta {
  gameId: number;
  homeCode: TeamCode | null;
  awayCode: TeamCode | null;
}

interface Props {
  games: GameMeta[];
}

const TEAM_ENTRIES = Object.entries(KBO_TEAMS) as Array<
  [TeamCode, (typeof KBO_TEAMS)[TeamCode]]
>;

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function readFavorites(): TeamCode[] {
  try {
    const raw = localStorage.getItem(STORAGE_FAVORITES);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is TeamCode => typeof v === 'string' && v in KBO_TEAMS,
    );
  } catch {
    return [];
  }
}

function readFilterOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_FILTER_ON) === '1';
  } catch {
    return false;
  }
}

// useSyncExternalStore 의 getSnapshot 은 reference equality 가 안정적이어야 한다 (배열 매번 new → infinite loop).
// 캐시: localStorage raw 값이 같으면 같은 배열 reference 반환.
let favoritesCache: { raw: string | null; value: TeamCode[] } = {
  raw: null,
  value: [],
};

function getFavoritesSnapshot(): TeamCode[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_FAVORITES);
  } catch {
    return favoritesCache.value;
  }
  if (raw === favoritesCache.raw) return favoritesCache.value;
  favoritesCache = { raw, value: readFavorites() };
  return favoritesCache.value;
}

function getFavoritesServerSnapshot(): TeamCode[] {
  return favoritesCache.value;
}

function dispatchStorageEvent(key: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new StorageEvent('storage', { key }));
}

function writeFavorites(codes: TeamCode[]): void {
  try {
    localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(codes));
    dispatchStorageEvent(STORAGE_FAVORITES);
  } catch {
    // ignore
  }
}

function writeFilterOn(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_FILTER_ON, on ? '1' : '0');
    dispatchStorageEvent(STORAGE_FILTER_ON);
  } catch {
    // ignore
  }
}

export function FavoriteTeamFilter({ games }: Props) {
  const favorites = useSyncExternalStore(
    subscribe,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot,
  );
  const filterOn = useSyncExternalStore(
    subscribe,
    readFilterOn,
    () => false,
  );
  const [open, setOpen] = useState(false);

  const hiddenIds = useMemo(() => {
    if (!filterOn || favorites.length === 0) return new Set<number>();
    const favSet = new Set<TeamCode>(favorites);
    return new Set(
      games
        .filter(
          (g) =>
            !(g.homeCode && favSet.has(g.homeCode)) &&
            !(g.awayCode && favSet.has(g.awayCode)),
        )
        .map((g) => g.gameId),
    );
  }, [games, favorites, filterOn]);

  const toggle = (code: TeamCode) => {
    const next = favorites.includes(code)
      ? favorites.filter((c) => c !== code)
      : [...favorites, code];
    writeFavorites(next);
  };

  const clearAll = () => writeFavorites([]);

  const hiddenSelector = Array.from(hiddenIds)
    .map((id) => `[data-game-id="${id}"]`)
    .join(',');

  const activeFavCount = favorites.length;
  const visibleCount = games.length - hiddenIds.size;

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
      {hiddenSelector && (
        <style dangerouslySetInnerHTML={{ __html: `${hiddenSelector}{display:none!important;}` }} />
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-200">
            관심 팀
          </span>
          {activeFavCount > 0 ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {activeFavCount}팀 선택
              {filterOn && ` · ${visibleCount}/${games.length}경기 표시`}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              팀을 선택하면 해당 팀 경기만 빠르게 모아 볼 수 있습니다
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFavCount > 0 && (
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filterOn}
                onChange={(e) => writeFilterOn(e.target.checked)}
                className="accent-brand-600"
                aria-label="관심 팀만 보기"
              />
              <span>관심 팀만 보기</span>
            </label>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-600 transition-colors min-h-[32px]"
            aria-expanded={open}
          >
            {open ? '닫기' : activeFavCount > 0 ? '편집' : '팀 선택'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap gap-1.5">
            {TEAM_ENTRIES.map(([code, t]) => {
              const active = favorites.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggle(code)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors min-h-[32px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                    active
                      ? 'text-white border-transparent'
                      : 'text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500'
                  }`}
                  style={active ? { backgroundColor: t.color } : undefined}
                  aria-pressed={active}
                  aria-label={`${t.name} ${active ? '관심 해제' : '관심 추가'}`}
                >
                  {t.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
          {activeFavCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="mt-3 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 underline-offset-2 hover:underline"
            >
              전체 해제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
