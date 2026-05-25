/**
 * op-analysis lite cohort split — plan #8 Tier 1 M7.
 *
 * scoring_rule × 요일 × win_prob_tier 누적 측정 + markdown 박제.
 * supabase service role key 필요. 결과 markdown 만 박제 (commit + PR 은 workflow 책임).
 *
 * 사용:
 *   pnpm tsx scripts/op-analysis-cohort.ts <out-path>
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

interface PredRow {
  is_correct: boolean | null;
  scoring_rule: string | null;
  confidence: number | null;
  verified_at: string | null;
}

const TIER_BOUNDS = [
  { label: "low", min: 0, max: 0.55 },
  { label: "mid", min: 0.55, max: 0.6 },
  { label: "high", min: 0.6, max: 0.7 },
  { label: "veryhigh", min: 0.7, max: 1.0 },
];
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function tierOf(conf: number): string {
  for (const t of TIER_BOUNDS) if (conf >= t.min && conf < t.max) return t.label;
  return "low";
}

async function main() {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error("usage: pnpm tsx scripts/op-analysis-cohort.ts <out-path>");
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
    .select("is_correct, scoring_rule, confidence, verified_at")
    .eq("prediction_type", "pre_game")
    .not("is_correct", "is", null);
  if (error) throw error;
  const rows = (data ?? []) as PredRow[];
  const total = rows.length;
  const correct = rows.filter((r) => r.is_correct).length;

  const bySR: Record<string, { total: number; correct: number; brier: number }> = {};
  const byDay: Record<string, { total: number; correct: number }> = {};
  const byTier: Record<string, { total: number; correct: number }> = {};
  const bySRTier: Record<string, Record<string, { total: number; correct: number }>> = {};

  for (const r of rows) {
    const sr = r.scoring_rule ?? "null";
    const conf = r.confidence ?? 0.5;
    const target = r.is_correct ? 1 : 0;
    if (!bySR[sr]) bySR[sr] = { total: 0, correct: 0, brier: 0 };
    bySR[sr].total++;
    if (r.is_correct) bySR[sr].correct++;
    bySR[sr].brier += (conf - target) ** 2;

    if (r.verified_at) {
      const dt = new Date(r.verified_at);
      const day = DAYS[dt.getUTCDay()];
      if (!byDay[day]) byDay[day] = { total: 0, correct: 0 };
      byDay[day].total++;
      if (r.is_correct) byDay[day].correct++;
    }

    const tier = tierOf(conf);
    if (!byTier[tier]) byTier[tier] = { total: 0, correct: 0 };
    byTier[tier].total++;
    if (r.is_correct) byTier[tier].correct++;

    if (!bySRTier[sr]) bySRTier[sr] = {};
    if (!bySRTier[sr][tier]) bySRTier[sr][tier] = { total: 0, correct: 0 };
    bySRTier[sr][tier].total++;
    if (r.is_correct) bySRTier[sr][tier].correct++;
  }

  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`# op-analysis cohort split (${today})`);
  lines.push("");
  lines.push(`**총 n=${total}** (적중 ${correct} / ${((correct / total) * 100).toFixed(1)}%)`);
  lines.push("");
  lines.push("## scoring_rule split");
  lines.push("");
  lines.push("| rule | n | acc | Brier |");
  lines.push("|---|---|---|---|");
  for (const [sr, v] of Object.entries(bySR).sort()) {
    lines.push(
      `| ${sr} | ${v.total} | ${((v.correct / v.total) * 100).toFixed(1)}% | ${(v.brier / v.total).toFixed(4)} |`,
    );
  }
  lines.push("");
  lines.push("## 요일별");
  lines.push("");
  lines.push("| 요일 | n | acc |");
  lines.push("|---|---|---|");
  for (const day of ["월", "화", "수", "목", "금", "토", "일"]) {
    const v = byDay[day];
    if (!v) continue;
    lines.push(`| ${day} | ${v.total} | ${((v.correct / v.total) * 100).toFixed(1)}% |`);
  }
  lines.push("");
  lines.push("## confidence tier");
  lines.push("");
  lines.push("| tier | n | acc |");
  lines.push("|---|---|---|");
  for (const tier of TIER_BOUNDS.map((t) => t.label)) {
    const v = byTier[tier];
    if (!v) continue;
    lines.push(`| ${tier} | ${v.total} | ${((v.correct / v.total) * 100).toFixed(1)}% |`);
  }
  lines.push("");
  lines.push("## scoring_rule × tier (cohort split heatmap)");
  lines.push("");
  lines.push("| rule | low | mid | high | veryhigh |");
  lines.push("|---|---|---|---|---|");
  for (const sr of Object.keys(bySRTier).sort()) {
    const tiers = bySRTier[sr];
    const cell = (t: string) => {
      const v = tiers[t];
      return v ? `${((v.correct / v.total) * 100).toFixed(0)}% (${v.total})` : "—";
    };
    lines.push(
      `| ${sr} | ${cell("low")} | ${cell("mid")} | ${cell("high")} | ${cell("veryhigh")} |`,
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`자동 생성 — plan #8 Tier 1 M7 op-analysis-weekly cron.`);

  writeFileSync(outPath, lines.join("\n"));
  console.log(`saved: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
