'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

interface Props {
  initialQuery?: string;
  compact?: boolean;
}

export function SearchForm({ initialQuery = '', compact = false }: Props) {
  const router = useRouter();
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
      aria-label="사이트 검색"
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
        placeholder="팀, 선수, 일자 검색…"
        aria-label="검색어"
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
        검색
      </button>
    </form>
  );
}
