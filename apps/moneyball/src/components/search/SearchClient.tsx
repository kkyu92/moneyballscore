'use client';

import Fuse, { type IFuseOptions } from 'fuse.js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';

import { TeamLogo } from '@/components/shared/TeamLogo';

function isTeamCode(code: string | null | undefined): code is TeamCode {
  return Boolean(code && code in KBO_TEAMS);
}

/**
 * SearchClient — client-side fuzzy search via Fuse.js.
 *
 * Cycle 1021 (b6): /search 페이지 강화 carry-over. 기존 server-only path
 * (page.tsx) 는 URL `?q=` 진입 / no-JS / SEO fallback 유지. 본 컴포넌트는
 * input mount 직후 fuzzy match 를 실시간 렌더 → submit 없이 결과 확인 가능.
 *
 * 인덱스 = teams (10) + players (server fetch top N) + dates (recent 90)
 * + pages (about / methodology 등 static slug).
 *
 * 키보드 nav: ArrowUp/Down 으로 결과 이동, Enter 로 진입, Esc 로 결과 닫기.
 * a11y: role=combobox + aria-activedescendant + aria-expanded.
 */

export type SearchEntryKind = 'team' | 'player' | 'date' | 'page';

export interface SearchEntry {
  kind: SearchEntryKind;
  /** Stable unique id (kind:key) */
  id: string;
  /** Primary display label (e.g. "SSG 랜더스") */
  label: string;
  /** Secondary label shown next to primary (e.g. "SK" or position) */
  sub?: string | null;
  /** Tertiary line (e.g. "인천SSG랜더스필드") */
  meta?: string | null;
  /** Route to navigate on selection */
  href: string;
  /** Searchable surface — concatenated keywords (latin + hangul + jamo). */
  haystack: string;
  /** Team code for logo rendering (team kind only). */
  teamCode?: string | null;
}

interface Props {
  entries: SearchEntry[];
  /** Initial query from URL `?q=`. Optional. */
  initialQuery?: string;
}

const FUSE_OPTIONS: IFuseOptions<SearchEntry> = {
  includeScore: true,
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 1,
  keys: [
    { name: 'label', weight: 0.6 },
    { name: 'haystack', weight: 0.3 },
    { name: 'sub', weight: 0.1 },
  ],
};

const KIND_LABEL: Record<SearchEntryKind, string> = {
  team: '팀',
  player: '선수',
  date: '경기 일자',
  page: '페이지',
};

const KIND_ORDER: SearchEntryKind[] = ['team', 'player', 'date', 'page'];

const DEBOUNCE_MS = 200;
const MAX_RESULTS_PER_KIND = 8;
const MAX_TOTAL_RESULTS = 24;

export function SearchClient({ entries, initialQuery = '' }: Props) {
  const router = useRouter();
  const listboxId = useId();
  const inputId = useId();

  const [rawQ, setRawQ] = useState(initialQuery);
  const [debouncedQ, setDebouncedQ] = useState(initialQuery.trim());
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Build Fuse once per entries-set. entries is stable for the page lifetime.
  const fuse = useMemo(() => new Fuse(entries, FUSE_OPTIONS), [entries]);

  // Debounce 200ms — keystroke spam mitigation.
  useEffect(() => {
    const trimmed = rawQ.trim();
    if (trimmed === debouncedQ) return;
    const handle = setTimeout(() => setDebouncedQ(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [rawQ, debouncedQ]);

  // Focus input on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Compute results — fuse search + group by kind + cap per-kind.
  const results = useMemo(() => {
    if (!debouncedQ) return [];
    const hits = fuse.search(debouncedQ, { limit: 60 });
    return hits.map((h) => h.item);
  }, [fuse, debouncedQ]);

  const grouped = useMemo(() => {
    const byKind = new Map<SearchEntryKind, SearchEntry[]>();
    for (const kind of KIND_ORDER) byKind.set(kind, []);
    for (const entry of results) {
      const bucket = byKind.get(entry.kind);
      if (!bucket || bucket.length >= MAX_RESULTS_PER_KIND) continue;
      bucket.push(entry);
    }
    return KIND_ORDER.map((kind) => ({
      kind,
      label: KIND_LABEL[kind],
      items: byKind.get(kind) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [results]);

  // Flat list (in render order) for keyboard navigation.
  const flat = useMemo(() => {
    const out: SearchEntry[] = [];
    for (const g of grouped) {
      for (const item of g.items) {
        out.push(item);
        if (out.length >= MAX_TOTAL_RESULTS) return out;
      }
    }
    return out;
  }, [grouped]);

  // Reset active index when results change.
  useEffect(() => {
    setActiveIndex(flat.length > 0 ? 0 : -1);
  }, [flat]);

  // Mark list "open" whenever we have a query.
  useEffect(() => {
    setOpen(debouncedQ.length > 0);
  }, [debouncedQ]);

  const goToEntry = useCallback(
    (entry: SearchEntry) => {
      router.push(entry.href);
    },
    [router],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (flat.length === 0) return;
        setActiveIndex((i) => (i + 1) % flat.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (flat.length === 0) return;
        setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < flat.length) {
          e.preventDefault();
          goToEntry(flat[activeIndex]);
          return;
        }
        // Fallback — push to server-side path so the URL/q persists.
        const trimmed = rawQ.trim();
        if (trimmed) {
          e.preventDefault();
          router.push(`/search?q=${encodeURIComponent(trimmed)}`);
        }
      } else if (e.key === 'Escape') {
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
      }
    },
    [activeIndex, flat, goToEntry, open, rawQ, router],
  );

  const activeId = activeIndex >= 0 && flat[activeIndex]
    ? `${listboxId}-opt-${flat[activeIndex].id}`
    : undefined;

  return (
    <div className="space-y-4">
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-owns={listboxId}
        aria-controls={listboxId}
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] focus-within:border-brand-500 transition-colors"
      >
        <label htmlFor={inputId} className="sr-only">
          검색어
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          value={rawQ}
          onChange={(e) => setRawQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => debouncedQ && setOpen(true)}
          placeholder="팀, 선수, 일자 검색…"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          className="w-full px-4 py-3 bg-transparent focus:outline-none text-base"
        />
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="검색 결과"
          className="space-y-3"
        >
          {grouped.length === 0 && (
            <li
              role="presentation"
              className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 text-center text-sm text-gray-500 dark:text-gray-400"
            >
              일치하는 결과가 없습니다.
            </li>
          )}
          {grouped.map((group) => (
            <li
              key={group.kind}
              role="presentation"
              className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                {group.label} ({group.items.length})
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {group.items.map((entry) => {
                  const flatIdx = flat.indexOf(entry);
                  const isActive = flatIdx === activeIndex;
                  return (
                    <li key={entry.id} className="contents">
                      <Link
                        id={`${listboxId}-opt-${entry.id}`}
                        href={entry.href}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        onClick={() => goToEntry(entry)}
                        className={[
                          'flex items-center justify-between gap-3 py-2 px-2 rounded-md transition-colors',
                          isActive
                            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-900/40',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {entry.kind === 'team' && isTeamCode(entry.teamCode) && (
                            <TeamLogo team={entry.teamCode} size={18} />
                          )}
                          <span className="font-medium truncate">
                            {entry.label}
                          </span>
                          {entry.sub && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                              {entry.sub}
                            </span>
                          )}
                        </div>
                        {entry.meta && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            {entry.meta}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
