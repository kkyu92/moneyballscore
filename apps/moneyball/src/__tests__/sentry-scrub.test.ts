import { describe, it, expect } from 'vitest';
import type { ErrorEvent } from '@sentry/nextjs';
import { scrubSentryEvent, scrubUrlString } from '../sentry-scrub';

const FILTERED = '[Filtered]';

function emptyEvent(): ErrorEvent {
  return { type: undefined, event_id: 'test' } as ErrorEvent;
}

describe('scrubSentryEvent', () => {
  it('scrubs user id/email/username/ip_address', () => {
    const ev = emptyEvent();
    ev.user = {
      id: 'real-id',
      email: 'a@b.com',
      username: 'kyusik',
      ip_address: '1.2.3.4',
    };
    const out = scrubSentryEvent(ev);
    expect(out?.user?.id).toBe(FILTERED);
    expect(out?.user?.email).toBe(FILTERED);
    expect(out?.user?.username).toBe(FILTERED);
    expect(out?.user?.ip_address).toBe(FILTERED);
  });

  it('scrubs sensitive keys in tags/extra/contexts walking deep', () => {
    const ev = emptyEvent();
    ev.tags = { password: 'secret', region: 'kr' } as ErrorEvent['tags'];
    ev.extra = { nested: { token: 't', name: 'ok' } } as ErrorEvent['extra'];
    ev.contexts = { app: { stripe: 'cus_x', mode: 'prod' } } as ErrorEvent['contexts'];
    const out = scrubSentryEvent(ev);
    expect((out?.tags as Record<string, unknown>).password).toBe(FILTERED);
    expect((out?.tags as Record<string, unknown>).region).toBe('kr');
    expect(((out?.extra as Record<string, unknown>).nested as Record<string, unknown>).token).toBe(
      FILTERED,
    );
    expect(((out?.extra as Record<string, unknown>).nested as Record<string, unknown>).name).toBe(
      'ok',
    );
    expect(((out?.contexts as Record<string, unknown>).app as Record<string, unknown>).stripe).toBe(
      FILTERED,
    );
  });

  // cycle 437 — Y/C 후속. event.request + event.breadcrumbs 커버 회귀 가드.
  it('scrubs event.request sensitive keys (cookie/authorization/query_string)', () => {
    const ev = emptyEvent();
    ev.request = {
      url: 'https://moneyballscore.com/api/x',
      method: 'POST',
      cookies: { session: 'abc' },
      headers: { authorization: 'Bearer real-token', 'user-agent': 'curl' },
      query_string: 'token=real-value&page=1',
      data: { email: 'a@b.com', payload: 'ok' },
    };
    const out = scrubSentryEvent(ev);
    const req = out?.request as Record<string, unknown>;
    expect(req.cookies).toBe(FILTERED);
    expect(req.query_string).toBe(FILTERED);
    expect((req.headers as Record<string, unknown>).authorization).toBe(FILTERED);
    expect((req.headers as Record<string, unknown>)['user-agent']).toBe('curl');
    expect((req.data as Record<string, unknown>).email).toBe(FILTERED);
    expect((req.data as Record<string, unknown>).payload).toBe('ok');
    expect(req.url).toBe('https://moneyballscore.com/api/x');
    expect(req.method).toBe('POST');
  });

  // cycle 527 — URL 값 스크럽 (PII spec C-3). breadcrumb data.to 의 ?token= 값이
  // key-based scrub 만으론 노출. URL_VALUE_KEYS 매칭 + scrubUrlString 회귀 가드.
  it('scrubs event.breadcrumbs array — nav url query params (PII spec C-3)', () => {
    const ev = emptyEvent();
    ev.breadcrumbs = [
      {
        category: 'navigation',
        message: 'to /picks',
        data: { from: '/', to: '/picks?token=real-value&page=1' },
      },
      {
        category: 'fetch',
        data: { url: '/api/x', method: 'POST', email: 'a@b.com' },
      },
      {
        category: 'console',
        message: 'log',
        level: 'info',
      },
    ] as ErrorEvent['breadcrumbs'];
    const out = scrubSentryEvent(ev);
    const crumbs = out?.breadcrumbs as Array<Record<string, unknown>>;
    expect(crumbs).toHaveLength(3);
    expect((crumbs[0].data as Record<string, unknown>).from).toBe('/');
    // token query param scrubbed, page param 보존, path 보존
    expect((crumbs[0].data as Record<string, unknown>).to).toBe(
      `/picks?token=${FILTERED}&page=1`,
    );
    expect((crumbs[1].data as Record<string, unknown>).email).toBe(FILTERED);
    expect((crumbs[1].data as Record<string, unknown>).url).toBe('/api/x');
    expect(crumbs[2].category).toBe('console');
    expect(crumbs[2].level).toBe('info');
  });

  it('returns event unchanged when request/breadcrumbs absent (idempotent)', () => {
    const ev = emptyEvent();
    const out = scrubSentryEvent(ev);
    expect(out).not.toBeNull();
    expect(out?.request).toBeUndefined();
    expect(out?.breadcrumbs).toBeUndefined();
  });

  // cycle 442 — Y/C 후속 (Sentry/PII spec C-2). env 변수 키가 객체 key 로 dump 시
  // 'token'/'secret' 단일 키만으론 정확 매칭 실패 → SUPABASE_SERVICE_ROLE_KEY 등
  // silent 노출. 명시 키 + suffix 매칭 회귀 가드.
  it('scrubs env-style keys dumped as object keys (TELEGRAM_BOT_TOKEN/SERVICE_ROLE_KEY/PAT)', () => {
    const ev = emptyEvent();
    ev.extra = {
      env: {
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOi...',
        TELEGRAM_BOT_TOKEN: '12345:AAAA',
        SENTRY_AUTH_TOKEN: 'sntrys_xxx',
        PLAYBOOK_PAT: 'ghp_xxx',
        SENTRY_WEBHOOK_SECRET: 'whsec_xxx',
        NODE_ENV: 'production',
      },
    } as ErrorEvent['extra'];
    const out = scrubSentryEvent(ev);
    const env = (out?.extra as Record<string, unknown>).env as Record<string, unknown>;
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe(FILTERED);
    expect(env.TELEGRAM_BOT_TOKEN).toBe(FILTERED);
    expect(env.SENTRY_AUTH_TOKEN).toBe(FILTERED);
    expect(env.PLAYBOOK_PAT).toBe(FILTERED);
    expect(env.SENTRY_WEBHOOK_SECRET).toBe(FILTERED);
    expect(env.NODE_ENV).toBe('production');
  });

  // cycle 527 — URL 값 스크럽 unit 가드 (PII spec C-3).
  describe('scrubUrlString', () => {
    it('returns input unchanged when no query string', () => {
      expect(scrubUrlString('/picks')).toBe('/picks');
      expect(scrubUrlString('https://example.com/path')).toBe('https://example.com/path');
      expect(scrubUrlString('')).toBe('');
    });

    it('scrubs single sensitive query param', () => {
      expect(scrubUrlString('/x?token=abc')).toBe(`/x?token=${FILTERED}`);
      expect(scrubUrlString('/y?api_key=xyz')).toBe(`/y?api_key=${FILTERED}`);
    });

    it('preserves non-sensitive query params, scrubs sensitive ones', () => {
      expect(scrubUrlString('/x?page=1&token=abc&size=10')).toBe(
        `/x?page=1&token=${FILTERED}&size=10`,
      );
    });

    it('preserves fragment intact', () => {
      expect(scrubUrlString('/x?token=abc#section')).toBe(
        `/x?token=${FILTERED}#section`,
      );
    });

    it('handles absolute URLs', () => {
      expect(scrubUrlString('https://example.com/api?access_token=xyz&q=baseball')).toBe(
        `https://example.com/api?access_token=${FILTERED}&q=baseball`,
      );
    });

    it('handles suffix-matched sensitive keys (_token / _secret)', () => {
      expect(scrubUrlString('/x?my_token=abc&my_secret=def')).toBe(
        `/x?my_token=${FILTERED}&my_secret=${FILTERED}`,
      );
    });

    it('handles URL-encoded keys', () => {
      expect(scrubUrlString('/x?api%5Fkey=abc')).toBe(`/x?api%5Fkey=${FILTERED}`);
    });

    it('passes through valueless params (key only, no =)', () => {
      expect(scrubUrlString('/x?flag&page=1')).toBe('/x?flag&page=1');
    });
  });

  it('scrubs event.request.url query params (PII spec C-3)', () => {
    const ev = emptyEvent();
    ev.request = {
      url: 'https://moneyballscore.com/x?token=real-value&q=lg',
      method: 'GET',
    };
    const out = scrubSentryEvent(ev);
    const req = out?.request as Record<string, unknown>;
    expect(req.url).toBe(`https://moneyballscore.com/x?token=${FILTERED}&q=lg`);
  });

  it('scrubs dynamic-prefix keys via suffix match (_token/_secret/_password)', () => {
    const ev = emptyEvent();
    ev.extra = {
      MY_CLIENT_SECRET: 's1',
      X_BOT_TOKEN: 't1',
      ADMIN_PASSWORD: 'p1',
      legacy_passwd: 'p2',
      // false positive 회피 — `_key`/`_id` 는 suffix list 제외
      region_key: 'kr',
      game_id: '12345',
      cache_key: 'abc',
    } as ErrorEvent['extra'];
    const out = scrubSentryEvent(ev);
    const ex = out?.extra as Record<string, unknown>;
    expect(ex.MY_CLIENT_SECRET).toBe(FILTERED);
    expect(ex.X_BOT_TOKEN).toBe(FILTERED);
    expect(ex.ADMIN_PASSWORD).toBe(FILTERED);
    expect(ex.legacy_passwd).toBe(FILTERED);
    // false positive 회피 — pass-through
    expect(ex.region_key).toBe('kr');
    expect(ex.game_id).toBe('12345');
    expect(ex.cache_key).toBe('abc');
  });
});
