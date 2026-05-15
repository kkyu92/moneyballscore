import { NextRequest } from 'next/server';
import { errMsg } from '@moneyball/shared';
import { runLiveUpdate } from '@moneyball/kbo-data';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const date = body.date as string | undefined;

  try {
    const result = await runLiveUpdate(date);

    // 업데이트가 있으면 ISR revalidation
    if (result.updated > 0) {
      const revalidateUrl = new URL('/api/revalidate', request.url);
      await fetch(revalidateUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cronSecret}`,
        },
        body: JSON.stringify({ paths: ['/'] }),
      });
    }

    return Response.json(result);
  } catch (e) {
    const message = errMsg(e);
    console.error('[Live API]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
