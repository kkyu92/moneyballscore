/**
 * Next.js 16 Edge middleware
 *
 * 1. 보안 헤더: 모든 응답에 X-Content-Type-Options /
 *    Referrer-Policy / Permissions-Policy 주입.
 * 2. /debug/* 경로: BASIC auth (DEBUG_USERNAME / DEBUG_PASSWORD env).
 * 3. /{INDEXNOW_KEY}.txt: IndexNow key ownership 검증 파일.
 *    api/seo/indexnow/ping 이 keyLocation 으로 이 경로를 가리키지만
 *    해당 파일을 서빙하는 라우트가 없어 검증 영구 실패하던 drift (cycle 4105) 수정.
 */

import { NextResponse, type NextRequest } from 'next/server';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function secure(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

function pathHeaders(req: NextRequest): Headers {
  const h = new Headers(req.headers);
  h.set('x-pathname', req.nextUrl.pathname);
  return h;
}

function indexNowKeyResponse(pathname: string): NextResponse | null {
  const match = /^\/([^/]+)\.txt$/.exec(pathname);
  if (!match) return null;

  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || match[1] !== key) return null;

  return new NextResponse(key, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export function middleware(req: NextRequest) {
  const requestHeaders = pathHeaders(req);

  const keyResponse = indexNowKeyResponse(req.nextUrl.pathname);
  if (keyResponse) {
    return secure(keyResponse);
  }

  if (!req.nextUrl.pathname.startsWith('/debug')) {
    return secure(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) {
    return secure(
      new NextResponse('Auth required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="debug"' },
      }),
    );
  }

  const expectedUser = process.env.DEBUG_USERNAME;
  const expectedPass = process.env.DEBUG_PASSWORD;
  if (!expectedUser || !expectedPass) {
    return secure(new NextResponse('Debug auth not configured', { status: 500 }));
  }

  let decoded: string;
  try {
    decoded = atob(auth.slice(6));
  } catch {
    return secure(
      new NextResponse('Invalid auth header', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="debug"' },
      }),
    );
  }

  const [user, pass] = decoded.split(':');
  if (user !== expectedUser || pass !== expectedPass) {
    return secure(
      new NextResponse('Invalid credentials', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="debug"' },
      }),
    );
  }

  return secure(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
