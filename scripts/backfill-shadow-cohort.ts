/**
 * Backfill — v2.1-B-shadow row 박제 (cycle 1014 Day 2).
 *
 * 의도: 기존 v1.8 predictions 의 stored factors JSONB 을 V2_1_B_WEIGHTS 로 재가중합
 * → v2.1-B-shadow row insert. n=27 v1.8 cohort 즉시 evidence 박제 → Brier delta /
 * accuracy delta 측정.
 *
 * 정직성:
 * - 결과 누수 risk 존재 (v1.8 row 가 이미 verify 된 결과 게임). backfill row 는
 *   "shadow OOS 정직 evidence" X — 단순 가중치 재계산 evidence.
 * - 정직한 forward OOS 는 cron fire 후 (5/29 KST 10:00 ~) 자연 누적 (insertShadowRow
 *   pipeline 박제됨, daily.ts L772~).
 * - 본 backfill 결과는 `docs/research/v2.1-B-shadow-backfill.md` 안 evidence_source:
 *   'backfill' 라벨로 명시 + forward shadow 와 분리 누적.
 *
 * 사용:
 *   pnpm tsx scripts/backfill-shadow-cohort.ts [--dry-run]
 *
 * 환경 변수:
 *   SUPABASE_URL              (required)
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 */

import { createClient } from '@supabase/supabase-js';
import { insertShadowRow, computeShadowPrediction } from '../packages/kbo-data/src/pipeline/shadow-cohort';
import { CURRENT_SCORING_RULE, SHADOW_SCORING_RULE } from '../packages/shared/src/index';

interface ExistingV18Row {
  game_id: number;
  predicted_winner: number;
  scoring_rule: string;
  factors: Record<string, number> | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  home_lineup_woba: number;
  away_lineup_woba: number;
  home_bullpen_fip: number;
  away_bullpen_fip: number;
  home_war_total: number;
  away_war_total: number;
  home_recent_form: number;
  away_recent_form: number;
  head_to_head_rate: number | null;
  park_factor: number;
  home_elo: number;
  away_elo: number;
  home_sfr: number;
  away_sfr: number;
  reasoning: unknown;
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 필요');
    process.exit(1);
  }

  const db = createClient(supabaseUrl, serviceKey);

  console.log(`Source cohort filter: scoring_rule = ${CURRENT_SCORING_RULE}`);
  console.log(`Target cohort: ${SHADOW_SCORING_RULE}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no insert)' : 'LIVE (insert)'}\n`);

  // 1. 기존 v1.8 (= CURRENT_SCORING_RULE) row fetch
  const fetchResult = await db
    .from('predictions')
    .select(
      'game_id, predicted_winner, scoring_rule, factors, home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip, home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip, home_war_total, away_war_total, home_recent_form, away_recent_form, head_to_head_rate, park_factor, home_elo, away_elo, home_sfr, away_sfr, reasoning',
    )
    .eq('scoring_rule', CURRENT_SCORING_RULE)
    .eq('prediction_type', 'pre_game')
    .order('game_id', { ascending: true });

  if (fetchResult.error) {
    console.error('source fetch error:', fetchResult.error.message);
    process.exit(2);
  }

  const rows = (fetchResult.data ?? []) as ExistingV18Row[];
  console.log(`Source rows: ${rows.length} 박제\n`);

  let inserted = 0;
  let duplicate = 0;
  let computeFailed = 0;
  let dbError = 0;
  let computeOk = 0;
  const deltas: Array<{ gameId: number; shadowProb: number }> = [];

  for (const row of rows) {
    if (!row.factors) {
      computeFailed += 1;
      continue;
    }

    const computed = computeShadowPrediction(row.factors);
    if (!computed) {
      computeFailed += 1;
      continue;
    }
    computeOk += 1;
    deltas.push({ gameId: row.game_id, shadowProb: computed.homeWinProb });

    if (isDryRun) continue;

    const reasoningText =
      typeof row.reasoning === 'string'
        ? row.reasoning
        : JSON.stringify(row.reasoning);

    const result = await insertShadowRow(db, {
      gameId: row.game_id,
      predictedWinnerId: row.predicted_winner,
      factors: row.factors,
      baseRowMeta: {
        home_sp_fip: row.home_sp_fip,
        away_sp_fip: row.away_sp_fip,
        home_sp_xfip: row.home_sp_xfip,
        away_sp_xfip: row.away_sp_xfip,
        home_lineup_woba: row.home_lineup_woba,
        away_lineup_woba: row.away_lineup_woba,
        home_bullpen_fip: row.home_bullpen_fip,
        away_bullpen_fip: row.away_bullpen_fip,
        home_war_total: row.home_war_total,
        away_war_total: row.away_war_total,
        home_recent_form: row.home_recent_form,
        away_recent_form: row.away_recent_form,
        head_to_head_rate: row.head_to_head_rate,
        park_factor: row.park_factor,
        home_elo: row.home_elo,
        away_elo: row.away_elo,
        home_sfr: row.home_sfr,
        away_sfr: row.away_sfr,
        reasoning: `[backfill][v2.1-B-shadow quant only] ${reasoningText.slice(0, 200)}`,
      },
    });

    switch (result.reason) {
      case 'inserted':
        inserted += 1;
        break;
      case 'duplicate':
        duplicate += 1;
        break;
      case 'compute_failed':
        computeFailed += 1;
        break;
      case 'db_error':
        dbError += 1;
        console.error(`  game_id=${row.game_id} db_error: ${result.error}`);
        break;
    }
  }

  console.log('\n=== backfill 결과 ===');
  console.log(`compute ok: ${computeOk} / source: ${rows.length}`);
  if (!isDryRun) {
    console.log(`inserted: ${inserted}`);
    console.log(`duplicate (이미 박제): ${duplicate}`);
    console.log(`compute_failed: ${computeFailed}`);
    console.log(`db_error: ${dbError}`);
  } else {
    console.log(`(dry-run — insert 0)`);
  }

  // shadow prob 분포 빠른 요약
  if (deltas.length > 0) {
    const probs = deltas.map((d) => d.shadowProb).sort((a, b) => a - b);
    const median = probs[Math.floor(probs.length / 2)];
    const min = probs[0];
    const max = probs[probs.length - 1];
    const mean = probs.reduce((s, p) => s + p, 0) / probs.length;
    console.log(
      `shadow_prob: n=${probs.length} min=${min.toFixed(3)} median=${median.toFixed(3)} mean=${mean.toFixed(3)} max=${max.toFixed(3)}`,
    );
  }
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(99);
});
