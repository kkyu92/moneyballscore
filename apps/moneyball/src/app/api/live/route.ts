import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { errMsg } from '@moneyball/shared';
import { runLiveUpdate } from '@moneyball/kbo-data';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  // .trim() — 대시보드 값에 트레일링 개행이 섞이면 비교가 영구 실패 (동일 클래스
  // 버그 cycle 3217: LLM_BACKEND_HAIKU / INDEXNOW_KEY). defensive 적용.
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const date = body.date as string | undefined;

  try {
    const result = await runLiveUpdate(date);

    // 업데이트가 있으면 ISR revalidation. revalidate 실패는 live update 자체의
    // 성공을 가리면 안 됨 (silent false-failure 방지, sync-batter-stats 동일 패턴).
    if (result.updated > 0) {
      try {
        const revalidateUrl = new URL('/api/revalidate', request.url);
        await fetch(revalidateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({ paths: ['/'] }),
        });
      } catch (revalidateError) {
        Sentry.captureException(revalidateError, {
          tags: { layer: 'api-route', route: 'live', sub: 'revalidate' },
        });
      }
    }

    if (result.errors.length > 0) {
      Sentry.captureMessage('live partial failure', {
        level: 'warning',
        tags: { layer: 'api-route', route: 'live' },
        extra: { date, errors: result.errors, updated: result.updated },
      });
      return Response.json(result, { status: 207 });
    }

    return Response.json(result);
  } catch (e) {
    const message = errMsg(e);
    console.error('[Live API]', message);

    Sentry.captureException(e, {
      tags: { layer: 'api-route', route: 'live' },
      extra: { date, message },
    });

    return Response.json({ error: message }, { status: 500 });
  }
}
