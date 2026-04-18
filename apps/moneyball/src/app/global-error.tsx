'use client';

import { useEffect } from 'react';

// global-error.tsx 는 root layout 자체의 렌더링 실패를 잡는다.
// 여기서는 layout 도 못 쓰므로 자체 <html>/<body>가 필요.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error('[global-error.tsx]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Pretendard Variable", system-ui, sans-serif',
          background: '#0c0e0d',
          color: '#fff',
          margin: 0,
          padding: '4rem 1rem',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 12 }}>
          치명적인 오류가 발생했습니다
        </h1>
        <p style={{ color: '#8dcea0', fontSize: '0.875rem', marginBottom: 24 }}>
          페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
        </p>
        {error.digest && (
          <p
            style={{
              color: '#5aad70',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              marginBottom: 24,
            }}
          >
            오류 ID: {error.digest}
          </p>
        )}
        <a
          href="/"
          style={{
            display: 'inline-block',
            background: '#245232',
            color: '#fff',
            textDecoration: 'none',
            padding: '0.625rem 1.5rem',
            borderRadius: 8,
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          홈으로 이동
        </a>
      </body>
    </html>
  );
}
