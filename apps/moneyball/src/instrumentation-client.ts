import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from './sentry-scrub';

// Sentry SDK v10+ 클라이언트 진입점.
// 이전 패턴(sentry.client.config.ts)은 v8부터 deprecated → instrumentation-client.ts 가 자동 로드.
// DSN이 없으면 init 자체를 안 부른다 → 패키지가 no-op.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    // chunk load error 등 일부는 무시 (사용자 네트워크 이슈)
    ignoreErrors: [
      'ChunkLoadError',
      'Loading chunk',
      'NetworkError',
      'Failed to fetch',
    ],
    // 코드 레벨 PII 스크럽 — 대시보드 Sensitive Fields 의 key 매칭 한계 커버 (가드 B 반영).
    beforeSend: scrubSentryEvent,
  });
}

// Next.js App Router 페이지 전환 트레이스 (v10 권장 패턴)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
