/**
 * op-analysis heavy — Brier drift 원인 분석.
 *
 * M3 (cycle 1456 Fable plan): home_win_prob 기반 Brier 로 교체.
 * 이전 버전은 confidence vs is_correct (winner-centric) 사용 — CREDIT_EXHAUSTED 시
 * confidence=0.3 fallback marker 가 섞여 Brier 기계적 악화. 측정 오류였음.
 * home_win_prob Brier pre/post = 0.24 (stable, coin-flip 이하) — 모델 정상.
 *
 * 사용:
 *   cd apps/moneyball && set -a && source .env.local && set +a
 *   pnpm exec tsx ../../scripts/op-analysis-brier-drift.ts <out-path>
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { brierMean, brierBootstrapCI, COIN_FLIP_BRIER, type BrierRow } from "../packages/kbo-data/src/pipeline/brier.js";

interface PredRow {
  is_correct: boolean | null;
  confidence: number | null;
  verified_at: string | null;
  home_win_prob: number | null;
  home_won: 0 | 1;  // derived: actual_winner === games.home_team_id
}

const TIER_BOUNDS = [
  { label: "low", min: 0, max: 0.55 },
  { label: "mid", min: 0.55, max: 0.6 },
  { label: "high", min: 0.6, max: 0.7 },
  { label: "veryhigh", min: 0.7, max: 1.0 },
];

function tierOf(conf: number): string {
  for (const t of TIER_BOUNDS) if (conf >= t.min && conf < t.max) return t.label;
  return "low";
}

async function main() {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error("usage: pnpm tsx scripts/op-analysis-brier-drift.ts <out-path>");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("predictions")
    .select(`
      is_correct, confidence, verified_at, home_win_prob, actual_winner,
      games!inner(home_team_id)
    `)
    .eq("prediction_type", "pre_game")
    .eq("scoring_rule", "v1.8")
    .not("is_correct", "is", null)
    .not("verified_at", "is", null)
    .not("home_win_prob", "is", null)
    .order("verified_at", { ascending: true });

  if (error) throw error;

  const rows: PredRow[] = ((data ?? []) as any[]).map((r) => ({
    is_correct: r.is_correct,
    confidence: r.confidence,
    verified_at: r.verified_at,
    home_win_prob: r.home_win_prob,
    home_won: (r.actual_winner === r.games?.home_team_id ? 1 : 0) as 0 | 1,
  }));

  const n = rows.length;
  if (n === 0) { console.error("no v1.8 pre_game rows"); process.exit(1); }

  const toBrierRows = (arr: PredRow[]): BrierRow[] =>
    arr.filter(r => r.home_win_prob != null).map(r => ({
      home_win_prob: r.home_win_prob!,
      home_won: r.home_won,
    }));

  const overall = brierMean(toBrierRows(rows)) ?? NaN;
  const overallAcc = rows.filter((r) => r.is_correct).length / n;

  // rolling window Brier (window=30)
  const WINDOW = 30;
  const rolling: { idx: number; verified_at: string; brier: number }[] = [];
  for (let i = WINDOW; i <= n; i++) {
    const window = rows.slice(i - WINDOW, i);
    const b = brierMean(toBrierRows(window));
    if (b != null) rolling.push({ idx: i, verified_at: window[window.length - 1].verified_at ?? "", brier: b });
  }

  // pre/post split — 첫 118 (baseline) vs 나머지
  const SPLIT = 118;
  const pre = rows.slice(0, SPLIT);
  const post = rows.slice(SPLIT);
  const preBrier = brierMean(toBrierRows(pre)) ?? NaN;
  const postBrier = brierMean(toBrierRows(post)) ?? NaN;
  const preAcc = pre.filter((r) => r.is_correct).length / pre.length;
  const postAcc = post.filter((r) => r.is_correct).length / post.length;
  const preCI = brierBootstrapCI(toBrierRows(pre));
  const postCI = brierBootstrapCI(toBrierRows(post));

  // CREDIT_EXHAUSTED fallback rate
  const preFallback = pre.filter(r => r.confidence === 0.3).length;
  const postFallback = post.filter(r => r.confidence === 0.3).length;

  // confidence tier subgroup — tier 기준은 confidence 유지 (home_win_prob 기준 Brier 계산)
  const preByTier: Record<string, { n: number; acc: number; brier: number }> = {};
  const postByTier: Record<string, { n: number; acc: number; brier: number }> = {};
  for (const [rowsSlice, out] of [[pre, preByTier], [post, postByTier]] as const) {
    const buckets: Record<string, PredRow[]> = {};
    for (const r of rowsSlice) {
      const t = tierOf(r.confidence ?? 0.5);
      if (!buckets[t]) buckets[t] = [];
      buckets[t].push(r);
    }
    for (const [t, arr] of Object.entries(buckets)) {
      out[t] = {
        n: arr.length,
        acc: arr.filter((r) => r.is_correct).length / arr.length,
        brier: brierMean(toBrierRows(arr)) ?? NaN,
      };
    }
  }

  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`# op-analysis heavy — Brier drift 원인 분석 (${today})`);
  lines.push("");
  lines.push(`**scope**: v1.8 pre_game cohort n=${n} chronological (verified_at asc).`);
  lines.push(`**metric**: home_win_prob vs actual home win (M3 기준, winner-centric 폐기).`);
  lines.push(`**coin-flip baseline**: ${COIN_FLIP_BRIER}`);
  lines.push("");
  lines.push("## overall");
  lines.push("");
  lines.push(`- n = ${n}`);
  lines.push(`- accuracy = ${(overallAcc * 100).toFixed(1)}%`);
  lines.push(`- Brier = ${overall.toFixed(4)}`);
  lines.push(`- conf=0.3 fallback (CREDIT_EXHAUSTED): pre ${preFallback}/${pre.length} (${(preFallback/pre.length*100).toFixed(1)}%) | post ${postFallback}/${post.length} (${(postFallback/post.length*100).toFixed(1)}%)`);
  lines.push("");
  lines.push("## pre/post threshold split (n=118 baseline vs 나머지)");
  lines.push("");
  lines.push("| segment | n | acc | Brier | bootstrap 95% CI |");
  lines.push("|---|---|---|---|---|");
  lines.push(`| pre (첫 ${pre.length}) | ${pre.length} | ${(preAcc * 100).toFixed(1)}% | ${preBrier.toFixed(4)} | [${preCI?.lo.toFixed(4)}, ${preCI?.hi.toFixed(4)}] |`);
  lines.push(`| post (${post.length}) | ${post.length} | ${(postAcc * 100).toFixed(1)}% | ${postBrier.toFixed(4)} | [${postCI?.lo.toFixed(4)}, ${postCI?.hi.toFixed(4)}] |`);
  lines.push("");
  const overlap = preCI && postCI && !(preCI.hi < postCI.lo || postCI.hi < preCI.lo);
  lines.push(`**CI overlap**: ${overlap ? "YES — 통계 유의성 없음" : "NO — 통계 유의성 있음"}`);
  lines.push("");

  lines.push("## rolling window Brier (window=30)");
  lines.push("");
  lines.push("| idx | verified_at | window Brier |");
  lines.push("|---|---|---|");
  const step = Math.max(1, Math.floor(rolling.length / 20));
  for (let i = 0; i < rolling.length; i += step) {
    const r = rolling[i];
    lines.push(`| ${r.idx} | ${r.verified_at.slice(0, 10)} | ${r.brier.toFixed(4)} |`);
  }
  if (rolling.length > 0) {
    const last = rolling[rolling.length - 1];
    lines.push(`| ${last.idx} | ${last.verified_at.slice(0, 10)} | ${last.brier.toFixed(4)} |`);
  }
  lines.push("");

  lines.push("## confidence tier subgroup (pre vs post) — home_win_prob Brier");
  lines.push("");
  lines.push("| tier | pre n | pre acc | pre Brier | post n | post acc | post Brier | Brier Δ |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const tb of TIER_BOUNDS) {
    const t = tb.label;
    const p = preByTier[t] ?? { n: 0, acc: 0, brier: NaN };
    const q = postByTier[t] ?? { n: 0, acc: 0, brier: NaN };
    const delta = !isNaN(q.brier) && !isNaN(p.brier) ? q.brier - p.brier : NaN;
    lines.push(`| ${t} | ${p.n} | ${(p.acc * 100).toFixed(1)}% | ${isNaN(p.brier) ? "—" : p.brier.toFixed(4)} | ${q.n} | ${(q.acc * 100).toFixed(1)}% | ${isNaN(q.brier) ? "—" : q.brier.toFixed(4)} | ${isNaN(delta) ? "—" : (delta >= 0 ? "+" : "") + delta.toFixed(4)} |`);
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("자동 생성 — op-analysis (heavy) Brier drift 분석. M3: home_win_prob 기반 단일 메트릭.");

  writeFileSync(outPath, lines.join("\n"));
  console.log(`saved: ${outPath}`);
  console.log(`\n=== 요약 ===`);
  console.log(`n=${n} overall Brier=${overall.toFixed(4)} acc=${(overallAcc * 100).toFixed(1)}%`);
  console.log(`pre  (${pre.length}): Brier=${preBrier.toFixed(4)} CI=[${preCI?.lo.toFixed(4)}, ${preCI?.hi.toFixed(4)}]`);
  console.log(`post (${post.length}): Brier=${postBrier.toFixed(4)} CI=[${postCI?.lo.toFixed(4)}, ${postCI?.hi.toFixed(4)}]`);
  console.log(`CI overlap: ${overlap ? "YES" : "NO"}`);
  console.log(`conf=0.3 fallback rate: pre ${(preFallback/pre.length*100).toFixed(1)}% | post ${(postFallback/post.length*100).toFixed(1)}%`);
}

main().catch((e) => { console.error(e); process.exit(1); });
