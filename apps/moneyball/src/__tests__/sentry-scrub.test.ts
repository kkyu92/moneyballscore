import { describe, it, expect } from 'vitest';
import type { ErrorEvent } from '@sentry/nextjs';
import { scrubSentryEvent } from '../sentry-scrub';

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

  it('scrubs event.breadcrumbs array — nav url / fetch data PII', () => {
    const ev = emptyEvent();
    ev.breadcrumbs = [
      {
        category: 'navigation',
        message: 'to /picks',
        data: { from: '/', to: '/picks?token=real-value' },
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
    expect((crumbs[0].data as Record<string, unknown>).to).toBe('/picks?token=real-value');
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
});
