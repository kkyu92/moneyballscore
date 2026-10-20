// cycle 3403 — review-code(heavy): app/api/snapshot-pitchers 테스트 공백 보강

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const snapshotPitcherStatsMock = vi.fn();
const captureExceptionMock = vi.fn();
const captureMessageMock = vi.fn();

vi.mock('@moneyball/kbo-data', () => ({
  snapshotPitcherStats: (...args: unknown[]) => snapshotPitcherStatsMock(...args),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
  captureMessage: (...args: unknown[]) => captureMessageMock(...args),
}));

vi.mock('@moneyball/shared', () => ({
  errMsg: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

const SECRET = 'test-cron-secret';

function makeRequest(body: unknown, authOverride?: string | null): NextRequest {
  const auth = authOverride !== undefined ? authOverride : `Bearer ${SECRET}`;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (auth !== null) headers.set('authorization', auth);

  return new NextRequest('http://localhost/api/snapshot-pitchers', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/snapshot-pitchers', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    vi.clearAllMocks();
  });

  it('Authorization 헤더 없음 → 401', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({}, null));
    expect(resp.status).toBe(401);
  });

  it('season 미지정 → 현재 연도로 호출', async () => {
    snapshotPitcherStatsMock.mockResolvedValue({ errors: 0 });
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({}));
    expect(resp.status).toBe(200);
    expect(snapshotPitcherStatsMock).toHaveBeenCalledWith({ season: new Date().getFullYear() });
  });

  it('season 범위 밖(2019) → 현재 연도로 fallback', async () => {
    snapshotPitcherStatsMock.mockResolvedValue({ errors: 0 });
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ season: 2019 }));
    expect(resp.status).toBe(200);
    expect(snapshotPitcherStatsMock).toHaveBeenCalledWith({ season: new Date().getFullYear() });
  });

  it('season 유효 범위 내 → 그대로 전달', async () => {
    snapshotPitcherStatsMock.mockResolvedValue({ errors: 0 });
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ season: 2026 }));
    expect(resp.status).toBe(200);
    expect(snapshotPitcherStatsMock).toHaveBeenCalledWith({ season: 2026 });
  });

  it('부분 실패 (errors > 0) → 207 + Sentry warning', async () => {
    snapshotPitcherStatsMock.mockResolvedValue({ errors: 3 });
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ season: 2026 }));
    expect(resp.status).toBe(207);
    expect(captureMessageMock).toHaveBeenCalledWith(
      'snapshot-pitchers partial failure',
      expect.objectContaining({ level: 'warning' }),
    );
  });

  it('snapshotPitcherStats throw → 500', async () => {
    snapshotPitcherStatsMock.mockRejectedValue(new Error('fancystats unreachable'));
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ season: 2026 }));
    expect(resp.status).toBe(500);
    const json = await resp.json();
    expect(json.error).toBe('fancystats unreachable');
    expect(captureExceptionMock).toHaveBeenCalled();
  });
});
