/**
 * op-analysis heavy — Brier drift 원인 분석.
 *
 * cycle 1447 lite baseline: v1.8 pre_game n=161 acc 60.9% Brier 0.2995 (vs 직전 n=118 Brier 0.2730).
 * marginal Brier ~0.37 (base 0.27 대비 큰 악화) — 원인 분해:
 *   - temporal rolling window (drift 시점 식별)
 *   - bootstrap 95% CI (pre/post threshold Brier 통계 유의성)
 *   - confidence tier subgroup (어떤 tier 가 drift 견인)
 *
 * 사용:
 *   pnpm tsx scripts/op-analysis-brier-drift.ts <out-path>
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

interface PredRow {
  is_correct: boolean | null;
  scoring_rule: string | null;
  confidence: number | null;
  verified_at: string | null;
  home_win_prob: number | null;
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

function brier(rows: PredRow[]): number {
  if (rows.length === 0) return NaN;
  let sum = 0;
  for (const r of rows) {
    const conf = r.confidence ?? 0.5;
    const target = r.is_correct ? 1 : 0;
    sum += (conf - target) ** 2;
  }
  return sum / rows.length;
}

function bootstrapCI(rows: PredRow[], iters = 2000, alpha = 0.05): { lo: number; hi: number; mean: number } {
  if (rows.length === 0) return { lo: NaN, hi: NaN, mean: NaN };
  const briers: number[] = [];
  for (let i = 0; i < iters; i++) {
    const sample: PredRow[] = [];
    for (let j = 0; j < rows.length; j++) {
      sample.push(rows[Math.floor(Math.random() * rows.length)]);
    }
    briers.push(brier(sample));
  }
  briers.sort((a, b) => a - b);
  const loIdx = Math.floor(iters * (alpha / 2));
  const hiIdx = Math.floor(iters * (1 - alpha / 2));
  const mean = briers.reduce((s, v) => s + v, 0) / iters;
  return { lo: briers[loIdx], hi: briers[hiIdx], mean };
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
    .select("is_correct, scoring_rule, confidence, verified_at, home_win_prob")
    .eq("prediction_type", "pre_game")
    .eq("scoring_rule", "v1.8")
    .not("is_correct", "is", null)
    .not("verified_at", "is", null)
    .order("verified_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as PredRow[];
  const n = rows.length;
  if (n === 0) {
    console.error("no v1.8 pre_game rows");
    process.exit(1);
  }

  const overall = brier(rows);
  const overallAcc = rows.filter((r) => r.is_correct).length / n;

  // rolling window Brier (window=30)
  const WINDOW = 30;
  const rolling: { idx: number; verified_at: string; brier: number }[] = [];
  for (let i = WINDOW; i <= n; i++) {
    const window = rows.slice(i - WINDOW, i);
    rolling.push({
      idx: i,
      verified_at: window[window.length - 1].verified_at ?? "",
      brier: brier(window),
    });
  }

  // pre/post threshold split — 첫 118 (baseline) vs 나머지 43 (drift period)
  const SPLIT = 118;
  const pre = rows.slice(0, SPLIT);
  const post = rows.slice(SPLIT);
  const preBrier = brier(pre);
  const postBrier = brier(post);
  const preAcc = pre.filter((r) => r.is_correct).length / pre.length;
  const postAcc = post.filter((r) => r.is_correct).length / post.length;
  const preCI = bootstrapCI(pre);
  const postCI = bootstrapCI(post);

  // tier subgroup on post period (which tier drove drift)
  const postByTier: Record<string, { n: number; acc: number; brier: number }> = {};
  const preByTier: Record<string, { n: number; acc: number; brier: number }> = {};
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
        brier: brier(arr),
      };
    }
  }

  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`# op-analysis heavy — Brier drift 원인 분석 (${today})`);
  lines.push("");
  lines.push(`**scope**: v1.8 pre_game cohort n=${n} chronological (verified_at asc).`);
  lines.push(`**baseline**: cycle 1447 lite → Brier 0.2995 (n=161) vs 직전 n=118 Brier 0.2730 drift.`);
  lines.push("");
  lines.push("## overall");
  lines.push("");
  lines.push(`- n = ${n}`);
  lines.push(`- accuracy = ${(overallAcc * 100).toFixed(1)}%`);
  lines.push(`- Brier = ${overall.toFixed(4)}`);
  lines.push("");
  lines.push("## pre/post threshold split (n=118 baseline vs n=43 drift period)");
  lines.push("");
  lines.push("| segment | n | acc | Brier | bootstrap 95% CI |");
  lines.push("|---|---|---|---|---|");
  lines.push(`| pre (첫 ${pre.length}) | ${pre.length} | ${(preAcc * 100).toFixed(1)}% | ${preBrier.toFixed(4)} | [${preCI.lo.toFixed(4)}, ${preCI.hi.toFixed(4)}] |`);
  lines.push(`| post (드리프트 ${post.length}) | ${post.length} | ${(postAcc * 100).toFixed(1)}% | ${postBrier.toFixed(4)} | [${postCI.lo.toFixed(4)}, ${postCI.hi.toFixed(4)}] |`);
  lines.push("");
  const overlap = !(preCI.hi < postCI.lo || postCI.hi < preCI.lo);
  lines.push(`**CI overlap**: ${overlap ? "YES" : "NO"} — pre CI [${preCI.lo.toFixed(4)}, ${preCI.hi.toFixed(4)}] vs post CI [${postCI.lo.toFixed(4)}, ${postCI.hi.toFixed(4)}]. ${overlap ? "통계 유의성 없음 (표본 노이즈 가능)." : "통계 유의성 있음 (진짜 drift)."}`);
  lines.push("");

  lines.push("## rolling window Brier (window=30)");
  lines.push("");
  lines.push("| idx | verified_at | window Brier |");
  lines.push("|---|---|---|");
  // sample every ~10 rows to keep output compact
  const step = Math.max(1, Math.floor(rolling.length / 20));
  for (let i = 0; i < rolling.length; i += step) {
    const r = rolling[i];
    lines.push(`| ${r.idx} | ${r.verified_at.slice(0, 10)} | ${r.brier.toFixed(4)} |`);
  }
  // last
  if (rolling.length > 0) {
    const last = rolling[rolling.length - 1];
    lines.push(`| ${last.idx} | ${last.verified_at.slice(0, 10)} | ${last.brier.toFixed(4)} |`);
  }
  lines.push("");

  lines.push("## confidence tier subgroup (pre vs post)");
  lines.push("");
  lines.push("| tier | pre n | pre acc | pre Brier | post n | post acc | post Brier | Brier Δ |");
  lines.push("|---|---|---|---|---|---|---|---|");
  const allTiers = new Set([...Object.keys(preByTier), ...Object.keys(postByTier)]);
  for (const t of TIER_BOUNDS.map((tb) => tb.label)) {
    if (!allTiers.has(t)) continue;
    const p = preByTier[t] ?? { n: 0, acc: 0, brier: NaN };
    const q = postByTier[t] ?? { n: 0, acc: 0, brier: NaN };
    const delta = !isNaN(q.brier) && !isNaN(p.brier) ? q.brier - p.brier : NaN;
    lines.push(
      `| ${t} | ${p.n} | ${(p.acc * 100).toFixed(1)}% | ${isNaN(p.brier) ? "—" : p.brier.toFixed(4)} | ${q.n} | ${(q.acc * 100).toFixed(1)}% | ${isNaN(q.brier) ? "—" : q.brier.toFixed(4)} | ${isNaN(delta) ? "—" : (delta >= 0 ? "+" : "") + delta.toFixed(4)} |`,
    );
  }
  lines.push("");

  lines.push("## marginal Brier (drift period only)");
  lines.push("");
  const marginalBrier = (overall * n - preBrier * pre.length) / post.length;
  lines.push(`- marginal Brier (post ${post.length} 게임 단독) = ${marginalBrier.toFixed(4)}`);
  lines.push(`- 대비 base Brier ${preBrier.toFixed(4)} (pre ${pre.length} 게임) — Δ ${(marginalBrier - preBrier).toFixed(4)}`);
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(`자동 생성 — op-analysis (heavy) Brier drift 원인 분석. R8 사용자 결정 (v2.0 rebalance / v1.8 유지 / v2.1-B reject) 근거 evidence.`);

  writeFileSync(outPath, lines.join("\n"));
  console.log(`saved: ${outPath}`);
  console.log(`\n=== 요약 ===`);
  console.log(`n=${n} overall Brier=${overall.toFixed(4)} acc=${(overallAcc * 100).toFixed(1)}%`);
  console.log(`pre  (${pre.length}): Brier=${preBrier.toFixed(4)} CI=[${preCI.lo.toFixed(4)}, ${preCI.hi.toFixed(4)}]`);
  console.log(`post (${post.length}): Brier=${postBrier.toFixed(4)} CI=[${postCI.lo.toFixed(4)}, ${postCI.hi.toFixed(4)}]`);
  console.log(`CI overlap: ${overlap ? "YES" : "NO"}`);
  console.log(`marginal post Brier=${marginalBrier.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
