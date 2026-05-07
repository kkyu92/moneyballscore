/**
 * Next.js 16 Edge middleware
 *
 * 1. 보안 헤더: 모든 응답에 X-Content-Type-Options / X-Frame-Options /
 *    Referrer-Policy / Permissions-Policy 주입.
 * 2. /debug/* 경로: BASIC auth (DEBUG_USERNAME / DEBUG_PASSWORD env).
 */

import { NextResponse, type NextRequest } from 'next/server';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function secure(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/debug')) {
    return secure(NextResponse.next());
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

  return secure(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
