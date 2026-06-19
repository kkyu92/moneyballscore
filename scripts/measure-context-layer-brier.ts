/**
 * Context Layer Brier delta CLI — plan #23 Step 4 cohort fire.
 *
 * 도입 동기 (cycle 1239, 2026-06-19):
 *   Step 4 harness (measureBrierStats / measureContextLayerBrierDelta, cycle 1235
 *   박제) 가 production cohort 호출 부재. 본 script = 실 DB 쿼리 + pre/post 분할 +
 *   markdown 박제. cycle 1230~1237 wave 41~47 LLM agent context layer 통합 후
 *   judge_prob 분포 변화 측정 entry point.
 *
 * Wave 43 (judge-agent context layer) deploy 시점 = 2026-06-19T11:36 (commit a7c794a)
 * 을 pre/post 경계로 사용. predictions.predicted_at < 경계 = pre, >= = post.
 *
 * home_win_prob 유도: predicted_winner == home_team_id ? confidence : 1 - confidence.
 * actual_home_win 유도: is_correct + picked home → 동일, else 반전.
 *
 * 사용:
 *   pnpm tsx scripts/measure-context-layer-brier.ts <out-path>
 *   (필수 env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 *
 * 표본 floor: pre/post 각 n ≥ 30 권장 (measurement.ts 주석). 미만 시 noise dominant
 *   경고 markdown 박제. 자정 verify cron 누적 후 후속 cycle 재실행 권장.
 */
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  measureContextLayerBrierDelta,
  type JudgmentRecord,
} from '../packages/kbo-data/src/context/measurement';

const WAVE43_BOUNDARY_UTC = '2026-06-19T02:36:00Z';

interface PredRow {
  predicted_winner: number;
  confidence: number;
  is_correct: boolean | null;
  predicted_at: string | null;
  games: { home_team_id: number } | null;
}

async function main() {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error('usage: pnpm tsx scripts/measure-context-layer-brier.ts <out-path>');
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('predictions')
    .select('predicted_winner, confidence, is_correct, predicted_at, games(home_team_id)')
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null)
    .not('predicted_at', 'is', null);
  if (error) throw error;
  const rows = (data ?? []) as unknown as PredRow[];

  const pre: JudgmentRecord[] = [];
  const post: JudgmentRecord[] = [];
  for (const r of rows) {
    const homeTeamId = r.games?.home_team_id;
    if (homeTeamId == null || r.predicted_at == null || r.confidence == null) continue;
    const pickedHome = r.predicted_winner === homeTeamId;
    const homeWinProb = pickedHome ? r.confidence : 1 - r.confidence;
    const actualHomeWin = pickedHome ? r.is_correct === true : r.is_correct === false;
    const record: JudgmentRecord = {
      home_win_prob: homeWinProb,
      actual_home_win: actualHomeWin,
    };
    if (r.predicted_at < WAVE43_BOUNDARY_UTC) pre.push(record);
    else post.push(record);
  }

  const delta = measureContextLayerBrierDelta(pre, post);

  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`# Context Layer Brier delta — ${today} (cycle 1239)`);
  lines.push('');
  lines.push(`Wave 43 deploy 경계: ${WAVE43_BOUNDARY_UTC} (UTC) = 2026-06-19T11:36 KST (commit a7c794a)`);
  lines.push('');
  lines.push('## Cohort 분포');
  lines.push('');
  lines.push('| cohort | n | Brier mean | accuracy |');
  lines.push('|---|---|---|---|');
  lines.push(`| pre  | ${delta.pre.n}  | ${delta.pre.brier_mean.toFixed(4)}  | ${(delta.pre.accuracy * 100).toFixed(1)}% |`);
  lines.push(`| post | ${delta.post.n} | ${delta.post.brier_mean.toFixed(4)} | ${(delta.post.accuracy * 100).toFixed(1)}% |`);
  lines.push('');
  const floor = 30;
  const insufficient = delta.post.n < floor || delta.pre.n < floor;
  lines.push('## Delta');
  lines.push('');
  if (insufficient) {
    lines.push('⚠️ 표본 부족 — delta 산출은 noise dominant. 아래 값은 참고용.');
    lines.push('');
  }
  lines.push(`- delta_brier    = ${delta.delta_brier.toFixed(4)} (음수 = post 가 더 정확)`);
  lines.push(`- delta_accuracy = ${(delta.delta_accuracy * 100).toFixed(2)}pp`);
  lines.push(`- improvement    = ${insufficient ? 'INSUFFICIENT (표본 부족)' : String(delta.improvement)}`);
  lines.push('');

  if (insufficient) {
    lines.push('## ⚠️ 표본 부족 경고');
    lines.push('');
    lines.push(`pre/post 각 n ≥ ${floor} 권장 (measurement.ts 주석). 현재 pre=${delta.pre.n} / post=${delta.post.n}.`);
    lines.push('자정 verify cron 누적 후 후속 cycle 재실행 권장 (n=150 도달 ETA 2026-07-02).');
    lines.push('');
  }

  lines.push('## 산출 방식');
  lines.push('');
  lines.push('- home_win_prob = predicted_winner == home_team_id ? confidence : 1 - confidence');
  lines.push('- actual_home_win = picked home ? is_correct : !is_correct');
  lines.push('- 필터: prediction_type=pre_game, is_correct NOT NULL, predicted_at NOT NULL');
  lines.push('');

  writeFileSync(outPath, lines.join('\n'));
  console.log(`박제: ${outPath}`);
  console.log(`pre n=${delta.pre.n} brier=${delta.pre.brier_mean.toFixed(4)} | post n=${delta.post.n} brier=${delta.post.brier_mean.toFixed(4)} | delta=${delta.delta_brier.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
