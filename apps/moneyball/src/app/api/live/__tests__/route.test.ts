// cycle 3403 — review-code(heavy): app/api/live 테스트 공백 보강

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const runLiveUpdateMock = vi.fn();
const captureExceptionMock = vi.fn();
const captureMessageMock = vi.fn();

vi.mock('@moneyball/kbo-data', () => ({
  runLiveUpdate: (...args: unknown[]) => runLiveUpdateMock(...args),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
  captureMessage: (...args: unknown[]) => captureMessageMock(...args),
}));

vi.mock('@moneyball/shared', () => ({
  errMsg: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

const SECRET = 'test-cron-secret';
const fetchMock = vi.fn();

function makeRequest(body: unknown, authOverride?: string | null): NextRequest {
  const auth = authOverride !== undefined ? authOverride : `Bearer ${SECRET}`;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (auth !== null) headers.set('authorization', auth);

  return new NextRequest('http://localhost/api/live', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/live', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('Authorization 헤더 없음 → 401', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({}, null));
    expect(resp.status).toBe(401);
  });

  it('업데이트 없음 → revalidate 호출 안 함, 200', async () => {
    runLiveUpdateMock.mockResolvedValue({ updated: 0, errors: [] });
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ date: '2026-10-20' }));
    expect(resp.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('업데이트 있음 → /api/revalidate 호출', async () => {
    runLiveUpdateMock.mockResolvedValue({ updated: 2, errors: [] });
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ date: '2026-10-20' }));
    expect(resp.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/revalidate'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('revalidate fetch 실패해도 live update 성공 자체는 200 유지 (silent false-failure 방지)', async () => {
    runLiveUpdateMock.mockResolvedValue({ updated: 1, errors: [] });
    fetchMock.mockRejectedValue(new Error('revalidate unreachable'));
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ date: '2026-10-20' }));
    expect(resp.status).toBe(200);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: expect.objectContaining({ sub: 'revalidate' }) }),
    );
  });

  it('부분 실패 (errors 존재) → 207 + Sentry warning', async () => {
    runLiveUpdateMock.mockResolvedValue({ updated: 1, errors: ['game 123 failed'] });
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ date: '2026-10-20' }));
    expect(resp.status).toBe(207);
    expect(captureMessageMock).toHaveBeenCalledWith('live partial failure', expect.objectContaining({ level: 'warning' }));
  });

  it('runLiveUpdate throw → 500', async () => {
    runLiveUpdateMock.mockRejectedValue(new Error('db down'));
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ date: '2026-10-20' }));
    expect(resp.status).toBe(500);
    const json = await resp.json();
    expect(json.error).toBe('db down');
  });
});
