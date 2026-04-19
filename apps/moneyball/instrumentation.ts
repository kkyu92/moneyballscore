// Sentry SDK v10 서버 사이드 진입점.
// 이전 패턴 (register() → dynamic import ./sentry.server.config) 이 Vercel/Turbopack
// 조합에서 실제로 호출되지 않는 드리프트 발견 → 모듈스코프 + register() 양쪽에
// Sentry.init 직접 호출. 중복 init 은 SDK 가 no-op.
import * as Sentry from '@sentry/nextjs';

function initSentry() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (Sentry.getClient()) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}

// 모듈 로드 시점에 즉시 init. Turbopack/webpack 양쪽에서 안전.
initSentry();

export async function register() {
  // register() 가 Next.js 에 의해 호출되면 추가 보증. 이미 init 됐으면 getClient() 체크로 스킵.
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    initSentry();
  }
}

// React Server Component 에러 캡처 — Next.js 가 register 와 함께 onRequestError 훅 호출.
export { captureRequestError as onRequestError } from '@sentry/nextjs';
