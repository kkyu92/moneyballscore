import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// DSN이 없으면 init 자체를 안 부른다 → 패키지가 no-op으로 동작.
// Sentry 가입 후 NEXT_PUBLIC_SENTRY_DSN env만 추가하면 자동 활성.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [],
    // chunk load error 등 일부는 무시 (사용자 네트워크 이슈)
    ignoreErrors: [
      'ChunkLoadError',
      'Loading chunk',
      'NetworkError',
      'Failed to fetch',
    ],
  });
}
