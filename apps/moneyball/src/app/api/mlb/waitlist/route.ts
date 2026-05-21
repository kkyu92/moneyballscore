/**
 * MLB waitlist 가입 endpoint (plan #1 Step 4).
 *
 * 보안 layer (plan #1 Phase 2+3 critical gap):
 *   1. CSRF / Origin — `request.headers.get('origin')` 가 허용 host 정합 시만 진행 (403)
 *   2. Honeypot — body `_hp` 채워지면 silent 200 (bot 차단)
 *   3. Email validate — RFC 5322 simplified regex + length 5-254 (DB CHECK defense in depth)
 *   4. Service role insert — anon insert denied (RLS), API route 만 service role bypass
 *   5. Email enumeration 보호 — ON CONFLICT (league,email) DO NOTHING + duplicate/신규 동일 200
 *   6. Sentry — error path 만 capture + flush 2000ms await (드리프트 사례 6 패턴)
 *
 * Rate limit (Vercel KV sliding window) = plan #1 Step 6 별도 cycle carry-over.
 */

import { type NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ORIGINS = [
  'https://moneyballscore.vercel.app',
  'https://www.moneyballscore.vercel.app',
];

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // dev — localhost 임의 port 허용
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
}

export async function POST(req: NextRequest): Promise<Response> {
  // Layer 1 — CSRF / Origin
  const origin = req.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // body 파싱
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { email, _hp, league } = body as Record<string, unknown>;

  // Layer 2 — Honeypot (silent 200, bot 차단)
  if (typeof _hp === 'string' && _hp.length > 0) {
    return NextResponse.json({ ok: true });
  }

  // Layer 3 — Email validate
  if (typeof email !== 'string' || email.length < 5 || email.length > 254) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  }

  // league validate (optional, default 'mlb')
  const leagueValue =
    typeof league === 'string' && /^[a-z]{2,8}$/.test(league) ? league : 'mlb';

  // Layer 4-5 — service role insert + email enumeration 보호
  const supabase = createAdminClient();
  const referrer = req.headers.get('referer');
  const userAgent = req.headers.get('user-agent');

  const { error } = await supabase.from('waitlist').insert({
    league: leagueValue,
    email: email.toLowerCase().trim(),
    referrer,
    user_agent: userAgent,
  });

  if (error) {
    // 23505 = unique violation = duplicate. email enumeration 차단 — 동일 200 응답
    if (error.code === '23505') {
      return NextResponse.json({ ok: true });
    }

    // Layer 6 — Sentry capture + flush (드리프트 사례 6 패턴)
    try {
      Sentry.captureException(error, {
        tags: { route: 'waitlist', league: leagueValue },
      });
      await Sentry.flush(2000);
    } catch {
      // sentry 미설정 silent fallback
    }
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
