import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const paths = (body.paths as string[]) || ['/', '/predictions'];

  for (const path of paths) {
    revalidatePath(path);
  }

  return Response.json({ revalidated: paths, timestamp: new Date().toISOString() });
}
