import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../sitemap', () => ({
  default: vi.fn(() =>
    Promise.resolve([
      { url: 'https://moneyballscore.vercel.app/', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
      { url: 'https://moneyballscore.vercel.app/predictions', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: 'https://moneyballscore.vercel.app/accuracy', lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    ]),
  ),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

async function callGet(headers: Record<string, string> = {}) {
  const { GET } = await import('../route');
  const req = new Request('http://localhost/api/seo/indexnow/ping', {
    method: 'GET',
    headers,
  });
  return GET(req as never);
}

describe('GET /api/seo/indexnow/ping', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('OK', { status: 200 }));
    process.env.CRON_SECRET = 'test-secret';
    process.env.INDEXNOW_KEY = 'abc123def456';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.INDEXNOW_KEY;
  });

  it('auth 부재 → 401', async () => {
    const res = await callGet({});
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('잘못된 secret → 401', async () => {
    const res = await callGet({ authorization: 'Bearer wrong' });
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('INDEXNOW_KEY 부재 → 503', async () => {
    delete process.env.INDEXNOW_KEY;
    const res = await callGet({ authorization: 'Bearer test-secret' });
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('정상 호출 → IndexNow API POST + urlCount 양수', async () => {
    const res = await callGet({ authorization: 'Bearer test-secret' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.urlCount).toBe(3);
    expect(json.host).toBe('moneyballscore.vercel.app');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe('https://api.indexnow.org/IndexNow');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.host).toBe('moneyballscore.vercel.app');
    expect(body.key).toBe('abc123def456');
    expect(body.keyLocation).toBe('https://moneyballscore.vercel.app/abc123def456.txt');
    expect(body.urlList).toHaveLength(3);
  });

  // cycle 3217 — Vercel 대시보드 값에 트레일링 개행 섞이는 사례 실측(LLM_BACKEND_HAIKU
  // 동일 클래스 버그) → INDEXNOW_KEY 도 같은 위험. keyLocation 파일 내용(별도 route)과
  // POST body 의 key 가 바이트 단위로 어긋나면 IndexNow ownership 검증이 영구 실패한다.
  it('INDEXNOW_KEY 에 트레일링 개행 → trim 후 POST body/keyLocation 양쪽 깨끗한 key 사용', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456\n';
    const res = await callGet({ authorization: 'Bearer test-secret' });
    expect(res.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.key).toBe('abc123def456');
    expect(body.keyLocation).toBe('https://moneyballscore.vercel.app/abc123def456.txt');
  });

  it('IndexNow API 실패 → ok=false + response body 박제', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"errorCode":"InvalidRequestParameters","message":"test"}', { status: 422 }),
    );
    const res = await callGet({ authorization: 'Bearer test-secret' });
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.status).toBe(422);
    expect(json.indexnowResponse).toContain('InvalidRequestParameters');
  });
});
