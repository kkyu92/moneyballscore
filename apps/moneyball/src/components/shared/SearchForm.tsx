'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, type FormEvent } from 'react';

interface Props {
  initialQuery?: string;
  compact?: boolean;
}

// 헤더 데스크톱 nav 에 항상 렌더 — /en/mlb/* 페이지에서도 KO 하드코딩 텍스트 노출되던
// 버그 (cycle 2139~2141 nav label/href i18n 범위에서 누락된 컴포넌트). href(/search) 는
// /en/search 라우트 자체가 없어 대상 외 (KBO/로또와 동일한 기존 스코프 제약).
export function SearchForm({ initialQuery = '', compact = false }: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const isEn = pathname === '/en' || pathname.startsWith('/en/');
  const [q, setQ] = useState(initialQuery);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label={isEn ? 'Site search' : '사이트 검색'}
      className={
        compact
          ? 'flex items-center gap-1.5'
          : 'flex items-center gap-2 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-2 focus-within:border-brand-500 transition-colors'
      }
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={isEn ? 'Search teams, players, dates…' : '팀, 선수, 일자 검색…'}
        aria-label={isEn ? 'Search query' : '검색어'}
        className={
          compact
            ? 'w-36 sm:w-48 text-sm bg-brand-700/40 placeholder:text-brand-200/60 text-white border border-brand-700 rounded-md px-3 py-1.5 focus:outline-none focus:border-accent'
            : 'flex-1 min-w-0 px-3 py-2 bg-transparent focus:outline-none text-base'
        }
        autoComplete="off"
      />
      <button
        type="submit"
        className={
          compact
            ? 'text-xs font-medium text-white bg-brand-600 hover:bg-brand-500 rounded-md px-3 py-1.5 transition-colors'
            : 'text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-4 py-2 transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
        }
      >
        {isEn ? 'Search' : '검색'}
      </button>
    </form>
  );
}
