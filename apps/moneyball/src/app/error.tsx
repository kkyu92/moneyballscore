'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vercel logs + Sentry (DSN 있을 때) 동시 수집
    console.error('[error.tsx]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-red-500/40">!</p>
        <h2 className="text-2xl md:text-3xl font-bold">
          페이지를 표시하는 중 오류가 발생했습니다
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          일시적인 문제일 수 있습니다. 다시 시도하거나 잠시 후 방문해주세요.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            오류 ID: {error.digest}
          </p>
        )}
      </header>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={reset}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors min-h-[40px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-5 py-2.5 transition-colors min-h-[40px] inline-flex items-center"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
