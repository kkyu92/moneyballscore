/**
 * Sentry webhook → playbook 허브 repository_dispatch 릴레이.
 *
 * 흐름:
 *   1. HMAC 검증 (`SENTRY_WEBHOOK_SECRET` + `X-Sentry-Hook-Signature` header)
 *   2. payload 파싱 + PII 재스크럽
 *   3. GitHub repository_dispatch 로 playbook 에 forward
 *
 * 재귀 방지 (Pull (b) D2 결정):
 *   이 route 는 Sentry 에서 scope tag `no-relay=true` 로 마킹되어 Sentry alert
 *   rule 에서 **webhook 발사 제외**. 즉 `/api/hub-dispatch` 자체가 throw 해도
 *   다시 이 route 로 돌아오지 않음. Sentry 쪽 rule 설정 필수 (배포 체크리스트).
 *
 * Query params:
 *   `dry_run=1` → payload build + log 만, dispatch 생략
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  composePayload,
  toDispatchBody,
  type SentryWebhookInput,
} from '@/lib/hub-dispatch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // crypto.createHmac 용

/**
 * HMAC SHA256 검증. Sentry Internal Integration 은 `X-Sentry-Hook-Signature`
 * 헤더에 hex digest 를 실어 보냄 (client secret 으로 HMAC).
 */
function verifySignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

interface DispatchResult {
  status: 'dispatched' | 'dry_run' | 'unauthorized' | 'invalid' | 'error';
  fingerprint?: string;
  event_type?: string;
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<Response> {
  // Sentry 에 이 요청은 relay 용이라 표시 — 자기 에러는 다른 route 로 빠진
  // 정상 요청과 구분. Sentry rule 에서 `no-relay:true` tag 제외.
  Sentry.withScope((s) => s.setTag('no-relay', 'true'));

  const dryRun =
    request.nextUrl.searchParams.get('dry_run') === '1' ||
    request.nextUrl.searchParams.get('dry_run') === 'true';

  // prod 외 환경에선 401 — 개발/preview 에서 실수로 허브에 노이즈 보내는 것 차단
  const envGuard = process.env.VERCEL_ENV;
  if (envGuard && envGuard !== 'production' && !dryRun) {
    return Response.json(
      { status: 'unauthorized', error: 'non-production dispatch blocked' } satisfies DispatchResult,
      { status: 403 },
    );
  }

  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  const pat = process.env.PLAYBOOK_PAT;
  if (!secret || !pat) {
    return Response.json(
      {
        status: 'error',
        error: 'SENTRY_WEBHOOK_SECRET / PLAYBOOK_PAT missing',
      } satisfies DispatchResult,
      { status: 500 },
    );
  }

  const bodyText = await request.text();

  // HMAC 검증 (dry_run 에서도 동일 gate — 테스트 편의보다 보안 우선)
  const sig = request.headers.get('sentry-hook-signature');
  if (!verifySignature(bodyText, sig, secret)) {
    return Response.json(
      { status: 'unauthorized', error: 'signature mismatch' } satisfies DispatchResult,
      { status: 401 },
    );
  }

  // payload 파싱
  let parsed: SentryWebhookInput;
  try {
    const raw = JSON.parse(bodyText);
    // Sentry action='event_alert' / 'issue_alert' 모두 `data.event` 구조
    const event = raw?.data?.event ?? raw?.event;
    if (!event) throw new Error('missing event');
    parsed = {
      event,
      triggered_rule: raw?.data?.triggered_rule ?? raw?.triggered_rule,
      installation: raw?.installation,
    };
  } catch (e) {
    return Response.json(
      {
        status: 'invalid',
        error: e instanceof Error ? e.message : 'parse failed',
      } satisfies DispatchResult,
      { status: 400 },
    );
  }

  const intent =
    request.nextUrl.searchParams.get('intent') === 'test' ? 'test' : undefined;

  const sourceRepo =
    process.env.GITHUB_REPOSITORY ?? 'kkyu92/moneyballscore';

  const payload = composePayload(parsed, { sourceRepo, intent });
  const dispatchBody = toDispatchBody(payload);

  if (dryRun) {
    console.log('[hub-dispatch] DRY RUN', JSON.stringify(dispatchBody));
    return Response.json({
      status: 'dry_run',
      fingerprint: payload.fingerprint,
      event_type: dispatchBody.event_type,
    } satisfies DispatchResult);
  }

  // GitHub repository_dispatch
  const ghRes = await fetch(
    'https://api.github.com/repos/kkyu92/playbook/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dispatchBody),
    },
  );

  if (!ghRes.ok) {
    const errBody = await ghRes.text();
    return Response.json(
      {
        status: 'error',
        error: `GitHub dispatch ${ghRes.status}: ${errBody.slice(0, 200)}`,
        fingerprint: payload.fingerprint,
      } satisfies DispatchResult,
      { status: 502 },
    );
  }

  return Response.json({
    status: 'dispatched',
    fingerprint: payload.fingerprint,
    event_type: dispatchBody.event_type,
  } satisfies DispatchResult);
}

/** Health check — Sentry/GitHub Actions 에서 엔드포인트 존재 확인용. */
export async function GET(): Promise<Response> {
  return Response.json({ ok: true, route: '/api/hub-dispatch' });
}
