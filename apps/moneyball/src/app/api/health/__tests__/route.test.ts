import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let leaguesCount: number | null = 5;
let leaguesError: { message: string } | null = null;
let pipelineData:
  | { run_date: string; mode: string; status: string; created_at: string }
  | null = null;
let pipelineError: { message: string } | null = null;
let kboFetchImpl: () => Promise<Response> = () =>
  Promise.resolve(new Response('', { status: 200 }));

function makeSupabaseMock() {
  const leaguesBuilder = {
    select: vi.fn().mockImplementation(() =>
      Promise.resolve({ count: leaguesCount, data: null, error: leaguesError }),
    ),
  };
  const pipelineBuilder: {
    select: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn().mockImplementation(() => pipelineBuilder),
    order: vi.fn().mockImplementation(() => pipelineBuilder),
    limit: vi.fn().mockImplementation(() => pipelineBuilder),
    single: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: pipelineData, error: pipelineError }),
    ),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === 'leagues') return leaguesBuilder;
      if (table === 'pipeline_runs') return pipelineBuilder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => makeSupabaseMock()),
}));

async function callGet() {
  const { GET } = await import('../route');
  return GET();
}

describe('GET /api/health (plan #11 Step 2)', () => {
  const originalSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    leaguesCount = 5;
    leaguesError = null;
    pipelineData = {
      run_date: '2026-05-26',
      mode: 'predict',
      status: 'success',
      created_at: '2026-05-26T07:00:00Z',
    };
    pipelineError = null;
    kboFetchImpl = () => Promise.resolve(new Response('', { status: 200 }));
    globalThis.fetch = vi.fn((...args: Parameters<typeof fetch>) => {
      const url = String(args[0]);
      if (url.includes('koreabaseball.com')) return kboFetchImpl();
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    }) as typeof fetch;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalSha !== undefined) process.env.VERCEL_GIT_COMMIT_SHA = originalSha;
    vi.clearAllMocks();
  });

  it('모두 ok + valid SHA → 200 + overall=ok + cache-control no-store', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abcdef0123456789abcdef0123456789abcdef01';
    const res = await callGet();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.overall).toBe('ok');
    expect(body.status).toBe('healthy');
    expect(body.checks.supabase.status).toBe('ok');
    expect(body.checks.kbo_api.status).toBe('ok');
    expect(body.checks.deploy_alias.status).toBe('ok');
    expect(body.checks.deploy_alias.detail).toBe('abcdef0');
    expect(typeof body.latency_ms).toBe('number');
    expect(body.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('supabase select error → 503 + overall=fail', async () => {
    leaguesCount = null;
    leaguesError = { message: 'connection refused' };
    const res = await callGet();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.overall).toBe('fail');
    expect(body.status).toBe('unhealthy');
    expect(body.checks.supabase.status).toBe('error');
    expect(body.checks.supabase.detail).toContain('connection refused');
  });

  it('kbo_api 봇 차단 (HTTP 403) → degraded + 200 (supabase ok 보존)', async () => {
    kboFetchImpl = () => Promise.resolve(new Response('blocked', { status: 403 }));
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.overall).toBe('degraded');
    expect(body.checks.kbo_api.status).toBe('warning');
    expect(body.checks.kbo_api.detail).toContain('403');
  });

  it('kbo_api fetch reject (network error) → 503 + overall=fail', async () => {
    kboFetchImpl = () => Promise.reject(new Error('ETIMEDOUT'));
    const res = await callGet();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.overall).toBe('fail');
    expect(body.checks.kbo_api.status).toBe('error');
    expect(body.checks.kbo_api.detail).toContain('ETIMEDOUT');
  });

  it('VERCEL_GIT_COMMIT_SHA 부재 → deploy_alias warning + overall=degraded + 200', async () => {
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checks.deploy_alias.status).toBe('warning');
    expect(body.checks.deploy_alias.detail).toContain('not set');
    expect(body.overall).toBe('degraded');
  });

  it('VERCEL_GIT_COMMIT_SHA invalid hex → deploy_alias error + 503', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'not-a-valid-sha';
    const res = await callGet();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.checks.deploy_alias.status).toBe('error');
    expect(body.overall).toBe('fail');
  });
});
