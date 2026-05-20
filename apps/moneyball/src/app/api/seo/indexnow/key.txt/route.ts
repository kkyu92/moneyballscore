// IndexNow protocol key 검증 endpoint.
// keyLocation 경로 — Bing/Naver/Yandex 가 본 endpoint 를 GET 해서 응답 본문이 키와
// 일치하는지 확인. 일치 시에만 ping body 의 urlList 채택.
// spec: https://www.indexnow.org/documentation

export async function GET(): Promise<Response> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new Response('INDEXNOW_KEY env not configured', { status: 503 });
  }
  return new Response(key, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
