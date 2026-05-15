import { NextRequest } from 'next/server';
import { errMsg } from '@moneyball/shared';
import { snapshotPitcherStats } from '@moneyball/kbo-data';

/**
 * 주간 투수 스탯 snapshot — pitcher_stats 시점별 누적 테이블에 upsert.
 *
 * 배경: daily.ts 는 fetchPitcherStats 를 인메모리로만 사용. 시점별 팩터 복원
 * 불가능이 v2.0 튜닝 / factor-correlation 분석의 구조적 제약이었음. 이 엔드
 * 포인트가 주간 cron 으로 호출되어 매주 snapshot 누적 → 향후 "경기 ≤ 근접
 * snapshot" 으로 시점별 FIP/xFIP/WAR/K9 팩터 복원 가능.
 *
 * Cron: .github/workflows/pitcher-snapshot.yml — 일요일 KST 00시.
 *
 * body: { season?: number } 선택. 기본 현재 연도.
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
    const result = await snapshotPitcherStats({ season });
    return Response.json(result);
  } catch (e) {
    const message = errMsg(e);
    console.error('[snapshot-pitchers]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
