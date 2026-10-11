// cycle 3054 — review-code(heavy): mode 검증 400 반환 + triggeredBy VARCHAR(20) clamp 회귀 테스트

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@moneyball/kbo-data', () => ({
  runDailyPipeline: vi.fn().mockResolvedValue({
    mode: 'predict',
    date: '2026-06-12',
    predictionsGenerated: 0,
  }),
  notifyError: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@moneyball/shared', () => ({
  errMsg: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

const SECRET = 'test-cron-secret';

function makeRequest(
  body: Record<string, unknown>,
  authOverride?: string | null,
): NextRequest {
  const auth = authOverride !== undefined ? authOverride : `Bearer ${SECRET}`;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (auth !== null) headers.set('authorization', auth);

  return new NextRequest('http://localhost/api/pipeline', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/pipeline', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    vi.clearAllMocks();
  });

  it('Authorization 헤더 없음 → 401', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ mode: 'predict' }, null));
    expect(resp.status).toBe(401);
  });

  it('mode 없음 → 400 (predict silent fallback 금지)', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({}));
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe('invalid mode');
  });

  it('인식 안 되는 mode → 400', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ mode: 'not_a_real_mode' }));
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.valid_modes).toEqual(['announce', 'predict', 'predict_final', 'verify']);
    expect(body.received).toBe('not_a_real_mode');
  });

  it.each(['announce', 'predict', 'predict_final', 'verify'] as const)(
    '%s → runDailyPipeline 호출됨',
    async (mode) => {
      const { POST } = await import('../route');
      const { runDailyPipeline } = await import('@moneyball/kbo-data');
      vi.clearAllMocks();

      const resp = await POST(makeRequest({ mode, date: '2026-06-12' }));
      expect(resp.status).toBe(200);
      expect(runDailyPipeline).toHaveBeenCalledWith('2026-06-12', mode, 'api');
    },
  );

  it('triggeredBy 20자 초과 시 VARCHAR(20) 경계로 clamp', async () => {
    const { POST } = await import('../route');
    const { runDailyPipeline } = await import('@moneyball/kbo-data');

    const longValue = 'x'.repeat(50);
    await POST(makeRequest({ mode: 'predict', triggeredBy: longValue }));

    const calledTriggeredBy = vi.mocked(runDailyPipeline).mock.calls[0][2];
    expect(calledTriggeredBy).toBe(longValue.slice(0, 20));
    expect((calledTriggeredBy as string).length).toBe(20);
  });

  it('runDailyPipeline throw → 500', async () => {
    const { POST } = await import('../route');
    const { runDailyPipeline } = await import('@moneyball/kbo-data');
    vi.mocked(runDailyPipeline).mockRejectedValueOnce(new Error('DB connection failed'));

    const resp = await POST(makeRequest({ mode: 'predict' }));
    expect(resp.status).toBe(500);
    const body = await resp.json();
    expect(body.error).toBe('DB connection failed');
  });
});
