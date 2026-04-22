/**
 * Sentry alert-rule-action 이 integration webhookUrl + `/webhook` path 조합으로
 * POST 를 보냄. 같은 handler 공유 — parent route 의 async 함수를 명시적 wrap.
 * (Next.js 16 route handler 는 re-export 방식을 route 로 인식 안 함.)
 */

import type { NextRequest } from 'next/server';
import { POST as parentPOST, GET as parentGET } from '../route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<Response> {
  return parentPOST(request);
}

export async function GET(): Promise<Response> {
  return parentGET();
}
