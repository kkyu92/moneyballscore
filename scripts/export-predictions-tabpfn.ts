/**
 * TabPFN CSV export (cycle 1130 v17 candidate P body 박제).
 *
 * predictions JOIN games row 들을 docs/research/tabpfn-data-prep.md schema 에 맞춰
 * CSV 로 출력. Step 3 (Python sidecar 인프라 결정) 사용자 영역 fire 직전 input 파일.
 *
 * Usage:
 *   pnpm tsx scripts/export-predictions-tabpfn.ts \
 *     --start 2026-04-01 --end 2026-05-31 \
 *     --out tabpfn-train.csv
 *
 * scope filter (data-prep.md §2.2):
 *   - prediction_type = 'pre_game'
 *   - is_correct IS NOT NULL
 *   - factors IS NOT NULL + ACTIVE_FACTOR_KEYS key 모두 존재 (drop NaN row)
 *   - games.status = 'final' + winner_team_id IS NOT NULL
 *
 * 자율 영역 한도: CSV 박제 only. TabPFN inference / checkpoint download 사용자 영역.
 */

import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  CSV_HEADER,
  buildCsvRow,
  type DropReason,
  type PredictionExportRow,
} from '../apps/moneyball/src/lib/tabpfn-export';

interface CliArgs {
  start: string;
  end: string;
  out: string;
}

function parseArgs(argv: string[]): CliArgs | null {
  const args: Partial<CliArgs> = {};
  for (let i = 2; i < argv.length; i += 2) {
    const k = argv[i]?.replace(/^--/, '');
    const v = argv[i + 1];
    if (!k || !v) return null;
    (args as Record<string, string>)[k] = v;
  }
  if (!args.start || !args.end || !args.out) return null;
  return args as CliArgs;
}

const PAGE_SIZE = 1000;

async function main() {
  const args = parseArgs(process.argv);
  if (!args) {
    console.error(
      'Usage: tsx scripts/export-predictions-tabpfn.ts --start YYYY-MM-DD --end YYYY-MM-DD --out path.csv',
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL 필요');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const drops: Record<DropReason, number> = {
    no_games_join: 0,
    no_factors: 0,
    missing_factor_key: 0,
    invalid_factor_value: 0,
    no_home_win_prob: 0,
    no_winner_team_id: 0,
    is_correct_null: 0,
  };
  const lines: string[] = [CSV_HEADER];

  let fetched = 0;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('predictions')
      .select(
        'game_id, predicted_winner, confidence, prediction_type, scoring_rule, factors, reasoning, is_correct, games:games!inner(id, game_date, home_team_id, winner_team_id, status)',
      )
      .eq('prediction_type', 'pre_game')
      .not('is_correct', 'is', null)
      .gte('games.game_date', args.start)
      .lte('games.game_date', args.end)
      .eq('games.status', 'final')
      .order('game_id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('supabase fetch error:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const raw of data) {
      const row = raw as unknown as PredictionExportRow;
      const result = buildCsvRow(row);
      if (result.ok) {
        lines.push(result.line);
      } else {
        drops[result.reason] += 1;
      }
    }

    fetched += data.length;
    if (data.length < PAGE_SIZE) break;
  }

  writeFileSync(args.out, lines.join('\n') + '\n', 'utf-8');

  const kept = lines.length - 1;
  console.log(`fetched ${fetched} rows, exported ${kept} rows → ${args.out}`);
  console.log('drops:', drops);
  process.exit(0);
}

main().catch((e) => {
  console.error('export-predictions-tabpfn error:', e);
  process.exit(1);
});
