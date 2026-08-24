/**
 * Backfill — 동점(home_score===away_score) final 경기 winner_team_id 오설정 정정 (cycle 2506 fix-incident).
 *
 * 의도: cycle 140(daily.ts)이 computeWinnerTeamId 로 동점 final 경기 winner_team_id
 * silent drift 를 고쳤으나, live.ts updateGameScore() 는 인라인 삼항 연산자를 독립적으로
 * 써서 fix 가 전파 안 됨 (cycle 2505 lesson f1c7ea39). live.ts fix(cycle 2506) 이후
 * 신규 발생은 차단되지만, 기존에 잘못 기록된 과거 행은 별도 backfill 필요.
 *
 * 본 script: status='final' AND home_score=away_score AND winner_team_id IS NOT NULL
 * 인 games row 전수 조회 후 winner_team_id=NULL 로 정정.
 *
 * 사용:
 *   pnpm tsx scripts/backfill-tie-winner-null.ts            # 진단만
 *   pnpm tsx scripts/backfill-tie-winner-null.ts --apply    # 진단 + backfill 실행
 *
 * 환경 변수:
 *   NEXT_PUBLIC_SUPABASE_URL  (required)
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 */

import { createClient } from '@supabase/supabase-js';

interface GameRow {
  id: number;
  external_game_id: string;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: number | null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 필요');
    process.exit(1);
  }

  const db = createClient(supabaseUrl, serviceKey);

  console.log(`Mode: ${apply ? 'LIVE (UPDATE)' : 'DRY RUN (진단만)'}\n`);

  console.log('[1/2] status=final AND home_score=away_score AND winner_team_id IS NOT NULL 전수 조회...');
  const PAGE = 1000;
  let offset = 0;
  const bad: GameRow[] = [];
  while (true) {
    const result = await db
      .from('games')
      .select('id, external_game_id, home_score, away_score, winner_team_id')
      .eq('status', 'final')
      .not('winner_team_id', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (result.error) {
      console.error('games select 실패:', result.error);
      process.exit(1);
    }
    const chunk = (result.data ?? []) as GameRow[];
    for (const g of chunk) {
      if (g.home_score != null && g.away_score != null && g.home_score === g.away_score) {
        bad.push(g);
      }
    }
    if (chunk.length < PAGE) break;
    offset += PAGE;
    if (offset > 100000) {
      console.error('safety stop — offset > 100000');
      break;
    }
  }

  console.log(`동점 final + winner_team_id 오설정 row: ${bad.length}`);
  for (const g of bad.slice(0, 20)) {
    console.log(`  id=${g.id} external=${g.external_game_id} score=${g.home_score}:${g.away_score} winner_team_id=${g.winner_team_id}`);
  }
  if (bad.length > 20) console.log(`  ... 외 ${bad.length - 20}건`);

  if (bad.length === 0) {
    console.log('\n정상 — backfill 필요 없음');
    return;
  }

  if (!apply) {
    console.log('\n[2/2] DRY RUN — backfill skip. live 실행: --apply 추가');
    return;
  }

  console.log('\n[2/2] backfill 실행...');
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const g of bad) {
    const updateResult = await db
      .from('games')
      .update({ winner_team_id: null })
      .eq('id', g.id);
    if (updateResult.error) {
      failed += 1;
      errors.push(`id=${g.id} ${updateResult.error.message}`);
    } else {
      updated += 1;
    }
  }

  console.log(`\nbackfill 완료: updated=${updated} failed=${failed}`);
  if (errors.length > 0) {
    console.log('첫 5건 에러:');
    for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
