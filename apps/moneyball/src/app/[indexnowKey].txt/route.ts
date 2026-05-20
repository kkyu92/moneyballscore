// IndexNow protocol root-level key verification file.
// Bing/Naver/Yandex 측이 ownership 검증 시 `https://<host>/<key>.txt` GET 호출.
// 본 동적 route 는 path segment 가 INDEXNOW_KEY env 와 일치할 때만 200 + key body 반환.
// 비표준 path (`/api/seo/...`) 사용 시 IndexNow API 422 "URLs not related to site
// verified through keylocation" 응답 — root 위치 필수.
// spec: https://www.indexnow.org/documentation
//
// Next.js 16 type generation 이 `[indexnowKey].txt` segment 인식 X — params 타입
// generic Record 로 우회.

export async function GET(
  _request: Request,
  { params }: { params: Promise<Record<string, string>> },
): Promise<Response> {
  const { indexnowKey } = await params;
  const key = process.env.INDEXNOW_KEY;
  if (!key || indexnowKey !== key) {
    return new Response('not found', { status: 404 });
  }
  return new Response(key, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
