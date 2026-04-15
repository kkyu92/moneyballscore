/**
 * Next.js 16 Edge middleware
 *
 * v4-4 Task 6: /debug/* 경로 BASIC auth.
 * Eng 리뷰 A2 반영.
 *
 * env vars:
 *   DEBUG_USERNAME
 *   DEBUG_PASSWORD
 */

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/debug')) {
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="debug"' },
    });
  }

  const expectedUser = process.env.DEBUG_USERNAME;
  const expectedPass = process.env.DEBUG_PASSWORD;
  if (!expectedUser || !expectedPass) {
    return new NextResponse('Debug auth not configured', { status: 500 });
  }

  let decoded: string;
  try {
    decoded = atob(auth.slice(6));
  } catch {
    return new NextResponse('Invalid auth header', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="debug"' },
    });
  }

  const [user, pass] = decoded.split(':');
  if (user !== expectedUser || pass !== expectedPass) {
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="debug"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/debug/:path*',
};
