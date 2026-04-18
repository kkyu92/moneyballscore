// Next.js 13+ instrumentation hook — Sentry 서버 사이드 init 진입점.
// runtime 별로 다른 config 파일을 require.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// React Server Component 에러 캡처 — Next.js 가 register와 함께 onRequestError를 호출.
// Sentry SDK가 Next 호환 이름으로 export 하는 함수 (captureRequestError)를 그 이름에 매핑.
export { captureRequestError as onRequestError } from '@sentry/nextjs';
