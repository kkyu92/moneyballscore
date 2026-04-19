import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// 진단: instrumentation.ts 가 register() 를 호출 안 해서 Sentry.init 이 안 돌 가능성.
// 모듈 로드 시 직접 init 해서 그 가설 검증. 동일한 DSN 이라 중복 init 은 no-op.
const directDsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
if (directDsn && !Sentry.getClient()) {
  Sentry.init({
    dsn: directDsn,
    environment: process.env.VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}

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

  // 진단: DSN/클라이언트 초기화 상태를 response 에 실어서 Vercel 로그 없이 확인.
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  const client = Sentry.getClient();
  const diagnostic = {
    dsnPresent: !!dsn,
    dsnPrefix: dsn?.slice(0, 30),
    clientInitialized: !!client,
    clientDsn: client?.getDsn() ? 'set' : 'unset',
    directInitTriggered: !!directDsn,
    nextRuntime: process.env.NEXT_RUNTIME,
    vercelEnv: process.env.VERCEL_ENV,
  };

  if (mode === 'diag') {
    return Response.json({ triggered: false, mode: 'diag', diagnostic });
  }

  if (mode === 'pii') {
    // 가드 B — Sensitive Fields 스크러버 실 동작 검증.
    // Sentry 스크러버는 freeform 메시지가 아닌 **구조화된 키 이름** 을 매칭.
    // 따라서 user / contexts / extras 에 가짜 PII 필드명을 실어야 제대로 테스트됨.
    Sentry.withScope((scope) => {
      scope.setUser({
        email: 'fake@test.local',
        id: '99999',
        username: 'fake_user_test',
        ip_address: '1.2.3.4',
      });
      scope.setContext('auth', {
        jwt: `fake.jwt.xxx.${stamp}`,
        refresh_token: `rt_fake_${stamp}`,
        session_id: `sess_fake_${stamp}`,
        authorization: 'Bearer fake_token_xxx',
        cookie: 'sessionid=fake; user_id=99999',
      });
      scope.setContext('profile', {
        phone: '010-1234-5678',
        phone_number: '010-1234-5678',
        email_verified: true,
        display_name: '가짜유저',
        avatar_url: 'https://example.com/fake.png',
      });
      scope.setContext('payment', {
        stripe: 'sk_fake_xxx',
        customer_id: 'cus_fake',
        payment_method: 'pm_fake',
        charge: 'ch_fake',
      });
      scope.setContext('integration', {
        discord_id: 'fake_discord_99999',
        slack_user_id: 'U_FAKE_99999',
        webhook_url: 'https://discord.com/api/webhooks/fake',
      });
      scope.setExtra('supabase.auth', { jwt: 'fake-supabase-jwt' });
      scope.setExtra('supabase.user', { email: 'fake@supabase.test', id: 'user_99999' });
      scope.setExtra('oauth', { refresh_token: 'oauth_rt_fake' });
      scope.setExtra('referrer', 'https://evil.example.com/?user_id=99999');
      scope.setExtra('query_string', 'email=fake@test.local&token=fake_xxx');
      scope.setTag('member_id', 'member_99999');
      scope.setTag('subscriber_id', 'sub_99999');

      Sentry.captureException(new Error(`PII scrubbing guard B — ${stamp}`));
    });

    // Vercel 서버리스는 response 반환 즉시 function 종료 → Sentry 백그라운드 send 유실.
    // flush 로 전송 완료까지 블록.
    const flushed = await Sentry.flush(3000);
    return Response.json({ triggered: true, mode: 'pii', stamp, flushed, diagnostic });
  }

  // mode=e2e — 가드 D: 전체 체인 도달 검증용 안전 페이로드
  Sentry.captureException(new Error(`E2E sentry-dispatch trigger — ${stamp}`));
  const flushed = await Sentry.flush(3000);
  return Response.json({ triggered: true, mode: 'e2e', stamp, flushed, diagnostic });
}
