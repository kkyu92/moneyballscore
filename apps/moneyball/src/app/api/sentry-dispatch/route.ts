import { NextRequest } from 'next/server';
import crypto from 'node:crypto';

/**
 * Sentry "Internal Integration" webhook → playbook 허브 worker-error dispatch.
 *
 * 호출 경로:
 *   Sentry Alert Rule (production + level >= warning + First Seen)
 *     → POST /api/sentry-dispatch
 *     → HMAC-SHA256 서명 검증 (SENTRY_WEBHOOK_SECRET)
 *     → action === 'created' 만 통과
 *     → gh api repos/kkyu92/playbook/dispatches (event_type=worker-error)
 *
 * 필요 env:
 *   - SENTRY_WEBHOOK_SECRET: Sentry Internal Integration 의 Client Secret
 *   - PLAYBOOK_PAT: playbook repo dispatches:write 권한 PAT
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  const pat = process.env.PLAYBOOK_PAT;

  if (!secret || !pat) {
    return Response.json({ error: 'not configured' }, { status: 503 });
  }

  const raw = await request.text();

  // 허브 Issue 거대화 + spam 방지용 payload 크기 상한. 정상 Sentry 이벤트는 수십 KB.
  if (raw.length > 100_000) {
    return Response.json({ error: 'payload too large', size: raw.length }, { status: 413 });
  }

  const sig = request.headers.get('sentry-hook-signature');

  if (!sig) {
    return Response.json({ error: 'missing signature' }, { status: 401 });
  }

  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (!timingSafeEqualHex(expected, sig)) {
    return Response.json({ error: 'bad signature' }, { status: 401 });
  }

  const resource = request.headers.get('sentry-hook-resource');
  if (resource && resource !== 'issue' && resource !== 'event_alert') {
    return Response.json({ skipped: true, resource });
  }

  let payload: SentryWebhookPayload;
  try {
    payload = JSON.parse(raw) as SentryWebhookPayload;
  } catch {
    return Response.json({ error: 'bad json' }, { status: 400 });
  }

  // 초기 1주 동안 실 payload 구조 검증용. 정상 운영 안정되면 제거.
  // 서명 검증 통과 후에만 로그 — 검증 전 spam 로그 방지.
  console.log('[sentry-dispatch] payload received', JSON.stringify({
    resource: request.headers.get('sentry-hook-resource'),
    action: payload.action,
    dataKeys: payload.data ? Object.keys(payload.data) : [],
  }));

  // 두 경로 수용:
  //   1. Alert Rule via Internal Integration: resource=event_alert, action=triggered (기본 경로)
  //   2. Issue resource 직접 구독: resource=issue, action=created (fallback)
  const isAlertTrigger = payload.action === 'triggered';
  const isIssueCreated = payload.action === 'created';
  if (!isAlertTrigger && !isIssueCreated) {
    return Response.json({ skipped: true, action: payload.action });
  }

  // event_alert 는 data.event 가 주, issue 자원은 data.issue 가 주.
  const issue = payload.data?.issue;
  const event = payload.data?.event;
  const source = issue || event;
  if (!source) {
    return Response.json({ skipped: true, reason: 'no event/issue data' });
  }

  const rawTitle = source.title || source.culprit || 'Sentry: 새 에러';
  const title = truncate(rawTitle, 200);
  const level = source.level || 'unknown';
  const environment = event?.environment || issue?.metadata?.environment || 'unknown';
  const errorValue = truncate(source.metadata?.value || '', 2000);
  const errorFile = truncate(source.metadata?.filename || '', 500);
  const permalink = source.web_url || source.issue_url || issue?.permalink || '';
  const triggeredRule = payload.data?.triggered_rule;

  const bodyLines: string[] = [];
  bodyLines.push(`**Level**: ${level}`);
  bodyLines.push(`**Environment**: ${environment}`);
  if (triggeredRule) bodyLines.push(`**Alert Rule**: ${triggeredRule}`);
  if (permalink) bodyLines.push(`**Sentry**: ${permalink}`);
  bodyLines.push('');
  if (errorValue) {
    bodyLines.push(`**메시지**: ${errorValue}`);
  }
  if (errorFile) {
    bodyLines.push(`**위치**: ${errorFile}`);
  }
  const body = truncate(bodyLines.join('\n'), 5000);

  const dispatchResp = await fetch('https://api.github.com/repos/kkyu92/playbook/dispatches', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'worker-error',
      client_payload: {
        source_repo: 'kkyu92/moneyballscore',
        title: `Sentry: ${title}`,
        body,
        type: 'sentry-first-seen',
      },
    }),
  });

  if (!dispatchResp.ok) {
    const text = await dispatchResp.text().catch(() => '');
    console.error('[sentry-dispatch] playbook dispatch failed', dispatchResp.status, text);
    return Response.json({ error: 'dispatch failed', status: dispatchResp.status }, { status: 502 });
  }

  return Response.json({ ok: true, title });
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

interface SentryEventLike {
  title?: string;
  culprit?: string;
  level?: string;
  permalink?: string;
  web_url?: string;
  issue_url?: string;
  environment?: string;
  metadata?: {
    value?: string;
    filename?: string;
    environment?: string;
  };
}

interface SentryWebhookPayload {
  action?: string;
  data?: {
    issue?: SentryEventLike;
    event?: SentryEventLike;
    triggered_rule?: string;
  };
}
