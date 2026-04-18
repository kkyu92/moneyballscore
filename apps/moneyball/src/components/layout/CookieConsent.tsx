'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'mb_cookie_notice_v1';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage 비활성화 환경 (시크릿 모드 등) — 배너 미표시
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="쿠키 사용 안내"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] shadow-lg"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-gray-700 dark:text-gray-200 flex-1">
          이 사이트는 서비스 개선을 위한 분석 쿠키(Google Analytics)와
          광고 식별 쿠키를 사용합니다. 자세한 내용은{' '}
          <Link
            href="/privacy"
            className="underline hover:text-brand-600 dark:hover:text-brand-300"
          >
            개인정보처리방침
          </Link>
          을 확인하세요.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/privacy"
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-600 transition-colors min-h-[40px] inline-flex items-center"
          >
            자세히
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors min-h-[40px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            aria-label="쿠키 사용 안내 확인 후 닫기"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
