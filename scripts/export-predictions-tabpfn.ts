/**
 * TabPFN export stub (M-D cycle 1013).
 *
 * 사용자 GPU 결정 후 fire 가능한 형태 — predictions.factors + games 결과를
 * TabPFN input shape (CSV) 로 출력. 본 plan = stub only — 실제 fire 는
 * 사용자 GPU 박제 후 carry-over.
 *
 * Usage (carry-over):
 *   pnpm tsx scripts/export-predictions-tabpfn.ts \
 *     --start 2026-04-01 --end 2026-05-28 \
 *     --out tabpfn-train.csv
 *
 * Output shape:
 *   feature columns = 12 factor 평균 (sp_fip ... umpire_sz, [0, 1] 정규화)
 *   target column   = home_won (binary 0/1)
 *
 * TabPFN 학습 path 는 별도 Python notebook (사용자 GPU 환경):
 *   1. `pip install tabpfn-extensions`
 *   2. `from tabpfn import TabPFNClassifier`
 *   3. `clf.fit(X_train, y_train)` → `clf.predict(X_test)`
 *
 * 본 stub 은 TODO 박제 — 실행 시 즉시 stderr + 종료. fire 전 본 함수 body 박제 필요.
 */

import { createClient } from '@supabase/supabase-js';

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

async function main() {
  const args = parseArgs(process.argv);
  if (!args) {
    console.error('Usage: tsx scripts/export-predictions-tabpfn.ts --start YYYY-MM-DD --end YYYY-MM-DD --out path.csv');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL 필요');
    process.exit(1);
  }

  // STUB — 본 plan = body 박제 안 함. 사용자 GPU 결정 후 carry-over fire.
  // 박제 시 아래 path 작성:
  //   1. predictions JOIN games (start ~ end, prediction_type='pre_game', game.status='final')
  //   2. row 별 factors JSONB → 12 column 평탄화 (결측 → 0.5 neutral)
  //   3. target = (game.home_winner_team_id === game.home_team_id) ? 1 : 0
  //   4. CSV write to args.out (header row + data rows)
  //   5. console.log(`exported ${n} rows → ${args.out}`)
  console.error('STUB — TabPFN export 아직 박제 X (사용자 GPU 결정 carry-over). cycle 1013 M-D plan.');
  console.error(`args=${JSON.stringify(args)} (used: 0)`);
  console.error('Supabase connection ready 확인:', createClient(url, key, { auth: { persistSession: false } }) ? 'OK' : 'FAIL');
  process.exit(2); // STUB exit code — fire path 박제 시 0 으로 변경
}

main().catch((e) => {
  console.error('export-predictions-tabpfn stub error:', e);
  process.exit(1);
});
