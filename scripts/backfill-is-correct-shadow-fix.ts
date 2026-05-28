/**
 * Backfill — updateAccuracy shadow contamination 정정 (cycle 1021 hotfix #1338 후속).
 *
 * 의도: cycle 1013 (v2.1-B-shadow) + cycle 1019 (v2.0-shadow) 추가 이후
 * updateAccuracy 가 Map.set last-wins 로 shadow row 의 id 박제 → shadow row 만
 * is_correct 갱신 + production v1.8 row.is_correct=null 영구 silent contamination.
 *
 * 본 script:
 * 1. 진단 — 영향 row 수 측정 (production v1.8 is_correct=null 인 final game count
 *    + shadow row 의 is_correct 박제 count + winner mismatch row count)
 * 2. backfill (live mode 만) — predictions.is_correct = (predicted_winner ==
 *    games.winner_team_id), actual_winner = games.winner_team_id, verified_at =
 *    COALESCE(verified_at, now()). production + shadow row 모두 동일 진실 적용
 *    (cohort 분석은 별도 channel scoring_rule filter 경유)
 *
 * 사용:
 *   pnpm tsx scripts/backfill-is-correct-shadow-fix.ts            # 진단만
 *   pnpm tsx scripts/backfill-is-correct-shadow-fix.ts --apply    # 진단 + backfill 실행
 *
 * 환경 변수:
 *   NEXT_PUBLIC_SUPABASE_URL  (required)
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 */

import { createClient } from '@supabase/supabase-js';
import {
  CURRENT_SCORING_RULE,
  SHADOW_SCORING_RULE,
  SHADOW_V20_SCORING_RULE,
} from '../packages/shared/src/index';

interface PredictionRow {
  id: number;
  game_id: number;
  scoring_rule: string | null;
  predicted_winner: number;
  is_correct: boolean | null;
  games: { winner_team_id: number | null; status: string } | null;
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

  console.log(`Mode: ${apply ? 'LIVE (UPDATE)' : 'DRY RUN (진단만)'}`);
  console.log(`Production scoring_rule: ${CURRENT_SCORING_RULE}`);
  console.log(`Shadow scoring_rules: ${SHADOW_SCORING_RULE}, ${SHADOW_V20_SCORING_RULE}\n`);

  // 1. pre_game predictions INNER JOIN games (status=final + winner_team_id 박제)
  //    pagination 의무 — supabase-js 기본 1000 row cap. shadow 추가 후 row 수 폭증.
  console.log('[1/3] pre_game predictions INNER JOIN games (final) 조회...');
  const PAGE = 1000;
  let offset = 0;
  const allPreds: PredictionRow[] = [];
  while (true) {
    const predResult = await db
      .from('predictions')
      .select('id, game_id, scoring_rule, predicted_winner, is_correct, games!inner(winner_team_id, status)')
      .eq('prediction_type', 'pre_game')
      .eq('games.status', 'final')
      .not('games.winner_team_id', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (predResult.error) {
      console.error('predictions select 실패:', predResult.error);
      process.exit(1);
    }
    const chunk = (predResult.data ?? []) as unknown as PredictionRow[];
    allPreds.push(...chunk);
    if (chunk.length < PAGE) break;
    offset += PAGE;
    if (offset > 100000) {
      console.error('safety stop — offset > 100000');
      break;
    }
  }
  const winnerByGameId = new Map<number, number>();
  for (const p of allPreds) {
    const w = p.games?.winner_team_id;
    if (w != null) winnerByGameId.set(p.game_id, w);
  }
  console.log(`pre_game predictions (final game): ${allPreds.length}`);
  console.log(`distinct final game ids: ${winnerByGameId.size}\n`);

  // 2. 진단 — 영향 row 분류
  console.log('[2/3] 진단...');
  const byRule = new Map<string, { total: number; null_is_correct: number; wrong_is_correct: number; correct: number }>();
  for (const p of allPreds) {
    const rule = p.scoring_rule ?? '(null)';
    if (!byRule.has(rule)) byRule.set(rule, { total: 0, null_is_correct: 0, wrong_is_correct: 0, correct: 0 });
    const stat = byRule.get(rule)!;
    stat.total += 1;
    const truth = winnerByGameId.get(p.game_id) === p.predicted_winner;
    if (p.is_correct == null) {
      stat.null_is_correct += 1;
    } else if (p.is_correct !== truth) {
      stat.wrong_is_correct += 1;
    } else {
      stat.correct += 1;
    }
  }

  console.log('\nscoring_rule 별 분포:');
  console.log('  rule                  | total | is_correct=null | wrong | correct');
  console.log('  ----------------------|-------|-----------------|-------|--------');
  for (const [rule, s] of byRule.entries()) {
    const ruleLabel = rule.padEnd(22);
    console.log(`  ${ruleLabel}| ${String(s.total).padStart(5)} | ${String(s.null_is_correct).padStart(15)} | ${String(s.wrong_is_correct).padStart(5)} | ${String(s.correct).padStart(7)}`);
  }
  console.log('');

  // game 별 cohort 일치 진단 (production winner vs shadow winner)
  const gameProduction = new Map<number, number>();
  const gameShadowV21 = new Map<number, number>();
  const gameShadowV20 = new Map<number, number>();
  for (const p of allPreds) {
    if (p.scoring_rule === CURRENT_SCORING_RULE) gameProduction.set(p.game_id, p.predicted_winner);
    else if (p.scoring_rule === SHADOW_SCORING_RULE) gameShadowV21.set(p.game_id, p.predicted_winner);
    else if (p.scoring_rule === SHADOW_V20_SCORING_RULE) gameShadowV20.set(p.game_id, p.predicted_winner);
  }
  let prodVsV21Mismatch = 0;
  let prodVsV20Mismatch = 0;
  for (const [gid, prodWinner] of gameProduction.entries()) {
    if (gameShadowV21.has(gid) && gameShadowV21.get(gid) !== prodWinner) prodVsV21Mismatch += 1;
    if (gameShadowV20.has(gid) && gameShadowV20.get(gid) !== prodWinner) prodVsV20Mismatch += 1;
  }
  console.log(`production v1.8 vs v2.1-B-shadow winner mismatch: ${prodVsV21Mismatch} game`);
  console.log(`production v1.8 vs v2.0-shadow winner mismatch:  ${prodVsV20Mismatch} game`);
  console.log('');

  // 3. backfill (apply mode 만)
  const needsBackfill = allPreds.filter((p) => {
    const truth = winnerByGameId.get(p.game_id) === p.predicted_winner;
    return p.is_correct == null || p.is_correct !== truth;
  });

  console.log(`backfill 대상 row: ${needsBackfill.length}`);
  if (needsBackfill.length === 0) {
    console.log('정상 — backfill 필요 없음');
    return;
  }

  if (!apply) {
    console.log('\n[3/3] DRY RUN — backfill skip. live 실행: --apply 추가');
    return;
  }

  console.log('\n[3/3] backfill 실행...');
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const verifiedAt = new Date().toISOString();

  for (const p of needsBackfill) {
    const winner = winnerByGameId.get(p.game_id);
    if (winner == null) continue;
    const truth = winner === p.predicted_winner;
    const updateResult = await db
      .from('predictions')
      .update({
        is_correct: truth,
        actual_winner: winner,
        verified_at: verifiedAt,
      })
      .eq('id', p.id);
    if (updateResult.error) {
      failed += 1;
      errors.push(`id=${p.id} ${updateResult.error.message}`);
    } else {
      updated += 1;
    }
    if ((updated + failed) % 50 === 0) {
      console.log(`  진행: ${updated + failed}/${needsBackfill.length} (updated=${updated} failed=${failed})`);
    }
  }

  console.log(`\nbackfill 완료: updated=${updated} failed=${failed}`);
  if (errors.length > 0) {
    console.log(`첫 5건 에러:`);
    for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
