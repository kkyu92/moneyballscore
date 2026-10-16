import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { errMsg } from '@moneyball/shared';
import { syncBatterStats } from '@moneyball/kbo-data';

/**
 * v4-4 C2-B: KBO Fancy Stats /leaders/ 타자 스탯 → batter_stats 동기화.
 *
 * CRON_SECRET 보호. 매일 1회 실행 예상.
 * body.season (선택, 기본: 현재 연도) 만 받음.
 *
 * 정원: 실측 보통 10-20명 (4 테이블 union 기준, MIN_EXPECTED_BATTERS=8 하한 —
 * packages/kbo-data/src/pipeline/sync-batter-stats.ts 참조). /players 타자 Top 10 소스.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  // .trim() — 대시보드 값에 트레일링 개행이 섞이면 비교가 영구 실패 (동일 클래스
  // 버그 cycle 3217: LLM_BACKEND_HAIKU / INDEXNOW_KEY). defensive 적용.
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const season =
    typeof body.season === 'number' && body.season >= 2020 && body.season <= 2100
      ? body.season
      : new Date().getFullYear();

  try {
    const result = await syncBatterStats(season);

    // 동기화 후 /players 캐시 무효화
    if (result.upsertedStats > 0) {
      try {
        const revalidateUrl = new URL('/api/revalidate', request.url);
        await fetch(revalidateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({ paths: ['/players'] }),
        });
      } catch (revalidateError) {
        Sentry.captureException(revalidateError, {
          tags: { layer: 'api-route', route: 'sync-batter-stats', sub: 'revalidate' },
        });
      }
    }

    if (result.errors.length > 0) {
      Sentry.captureMessage('sync-batter-stats partial failure', {
        level: 'warning',
        tags: { layer: 'api-route', route: 'sync-batter-stats' },
        extra: { season, errors: result.errors, upsertedStats: result.upsertedStats },
      });
      return Response.json(result, { status: 207 });
    }

    return Response.json(result);
  } catch (e) {
    const message = errMsg(e);
    console.error('[sync-batter-stats]', message);

    Sentry.captureException(e, {
      tags: { layer: 'api-route', route: 'sync-batter-stats' },
      extra: { season, message },
    });

    return Response.json({ error: message }, { status: 500 });
  }
}
