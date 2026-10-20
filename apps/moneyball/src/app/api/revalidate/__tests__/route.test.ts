// cycle 3403 — review-code(heavy): app/api/revalidate 테스트 공백 보강

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const revalidatePathMock = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const SECRET = 'test-cron-secret';

function makeRequest(body: unknown, authOverride?: string | null): NextRequest {
  const auth = authOverride !== undefined ? authOverride : `Bearer ${SECRET}`;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (auth !== null) headers.set('authorization', auth);

  return new NextRequest('http://localhost/api/revalidate', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    vi.clearAllMocks();
  });

  it('Authorization 헤더 없음 → 401', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ paths: ['/'] }, null));
    expect(resp.status).toBe(401);
  });

  it('CRON_SECRET 미설정 → 401 (빈 문자열도 거부)', async () => {
    process.env.CRON_SECRET = '';
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ paths: ['/'] }));
    expect(resp.status).toBe(401);
  });

  it('Authorization 값 불일치 → 401', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ paths: ['/'] }, 'Bearer wrong-secret'));
    expect(resp.status).toBe(401);
  });

  it('paths 지정 시 "/" 접두 아닌 항목 필터링', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({ paths: ['/predictions', 'no-slash', '/'] }));
    expect(resp.status).toBe(200);
    const json = await resp.json();
    expect(json.revalidated).toEqual(['/predictions', '/']);
    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
  });

  it('paths 10개 초과 시 앞 10개만 처리', async () => {
    const { POST } = await import('../route');
    const paths = Array.from({ length: 15 }, (_, i) => `/p${i}`);
    const resp = await POST(makeRequest({ paths }));
    const json = await resp.json();
    expect(json.revalidated).toHaveLength(10);
    expect(revalidatePathMock).toHaveBeenCalledTimes(10);
  });

  it('body 에 paths 없음 → 기본 경로(/, /predictions) 사용', async () => {
    const { POST } = await import('../route');
    const resp = await POST(makeRequest({}));
    const json = await resp.json();
    expect(json.revalidated).toEqual(['/', '/predictions']);
  });

  it('잘못된 JSON body → 기본 경로로 fallback (400 아님)', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost/api/revalidate', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', authorization: `Bearer ${SECRET}` }),
      body: '{not json',
    });
    const resp = await POST(req);
    expect(resp.status).toBe(200);
    const json = await resp.json();
    expect(json.revalidated).toEqual(['/', '/predictions']);
  });
});
