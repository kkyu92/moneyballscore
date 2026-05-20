import type { NextRequest } from 'next/server';
import sitemap from '../../../../sitemap';

// IndexNow ping endpoint.
// 매일 1회 cron 호출 → 본 앱 sitemap() 직접 호출 → URL 추출 → IndexNow API POST.
// Bing / Naver / Yandex / Seznam 동시 ping (단일 endpoint, 자동 분배).
// Google 은 IndexNow 미지원 (2026-05 기준) → Google 색인은 sitemap.xml 만 의존.
// spec: https://www.indexnow.org/documentation

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
const HOST = 'moneyballscore.vercel.app';
const MAX_URLS = 10000;

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return Response.json({ error: 'INDEXNOW_KEY env not configured' }, { status: 503 });
  }

  const entries = await sitemap();
  const urlList = entries
    .map((e) => e.url)
    .filter((u): u is string => typeof u === 'string' && u.startsWith(`https://${HOST}/`))
    .slice(0, MAX_URLS);

  if (urlList.length === 0) {
    return Response.json({ error: 'sitemap returned 0 URLs' }, { status: 500 });
  }

  const keyLocation = `https://${HOST}/api/seo/indexnow/key.txt`;
  const body = { host: HOST, key, keyLocation, urlList };

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  return Response.json({
    ok: response.ok,
    status: response.status,
    urlCount: urlList.length,
    host: HOST,
    timestamp: new Date().toISOString(),
  });
}
