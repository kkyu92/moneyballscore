import type { NextRequest } from 'next/server';
import sitemap from '../../../../sitemap';
import { SITE_HOST } from '@moneyball/shared';

// IndexNow ping endpoint.
// 매일 1회 cron 호출 → 본 앱 sitemap() 직접 호출 → URL 추출 → IndexNow API POST.
// Bing / Naver / Yandex / Seznam 동시 ping (단일 endpoint, 자동 분배).
// Google 은 IndexNow 미지원 (2026-05 기준) → Google 색인은 sitemap.xml 만 의존.
// spec: https://www.indexnow.org/documentation

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
const HOST = SITE_HOST;
const MAX_URLS = 10000;

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // .trim() 필수 — 대시보드 값에 트레일링 개행이 섞이면 keyLocation 파일 내용과
  // POST 로 전송하는 key 가 바이트 단위로 달라져 IndexNow 측 ownership 검증이
  // 영구히 실패한다 (실측: packages/kbo-data/src/agents/llm.ts LLM_BACKEND_HAIKU
  // 동일 클래스 버그, cycle 3217). [indexnowKey].txt route 의 trim 과 반드시 짝 유지.
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return Response.json({ error: 'INDEXNOW_KEY env not configured' }, { status: 503 });
  }

  const entries = await sitemap();
  const urlList = entries
    .map((e) => e.url)
    .filter((u): u is string => {
      if (typeof u !== 'string') return false;
      try {
        return new URL(u).host === HOST;
      } catch {
        return false;
      }
    })
    .slice(0, MAX_URLS);

  if (urlList.length === 0) {
    return Response.json({ error: 'sitemap returned 0 URLs' }, { status: 500 });
  }

  const keyLocation = `https://${HOST}/${key}.txt`;
  const body = { host: HOST, key, keyLocation, urlList };

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  const responseBody = await response.text().catch(() => '');

  // 호출 cron(indexnow-ping.yml) 은 HTTP status 만 보고 body 의 ok 필드는 안 읽음 —
  // IndexNow API 실패를 outer status 로도 반영해야 silent swallow 안 됨.
  return Response.json(
    {
      ok: response.ok,
      status: response.status,
      urlCount: urlList.length,
      host: HOST,
      timestamp: new Date().toISOString(),
      indexnowResponse: responseBody.slice(0, 500),
    },
    { status: response.ok ? 200 : 502 },
  );
}
