// Sentry SDK v10 서버 사이드 진입점.
// 드리프트 사례 6: Next.js 16 + src/app 구조에선 이 파일이 src/ 내부에 있어야 Next 가
// 자동 감지·로드. 이전 패턴 (register → dynamic import) + 위치 루트 두 문제 동시 해결.
import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from './sentry-scrub';

function initSentry() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (Sentry.getClient()) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
    // 대시보드 Sensitive Fields 가 user/contexts/tags/extras 깊이 매칭 못함 (가드 B 테스트 확인).
    // beforeSend 훅이 모든 이벤트에 대해 코드 레벨 스크럽 강제.
    beforeSend: scrubSentryEvent,
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
