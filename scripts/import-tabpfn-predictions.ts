/**
 * TabPFN shadow predictions CSV → Supabase upsert (cycle 1138 candidate Y CLI).
 *
 * Python inference output CSV:
 *   game_id,tabpfn_home_win_prob
 *   12345,0.63
 *
 * 사용:
 *   pnpm exec tsx scripts/import-tabpfn-predictions.ts --input <file.csv> [--dry-run]
 *   pnpm exec tsx scripts/import-tabpfn-predictions.ts <file.csv> [--dry-run]
 *
 * 환경 변수:
 *   NEXT_PUBLIC_SUPABASE_URL  (required)
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { parseTabpfnOutputCsv, buildTabpfnPredictionInsert } from '../apps/moneyball/src/lib/tabpfn-import';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const inputIdx = args.indexOf('--input');
  const inputFile = inputIdx >= 0 ? args[inputIdx + 1] : args.find(a => !a.startsWith('--'));

  if (!inputFile) {
    console.error('Usage: import-tabpfn-predictions.ts --input <file.csv> [--dry-run]');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('missing NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`[tabpfn-import] input: ${inputFile}${isDryRun ? ' (--dry-run)' : ''}`);

  const csv = readFileSync(inputFile, 'utf-8');
  const parsed = parseTabpfnOutputCsv(csv);
  if (!parsed.ok) {
    console.error(`[tabpfn-import] CSV parse failed: ${parsed.error}`);
    process.exit(1);
  }

  const rows = parsed.rows;
  console.log(`[tabpfn-import] parsed ${rows.length} rows`);
  if (rows.length === 0) {
    console.log('[tabpfn-import] nothing to insert');
    return;
  }

  const db = createClient(url, key);

  // Fetch game info: home_team_id, away_team_id, winner_team_id
  const gameIds = rows.map(r => r.game_id);
  const { data: games, error: gErr } = await db
    .from('games')
    .select('id, home_team_id, away_team_id, winner_team_id')
    .in('id', gameIds);

  if (gErr) {
    console.error('[tabpfn-import] games fetch failed:', gErr.message);
    process.exit(1);
  }

  const gameMap = new Map<number, { home_team_id: number; away_team_id: number; winner_team_id: number | null }>();
  for (const g of (games ?? [])) {
    gameMap.set(g.id, { home_team_id: g.home_team_id, away_team_id: g.away_team_id, winner_team_id: g.winner_team_id ?? null });
  }

  let skipped = 0;
  let inserted = 0;
  let errors = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const game = gameMap.get(row.game_id);
    if (!game) {
      console.warn(`[tabpfn-import] game_id ${row.game_id} not found in DB — skipped`);
      skipped++;
      continue;
    }

    const base = buildTabpfnPredictionInsert(row);
    const predictedWinner = row.tabpfn_home_win_prob >= 0.5 ? game.home_team_id : game.away_team_id;
    const isCorrect = game.winner_team_id != null ? predictedWinner === game.winner_team_id : null;

    const payload = {
      ...base,
      predicted_winner: predictedWinner,
      is_correct: isCorrect,
      model_version: 'tabpfn-shadow',
      reasoning: JSON.stringify(base.reasoning),
      predicted_at: now,
      verified_at: game.winner_team_id != null ? now : null,
    };

    if (isDryRun) {
      const prob = (row.tabpfn_home_win_prob * 100).toFixed(1);
      const correct = isCorrect == null ? 'pending' : isCorrect ? '✓' : '✗';
      console.log(`  [dry] game ${row.game_id}: homeWin ${prob}% → winner=${predictedWinner} ${correct}`);
      inserted++;
      continue;
    }

    const { error } = await db
      .from('predictions')
      .upsert(payload, { onConflict: 'game_id,prediction_type,scoring_rule' });

    if (error) {
      console.error(`[tabpfn-import] upsert game ${row.game_id}: ${error.message}`);
      errors++;
    } else {
      inserted++;
    }
  }

  console.log(`\n[tabpfn-import] done — inserted: ${inserted} / skipped: ${skipped} / errors: ${errors}`);
  if (errors > 0) process.exit(1);
}

main().catch(e => {
  console.error('[tabpfn-import] fatal:', e);
  process.exit(1);
});
