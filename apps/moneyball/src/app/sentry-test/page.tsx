'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import type { Metadata } from 'next';

// 이 페이지는 검증용 임시 페이지. 검증 후 삭제 예정.
// noindex 처리 (메타는 client component라 metadata export 불가 → robots.txt 무관하게 url 모르면 안 들어옴)

export default function SentryTestPage() {
  const [clientStatus, setClientStatus] = useState<string>('');
  const [serverStatus, setServerStatus] = useState<string>('');
  const [captureStatus, setCaptureStatus] = useState<string>('');

  const triggerClientError = () => {
    setClientStatus('클라이언트 에러 발생 시도...');
    setTimeout(() => {
      throw new Error(
        `[Sentry-Test-Client] 검증 에러 — ${new Date().toISOString()}`,
      );
    }, 50);
  };

  const triggerCapturedError = () => {
    setCaptureStatus('captureException 호출...');
    Sentry.captureException(
      new Error(
        `[Sentry-Test-Captured] 검증 captureException — ${new Date().toISOString()}`,
      ),
      {
        tags: { test: 'sentry-verification' },
        extra: { trigger: 'manual', source: 'debug-page' },
      },
    );
    setCaptureStatus(
      '✅ captureException 호출 완료. Sentry 대시보드 Issues 탭 확인.',
    );
  };

  const triggerServerError = async () => {
    setServerStatus('서버 API 호출...');
    try {
      const res = await fetch('/api/sentry-test');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(`서버 응답: ${JSON.stringify(data)}`);
      } else {
        setServerStatus(
          `✅ 서버 ${res.status} 에러 (예상). Sentry 서버 사이드 도착 예정.`,
        );
      }
    } catch (e) {
      setServerStatus(`Fetch 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const dsnPresent =
    typeof process !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-mono text-red-500">⚠ DEBUG — TEMPORARY</p>
        <h1 className="text-2xl font-bold">Sentry 통합 검증</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          이 페이지는 Sentry SDK가 prod에서 정상 작동하는지 확인하기 위한
          임시 페이지입니다. 검증 후 삭제 예정.
        </p>
        <p className="text-xs font-mono text-gray-400 dark:text-gray-500">
          NEXT_PUBLIC_SENTRY_DSN: {dsnPresent ? '✅ present' : '❌ absent (no-op)'}
        </p>
      </header>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
        <h2 className="font-bold">1. captureException (가장 안전)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          앱은 깨지지 않고 Sentry SDK에 에러 객체만 직접 전달.
        </p>
        <button
          type="button"
          onClick={triggerCapturedError}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          captureException 호출
        </button>
        {captureStatus && (
          <p className="text-xs font-mono text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {captureStatus}
          </p>
        )}
      </section>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
        <h2 className="font-bold">2. 클라이언트 throw (실제 에러 바운더리 통과)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          실제로 throw → React error boundary (error.tsx) → Sentry.captureException.
          페이지가 에러 화면으로 전환됩니다.
        </p>
        <button
          type="button"
          onClick={triggerClientError}
          className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          클라이언트 에러 throw
        </button>
        {clientStatus && (
          <p className="text-xs font-mono text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {clientStatus}
          </p>
        )}
      </section>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
        <h2 className="font-bold">3. 서버 사이드 (API route)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          /api/debug/sentry-test 호출 → 서버에서 throw → instrumentation.ts의
          captureRequestError → Sentry 서버 사이드 이벤트.
        </p>
        <button
          type="button"
          onClick={triggerServerError}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          서버 API 호출
        </button>
        {serverStatus && (
          <p className="text-xs font-mono text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {serverStatus}
          </p>
        )}
      </section>

      <footer className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-[var(--color-border)] pt-4 space-y-1">
        <p>Sentry 대시보드 → Issues 탭에서 메시지 prefix [Sentry-Test-*] 검색</p>
        <p>도착 확인되면 이 페이지 + /api/debug/sentry-test 라우트 삭제 PR 진행</p>
      </footer>
    </div>
  );
}
