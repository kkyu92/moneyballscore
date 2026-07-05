/**
 * Backfill — home_win_prob from reasoning.homeWinProb (cycle 1455 op-analysis).
 *
 * 배경:
 *   2026-06-12~ Anthropic API CREDIT_EXHAUSTED → debate_fallback_quant.
 *   confidence=0.3 (fallback marker) 저장, home_win_prob=NULL.
 *   resolveWinnerProb: homeWinProb 우선 → confidence 폴백. NULL이면 Math.max(0.5, conf=0.3)=0.5.
 *   실제 quant homeWinProb은 reasoning.homeWinProb에 박제됨 (0.53~0.55).
 *   본 backfill: home_win_prob = reasoning->homeWinProb (v1.8 KBO, NULL 행만).
 *
 * 영향:
 *   resolveWinnerProb 가 0.5 대신 실제 quant prob 사용 → Brier 더 정직해짐.
 *   기존 confidence=0.3 은 유지 (degraded mode 감지 채널 보존).
 *
 * 사용:
 *   cd apps/moneyball && set -a && source .env.local && set +a
 *   pnpm exec tsx ../../scripts/backfill-home-win-prob.ts          # 진단
 *   pnpm exec tsx ../../scripts/backfill-home-win-prob.ts --apply  # 적용
 */

import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }
  const sb = createClient(url, key);

  // Diagnose: count rows where home_win_prob IS NULL and reasoning.homeWinProb present
  const { data: rows, error } = await sb
    .from('predictions')
    .select('id, confidence, home_win_prob, reasoning')
    .eq('league', 'kbo')
    .eq('scoring_rule', 'v1.8')
    .is('home_win_prob', null)
    .not('reasoning', 'is', null)
    .gte('predicted_at', '2026-04-01')
    .limit(500);

  if (error) { console.error('query error:', error.message); process.exit(1); }
  if (!rows?.length) { console.log('no rows to backfill'); return; }

  const candidates = rows.filter((r) => {
    const reason = r.reasoning as { homeWinProb?: number } | null;
    const hwp = reason?.homeWinProb;
    return hwp != null && hwp > 0 && hwp < 1;
  });

  console.log(`total NULL home_win_prob rows: ${rows.length}`);
  console.log(`candidates with reasoning.homeWinProb: ${candidates.length}`);
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  if (candidates.length === 0) { console.log('nothing to update'); return; }

  // Sample
  console.log('\nsample (first 5):');
  for (const r of candidates.slice(0, 5)) {
    const reason = r.reasoning as { homeWinProb?: number } | null;
    const hwp = reason?.homeWinProb;
    console.log(`  id=${r.id} conf=${r.confidence} quant_hwp=${hwp}`);
  }

  if (!APPLY) {
    console.log('\nDRY-RUN: pass --apply to execute');
    return;
  }

  // Apply in batches of 50
  let updated = 0;
  const BATCH = 50;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    for (const r of batch) {
      const hwp = (r.reasoning as { homeWinProb?: number }).homeWinProb!;
      const { error: upErr } = await sb
        .from('predictions')
        .update({ home_win_prob: hwp })
        .eq('id', r.id);
      if (upErr) {
        console.error(`  update failed id=${r.id}: ${upErr.message}`);
      } else {
        updated++;
      }
    }
    console.log(`  progress: ${Math.min(i + BATCH, candidates.length)} / ${candidates.length}`);
  }

  console.log(`\nbackfill complete: ${updated} rows updated`);
}

main().catch((e) => { console.error(e); process.exit(1); });
