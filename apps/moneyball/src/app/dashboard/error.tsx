'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] render error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">⚠️</span>
      <h2 className="text-xl font-bold mb-2">대시보드를 불러오지 못했습니다</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        일시적인 데이터베이스 오류일 가능성이 높습니다. 잠시 후 다시 시도해 주세요.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        다시 시도
      </button>
      {error.digest && (
        <p className="mt-4 text-xs font-mono text-gray-400 dark:text-gray-500">
          digest: {error.digest}
        </p>
      )}
    </div>
  );
}
