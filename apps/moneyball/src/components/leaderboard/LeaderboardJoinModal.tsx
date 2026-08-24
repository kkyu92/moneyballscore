'use client';

import { useEffect, useRef, useState } from 'react';
import { NICKNAME_MIN_CHARS, NICKNAME_MAX_CHARS } from '@moneyball/shared';

interface Props {
  onJoin: (nickname: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export function LeaderboardJoinModal({ onJoin, onClose, loading }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < NICKNAME_MIN_CHARS || trimmed.length > NICKNAME_MAX_CHARS) return;
    onJoin(trimmed);
  };

  const isValid =
    value.trim().length >= NICKNAME_MIN_CHARS && value.trim().length <= NICKNAME_MAX_CHARS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-1">리더보드 참가</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          닉네임을 설정하면 전체 순위에 등록됩니다.
          <br />
          <span className="text-xs">같은 닉네임이 있을 수 있습니다.</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`닉네임 (${NICKNAME_MIN_CHARS}~${NICKNAME_MAX_CHARS}자)`}
            maxLength={NICKNAME_MAX_CHARS}
            className="w-full border border-gray-200 dark:border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {value.trim().length}/{NICKNAME_MAX_CHARS}자
            {value.trim().length > 0 && value.trim().length < NICKNAME_MIN_CHARS && (
              <span className="text-error ml-1">최소 {NICKNAME_MIN_CHARS}자 필요</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 dark:border-[var(--color-border)] rounded-lg py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {loading ? '등록 중…' : '참가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
