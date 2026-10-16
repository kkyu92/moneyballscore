import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  // .trim() — 대시보드 값에 트레일링 개행이 섞이면 비교가 영구 실패 (동일 클래스
  // 버그 cycle 3217: LLM_BACKEND_HAIKU / INDEXNOW_KEY). defensive 적용.
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawPaths = Array.isArray(body.paths) ? body.paths : ['/', '/predictions'];
  const paths = rawPaths.filter((p: unknown): p is string => typeof p === 'string' && p.startsWith('/')).slice(0, 10);

  for (const path of paths) {
    revalidatePath(path);
  }

  return Response.json({ revalidated: paths, timestamp: new Date().toISOString() });
}
