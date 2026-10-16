// IndexNow protocol root-level key verification file.
// Bing/Naver/Yandex 측이 ownership 검증 시 `https://<host>/<key>.txt` GET 호출.
// 본 동적 route 는 path segment 가 INDEXNOW_KEY env 와 일치할 때만 200 + key body 반환.
// 비표준 path (`/api/seo/...`) 사용 시 IndexNow API 422 "URLs not related to site
// verified through keylocation" 응답 — root 위치 필수.
// spec: https://www.indexnow.org/documentation
//
// Next.js 16 type generation 이 `[indexnowKey].txt` segment 인식 X — params 타입
// generic Record 로 우회.
//
// generateStaticParams 필수 (cycle 3241 fix-incident 박제): 이 없으면 Next.js 가
// 본 route 를 dynamic(ƒ)으로 빌드하는데, Vercel 배포 환경에서 "폴더명에 리터럴
// 확장자(.txt)가 붙은 dynamic segment"는 dynamic function 으로는 edge 라우팅
// manifest 에 등록되지 않아 올바른 key 로 요청해도 플랫폼 레벨 `/_not-found` 로
// 떨어짐 (x-matched-path 로 실측 확인 — 함수가 실행조차 안 됨, 코드 내부 404 아님).
// static(●)으로 전환해야 Vercel 라우팅에 정상 등록됨 (robots.txt/sitemap.xml 과
// 동일 정적 서빙 경로). INDEXNOW_KEY 는 빌드 시점에 고정된 값이라 static 전환 가능.
// 이 버그로 Bing IndexNow ownership 검증이 처음부터 계속 실패해왔으나, ping route 의
// 구 silent-200-swallow 버그(a5e61e7f)에 가려 cron 실패로 드러나지 않다가 그 fix 이후
// 502 로 노출됨 (cycle 3241 진단).
export async function generateStaticParams(): Promise<{ indexnowKey: string }[]> {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key ? [{ indexnowKey: key }] : [];
}

export const dynamicParams = false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<Record<string, string>> },
): Promise<Response> {
  // generateStaticParams + dynamicParams=false 조합의 fallback 404 정적 생성
  // 패스에서 Next.js 가 params 자체를 undefined 로 호출하는 케이스 존재 — 방어적 ?? {}.
  const { indexnowKey } = (await params) ?? {};
  // .trim() — ping route 와 동일 defensive 처리 (cycle 3217), 짝 유지 필수.
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || indexnowKey !== key) {
    return new Response('not found', { status: 404 });
  }
  return new Response(key, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
