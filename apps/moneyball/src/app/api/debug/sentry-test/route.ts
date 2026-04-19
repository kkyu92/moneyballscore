import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * 임시 테스트 라우트 — Sentry → playbook 허브 dispatch 체인 E2E 검증용.
 *
 *   GET /api/debug/sentry-test?mode=pii  → 가드 B (PII scrubbing 동작 검증)
 *   GET /api/debug/sentry-test?mode=e2e  → 가드 D (전체 체인 도달 검증)
 *
 * 검증 완료 후 이 파일 포함 커밋을 git revert 로 제거.
 * (이전 51d39b1 "Sentry 검증용 임시 라우트 제거" 패턴과 동일)
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('mode') || 'e2e';
  const stamp = Date.now();

  const err =
    mode === 'pii'
      ? new Error(
          `PII scrubbing test — email=fake@test.local user_id=99999 jwt=fake.jwt.xxx session_id=sess_fake_${stamp}`
        )
      : new Error(`E2E sentry-dispatch trigger — ${stamp}`);

  // captureException 으로 명시적으로 Sentry 에 보내고 JSON 응답 반환.
  // (route handler 에서 throw 하면 Next 에러 바운더리가 먼저 잡을 수 있어서,
  //  Sentry 포착 확실성을 위해 explicit capture 사용)
  Sentry.captureException(err);

  return Response.json({
    triggered: true,
    mode,
    stamp,
    message: err.message,
  });
}
