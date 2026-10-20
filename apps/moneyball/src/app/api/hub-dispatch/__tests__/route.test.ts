import { createHmac } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const SECRET = 'test-webhook-secret';
const PAT = 'test-playbook-pat';

let fetchImpl: () => Promise<Response> = () =>
  Promise.resolve(new Response('{}', { status: 200 }));
const captureMessage = vi.fn();
const setTag = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
  getCurrentScope: () => ({ setTag }),
}));

function sign(body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

const SAMPLE_EVENT = {
  data: {
    event: {
      level: 'error',
      title: 'TypeError: boom',
      environment: 'production',
      exception: { values: [{ type: 'TypeError', value: 'boom' }] },
    },
  },
};

function makeRequest(opts: {
  body?: string;
  signature?: string | null;
  query?: string;
}): NextRequest {
  const body = opts.body ?? JSON.stringify(SAMPLE_EVENT);
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (opts.signature !== null) {
    headers.set(
      'sentry-hook-signature',
      opts.signature ?? sign(body),
    );
  }
  return new NextRequest(
    `http://localhost/api/hub-dispatch${opts.query ?? ''}`,
    { method: 'POST', headers, body },
  );
}

async function callPost(opts: Parameters<typeof makeRequest>[0] = {}) {
  const { POST } = await import('../route');
  return POST(makeRequest(opts));
}

describe('POST /api/hub-dispatch', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.VERCEL_ENV = 'production';
    process.env.SENTRY_WEBHOOK_SECRET = SECRET;
    process.env.PLAYBOOK_PAT = PAT;
    process.env.GITHUB_REPOSITORY = 'kkyu92/moneyballscore';
    fetchImpl = () => Promise.resolve(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', vi.fn(() => fetchImpl()));
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it('non-production env + no dry_run → 403 unauthorized, no signature check reached', async () => {
    process.env.VERCEL_ENV = 'preview';
    const res = await callPost({ signature: null });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.status).toBe('unauthorized');
  });

  it('non-production env + dry_run=1 → bypasses env guard', async () => {
    process.env.VERCEL_ENV = 'preview';
    const res = await callPost({ query: '?dry_run=1' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('dry_run');
  });

  it('missing SENTRY_WEBHOOK_SECRET → 500 error + Sentry captureMessage', async () => {
    delete process.env.SENTRY_WEBHOOK_SECRET;
    const res = await callPost();
    expect(res.status).toBe(500);
    expect(captureMessage).toHaveBeenCalledWith(
      'hub-dispatch missing secrets',
      expect.objectContaining({ level: 'error' }),
    );
  });

  it('missing signature header → 401 unauthorized', async () => {
    const res = await callPost({ signature: null });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.status).toBe('unauthorized');
  });

  it('signature mismatch → 401 unauthorized', async () => {
    const res = await callPost({ signature: sign('different-body') });
    expect(res.status).toBe(401);
  });

  it('valid signature + malformed JSON → 400 invalid', async () => {
    const body = 'not json';
    const res = await callPost({ body, signature: sign(body) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe('invalid');
  });

  it('valid signature + missing event field → 400 invalid', async () => {
    const body = JSON.stringify({ data: {} });
    const res = await callPost({ body, signature: sign(body) });
    expect(res.status).toBe(400);
  });

  it('dry_run=1 → builds payload, logs, skips GitHub dispatch', async () => {
    const fetchSpy = vi.fn(() => fetchImpl());
    vi.stubGlobal('fetch', fetchSpy);
    const res = await callPost({ query: '?dry_run=1' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('dry_run');
    expect(json.fingerprint).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('valid request → dispatches to GitHub repository_dispatch with Bearer PAT', async () => {
    const fetchSpy = vi.fn(() => fetchImpl());
    vi.stubGlobal('fetch', fetchSpy);
    const res = await callPost();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('dispatched');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/kkyu92/playbook/dispatches',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer ${PAT}` }),
      }),
    );
  });

  it('GitHub dispatch failure → 502 error + Sentry captureMessage', async () => {
    fetchImpl = () => Promise.resolve(new Response('bad request', { status: 422 }));
    vi.stubGlobal('fetch', vi.fn(() => fetchImpl()));
    const res = await callPost();
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.status).toBe('error');
    expect(captureMessage).toHaveBeenCalledWith(
      'hub-dispatch GitHub relay failure',
      expect.objectContaining({ level: 'error' }),
    );
  });

  it('sets no-relay Sentry scope tag on every request', async () => {
    await callPost({ query: '?dry_run=1' });
    expect(setTag).toHaveBeenCalledWith('no-relay', 'true');
  });
});

describe('GET /api/hub-dispatch', () => {
  it('returns ok health marker', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, route: '/api/hub-dispatch' });
  });
});
