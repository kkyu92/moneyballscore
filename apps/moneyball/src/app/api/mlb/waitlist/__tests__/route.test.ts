import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface InsertResult {
  error: { message: string; code?: string } | null;
}

let insertResult: InsertResult;
let insertCalls: Array<Record<string, unknown>>;

function makeAdminMock() {
  return {
    from: vi.fn(() => ({
      insert: vi.fn((row: Record<string, unknown>) => {
        insertCalls.push(row);
        return Promise.resolve(insertResult);
      }),
    })),
  };
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => makeAdminMock()),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
}));

const ORIGIN = 'https://moneyballscore.vercel.app';

async function callPost(
  body: unknown,
  opts: { origin?: string | null; raw?: string } = {},
) {
  const { POST } = await import('../route');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts.origin !== null) {
    headers['Origin'] = opts.origin ?? ORIGIN;
  }
  const req = new Request('http://localhost/api/mlb/waitlist', {
    method: 'POST',
    headers,
    body: opts.raw ?? JSON.stringify(body),
  });
  return POST(req as never);
}

describe('POST /api/mlb/waitlist', () => {
  beforeEach(() => {
    insertResult = { error: null };
    insertCalls = [];
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('valid email + allowed origin → 200 { ok: true } + insert called', async () => {
    const res = await callPost({ email: 'fan@example.com' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      league: 'mlb',
      email: 'fan@example.com',
    });
  });

  it('duplicate email (23505 unique violation) → 200 { ok: true } (enumeration 보호)', async () => {
    insertResult = {
      error: { message: 'duplicate key', code: '23505' },
    };
    const res = await callPost({ email: 'dup@example.com' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('invalid email format → 400', async () => {
    const res = await callPost({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it('Supabase non-unique error → 500 + Sentry capture', async () => {
    insertResult = {
      error: { message: 'connection timeout', code: '57P01' },
    };
    const Sentry = await import('@sentry/nextjs');
    const res = await callPost({ email: 'fan@example.com' });
    expect(res.status).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalled();
    expect(Sentry.flush).toHaveBeenCalledWith(2000);
  });

  it('honeypot _hp filled → 200 silent (insert skip)', async () => {
    const res = await callPost({ email: 'bot@example.com', _hp: 'bot-trap' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(insertCalls).toHaveLength(0);
  });

  it('missing email field → 400', async () => {
    const res = await callPost({ name: 'no-email' });
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it('Origin missing → 403 forbidden', async () => {
    const res = await callPost({ email: 'fan@example.com' }, { origin: null });
    expect(res.status).toBe(403);
    expect(insertCalls).toHaveLength(0);
  });

  it('Origin mismatched (외부 도메인) → 403 forbidden', async () => {
    const res = await callPost(
      { email: 'fan@example.com' },
      { origin: 'https://evil.example.com' },
    );
    expect(res.status).toBe(403);
    expect(insertCalls).toHaveLength(0);
  });
});
