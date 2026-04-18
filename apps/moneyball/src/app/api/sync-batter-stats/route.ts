import { NextRequest } from 'next/server';
import { syncBatterStats } from '@moneyball/kbo-data';

/**
 * v4-4 C2-B: KBO Fancy Stats /leaders/ 타자 스탯 → batter_stats 동기화.
 *
 * CRON_SECRET 보호. 매일 1회 실행 예상.
 * body.season (선택, 기본: 현재 연도) 만 받음.
 *
 * 정원: 약 50-100 선수(Top 리더들). /players 타자 Top 10 소스.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

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
      } catch {
        // revalidate 실패는 치명적이지 않음
      }
    }

    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[sync-batter-stats]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
