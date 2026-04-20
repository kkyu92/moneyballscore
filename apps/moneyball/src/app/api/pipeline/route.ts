import { NextRequest } from 'next/server';
import { runDailyPipeline, notifyError } from '@moneyball/kbo-data';

export async function POST(request: NextRequest) {
  // CRON_SECRET 인증
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawDate = body.date as string | undefined;
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined;
  const validModes = ['announce', 'predict', 'predict_final', 'verify'] as const;
  type Mode = (typeof validModes)[number];
  const rawMode = body.mode as string | undefined;
  const mode: Mode = (validModes as readonly string[]).includes(rawMode ?? '')
    ? (rawMode as Mode)
    : 'predict';
  const triggeredBy = (body.triggeredBy as 'cron' | 'manual' | 'api') || 'api';

  try {
    const result = await runDailyPipeline(date, mode, triggeredBy);

    // 예측 생성 후 ISR revalidation 트리거 (Codex #4: 범위 확장)
    if (
      (mode === 'predict' || mode === 'predict_final') &&
      result.predictionsGenerated > 0
    ) {
      const revalidateUrl = new URL('/api/revalidate', request.url);
      await fetch(revalidateUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cronSecret}`,
        },
        body: JSON.stringify({
          paths: [
            '/',
            '/predictions',
            `/predictions/${result.date}`,
            '/analysis',
            '/feed',
          ],
        }),
      });
    }

    return Response.json({
      ...result,
      _debug: {
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        keyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 10) || 'none',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[Pipeline API]', message);

    // 에러 알림
    try { await notifyError('Pipeline API', message); } catch {}

    return Response.json({ error: message }, { status: 500 });
  }
}
