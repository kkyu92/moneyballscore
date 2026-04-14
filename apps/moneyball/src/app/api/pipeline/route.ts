import { NextRequest } from 'next/server';
import { runDailyPipeline } from '@moneyball/kbo-data/pipeline/daily';

export async function POST(request: NextRequest) {
  // CRON_SECRET 인증
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const date = body.date as string | undefined;
  const mode = (body.mode as 'predict' | 'verify') || 'predict';

  try {
    const result = await runDailyPipeline(date, mode);

    // 예측 생성 후 ISR revalidation 트리거
    if (mode === 'predict' && result.predictionsGenerated > 0) {
      const revalidateUrl = new URL('/api/revalidate', request.url);
      await fetch(revalidateUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cronSecret}`,
        },
        body: JSON.stringify({ paths: ['/', '/predictions'] }),
      });
    }

    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[Pipeline API]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
