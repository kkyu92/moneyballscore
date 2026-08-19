/**
 * Backfill — KBO games.status 영구 'scheduled' 고착 잔여 9경기 확정 처리 (cycle 2185 fix-incident, 사례 33 후속).
 *
 * 배경:
 *   cycle 2184 (사례 33) 가 `backfill-kbo-stuck-verify.ts` 로 KBO API 재조회를 시도해
 *   9개 날짜 24경기 중 15경기(3개 날짜)를 해소했으나, 나머지 6개 날짜 9경기는 KBO API가
 *   여전히 'scheduled' 로 응답해 자동 해소가 불가능했다 (재편성 없이 완전 취소된 경기는
 *   KBO API 스케줄 엔드포인트에서 그냥 사라지거나 원래 슬롯이 갱신되지 않는 것으로 추정).
 *
 *   본 cycle (2185) 이 KBO 공식 뉴스(연합뉴스/OSEN/스포츠경향/뉴스1 등) 검색으로 9경기
 *   전부 실제로 취소되어 열리지 않았음을 확인:
 *     - 2026-07-05 LG vs HH (game 7601): 우천/그라운드 사정 취소
 *     - 2026-07-05 HT vs NC (game 7603): 우천 취소
 *     - 2026-07-22 KT vs OB (game 8394): 그라운드 사정 취소
 *     - 2026-07-23 KT vs OB (game 8489): 그라운드 사정 취소 (2일 연속)
 *     - 2026-08-01 LT vs SS (game 9141): 폭염 취소
 *     - 2026-08-01 NC vs HT (game 9138): 폭염 취소
 *     - 2026-08-02 NC vs HT (game 9219): 폭염 취소 (2일 연속)
 *     - 2026-08-04 OB vs NC (game 9300): 폭염 취소
 *     - 2026-08-04 HT vs KT (game 9298): 폭염 취소
 *
 *   전부 재편성(doubleheader make-up) 여부와 무관하게 "그 날짜 그 슬롯" 경기 자체는
 *   열리지 않았으므로 games.status='postponed' + is_canceled=true 로 마킹하는 것이
 *   정확하다 (KBO 실제 편성표와 정합). predictions.is_correct 는 건드리지 않음
 *   (열리지 않은 경기는 애초에 채점 대상 아님 — daily.ts 의 기존 postponed 필터 컨벤션과
 *   동일. daily_notifications flag 도 건드리지 않음, Telegram 재알림 방지).
 *
 * 사용:
 *   cd apps/moneyball && set -a && source .env.local && set +a
 *   pnpm exec tsx ../../scripts/backfill-kbo-confirmed-postponed.ts          # 진단
 *   pnpm exec tsx ../../scripts/backfill-kbo-confirmed-postponed.ts --apply  # 적용
 */

import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const CONFIRMED_POSTPONED_GAME_IDS = [7601, 7603, 8394, 8489, 9141, 9138, 9219, 9300, 9298];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }
  const sb = createClient(url, key);

  const { data: rows, error } = await sb
    .from('games')
    .select('id, game_date, status')
    .in('id', CONFIRMED_POSTPONED_GAME_IDS);

  if (error) {
    console.error('games select failed:', error.message);
    process.exit(1);
  }

  const notScheduled = (rows ?? []).filter((r) => r.status !== 'scheduled');
  if (notScheduled.length > 0) {
    console.warn('⚠️ status != scheduled (재확인 필요, skip):', notScheduled);
  }
  const targets = (rows ?? []).filter((r) => r.status === 'scheduled').map((r) => r.id);
  console.log(`대상 ${targets.length}건 (status='scheduled') / 예상 ${CONFIRMED_POSTPONED_GAME_IDS.length}건`, targets);

  if (!APPLY) {
    console.log('진단 모드 — --apply 플래그로 재실행하면 실제 postponed 마킹 수행');
    return;
  }

  const { error: updateError, count } = await sb
    .from('games')
    .update({ status: 'postponed', is_canceled: true })
    .in('id', targets)
    .select('id', { count: 'exact' });

  if (updateError) {
    console.error('games update 실패:', updateError.message);
    process.exit(1);
  }
  console.log(`postponed 마킹 완료: ${count}건`);
}

main();
