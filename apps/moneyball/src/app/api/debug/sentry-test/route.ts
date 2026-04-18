import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Sentry 서버 사이드 통합 검증용 임시 라우트. 검증 후 삭제 예정.
export async function GET() {
  const error = new Error(
    `[Sentry-Test-Server] 검증 서버 에러 — ${new Date().toISOString()}`,
  );

  // captureException 명시 호출 — instrumentation.ts captureRequestError 와 별개로 수동 전송
  Sentry.captureException(error, {
    tags: { test: 'sentry-verification', surface: 'server-api' },
  });

  // throw 도 같이 → captureRequestError 경로로도 검증
  throw error;

  // unreachable — 타입 만족용
  return NextResponse.json({ ok: false });
}
