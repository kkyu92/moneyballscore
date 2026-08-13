/**
 * Backfill — mlb_schedule.status 전량 'scheduled' 고정 (cycle 2067 fix-incident, 사례 23).
 *
 * 배경:
 *   mlb_statsapi_scrape 는 매 cron fire 시 "오늘 KST" 단일 날짜만 스크랩했고
 *   재스크랩(backfill) 경로가 코드베이스에 없었음 — cloudflare-worker/src/worker.ts
 *   fix(cycle 2067)로 향후엔 매 fire 마다 최근 3일을 재스크랩하지만, 기존에 이미
 *   'scheduled' 로 고정된 과거 날짜(시즌 시작~D-3)는 이 fix 로는 절대 안 갱신됨
 *   (D-3 보다 오래된 날짜는 backfill 창 밖). 본 스크립트로 1회성 일괄 재스크랩.
 *
 * 사용:
 *   cd apps/moneyball && set -a && source .env.local && set +a
 *   pnpm exec tsx ../../scripts/backfill-mlb-schedule-status.ts          # 진단
 *   pnpm exec tsx ../../scripts/backfill-mlb-schedule-status.ts --apply  # 적용
 */

import { createClient } from '@supabase/supabase-js';
import { runMlbPipeline } from '@moneyball/kbo-data';

const APPLY = process.argv.includes('--apply');
const RATE_LIMIT_MS = 2000;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }
  const sb = createClient(url, key);

  const todayKst = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

  const { data: rows, error } = await sb
    .from('mlb_schedule')
    .select('game_date')
    .eq('status', 'scheduled')
    .lt('game_date', todayKst);

  if (error) {
    console.error('mlb_schedule select failed:', error.message);
    process.exit(1);
  }

  const dates = Array.from(new Set((rows ?? []).map((r) => r.game_date as string))).sort();

  console.log(`대상 날짜 ${dates.length}건 (status='scheduled', game_date < ${todayKst})`);
  if (dates.length === 0) {
    console.log('backfill 대상 없음 — 종료');
    return;
  }

  if (!APPLY) {
    console.log('진단 모드 — 처음 10개 날짜:', dates.slice(0, 10));
    console.log('--apply 플래그로 재실행하면 실제 재스크랩 수행');
    return;
  }

  let totalGames = 0;
  let totalErrors = 0;

  for (const date of dates) {
    try {
      const result = await runMlbPipeline('mlb_statsapi_scrape', date, 'backfill-script');
      totalGames += result.games_found;
      if (result.errors.length > 0) {
        totalErrors += result.errors.length;
        console.error(`  ${date}: errors=${result.errors.join('; ')}`);
      } else {
        console.log(`  ${date}: games_found=${result.games_found} rows_inserted=${result.rows_inserted}`);
      }
    } catch (e) {
      totalErrors += 1;
      console.error(`  ${date}: threw`, e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }

  const { count: finalCount } = await sb
    .from('mlb_schedule')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'final');

  console.log(`완료 — 처리 날짜 ${dates.length}건 / games_found 합계 ${totalGames} / errors ${totalErrors}`);
  console.log(`재검증: mlb_schedule.status='final' count = ${finalCount}`);
}

main();
