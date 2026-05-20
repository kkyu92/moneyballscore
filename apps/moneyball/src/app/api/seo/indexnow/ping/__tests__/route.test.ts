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
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
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
    expect(body.keyLocation).toBe('https://moneyballscore.vercel.app/api/seo/indexnow/key.txt');
    expect(body.urlList).toHaveLength(3);
  });

  it('IndexNow API 실패 → ok=false 그대로 반환', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 422 }));
    const res = await callGet({ authorization: 'Bearer test-secret' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.status).toBe(422);
  });
});
