// Plan C Task 3 — /api/mlb/pipeline route 테스트
// 인증 성공/실패, mode 검증, runMlbPipeline mock 호출 확인

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── mock 의존성 ────────────────────────────────────────────────────────────────

vi.mock('@moneyball/kbo-data', () => ({
  runMlbPipeline: vi.fn().mockResolvedValue({
    mode: 'mlb_statsapi_scrape',
    date: '2026-06-12',
    games_found: 3,
    rows_inserted: 3,
    errors: [],
    triggered_by: 'api',
  }),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@moneyball/shared', () => ({
  errMsg: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

const SECRET = 'test-cron-secret';

function makeRequest(
  body: Record<string, unknown>,
  authOverride?: string | null,
): NextRequest {
  const auth = authOverride !== undefined ? authOverride : `Bearer ${SECRET}`;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (auth !== null) headers.set('authorization', auth);

  return new NextRequest('http://localhost/api/mlb/pipeline', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/mlb/pipeline', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    vi.clearAllMocks();
  });

  it('인증 성공 + valid mode → 200 ok:true', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ mode: 'mlb_statsapi_scrape', date: '2026-06-12' }));
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.ok).toBe(true);
    expect(body.result).toBeDefined();
  });

  it('Authorization 헤더 없음 → 401', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ mode: 'mlb_statsapi_scrape' }, null));
    expect(resp.status).toBe(401);
    const body = await resp.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('잘못된 Bearer secret → 401', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ mode: 'mlb_statsapi_scrape' }, 'Bearer wrong'));
    expect(resp.status).toBe(401);
  });

  it('mode 없음 → 400', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({}));
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe('invalid mode');
  });

  it('유효하지 않은 mode → 400', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ mode: 'invalid_mode' }));
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.valid_modes).toBeInstanceOf(Array);
    expect(body.received).toBe('invalid_mode');
  });

  it('KBO mode (predict_final) → 400 (MLB route에서 불허)', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ mode: 'predict_final' }));
    expect(resp.status).toBe(400);
  });

  it.each([
    'mlb_statsapi_scrape',
    'mlb_fancy_scrape',
    'mlb_savant_scrape',
    'mlb_predict_final',
    'mlb_combined_notify',
    'mlb_shadow_train',
    'mlb_walk_forward_measure',
  ] as const)('%s → runMlbPipeline 호출됨', async (mode) => {
    const { POST } = await import('../route');
    const { runMlbPipeline } = await import('@moneyball/kbo-data');
    vi.clearAllMocks();

    const resp = await POST(makeRequest({ mode, date: '2026-06-12', triggeredBy: 'test' }));
    expect(resp.status).toBe(200);
    expect(runMlbPipeline).toHaveBeenCalledWith(mode, '2026-06-12', 'test');
  });

  it('runMlbPipeline throw → 500', async () => {
    const { POST } = await import('../route');
    const { runMlbPipeline } = await import('@moneyball/kbo-data');
    vi.mocked(runMlbPipeline).mockRejectedValueOnce(new Error('DB connection failed'));

    const resp = await POST(makeRequest({ mode: 'mlb_statsapi_scrape' }));
    expect(resp.status).toBe(500);
    const body = await resp.json();
    expect(body.error).toBe('DB connection failed');
  });

  it('date 미지정 시 today KST 사용 (runMlbPipeline 호출됨)', async () => {
    const { POST } = await import('../route');
    const { runMlbPipeline } = await import('@moneyball/kbo-data');
    vi.clearAllMocks();

    const resp = await POST(makeRequest({ mode: 'mlb_statsapi_scrape' }));
    expect(resp.status).toBe(200);
    // date 가 YYYY-MM-DD 형식인지 확인
    const calledDate = vi.mocked(runMlbPipeline).mock.calls[0][1];
    expect(calledDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('maxDuration export = 300', async () => {
    const routeModule = await import('../route');
    expect(routeModule.maxDuration).toBe(300);
  });
});
