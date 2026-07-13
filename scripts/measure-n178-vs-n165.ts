/**
 * cycle 1549 축 C — n=178 vs n=165 표본 미스매치 원인 규명.
 *
 * cycle 1460 시점 n=178 (plan #16 expanding window OOS) vs
 * cycle 1545 시점 n=165 (weekly-review DB 실측).
 *
 * 원인 후보:
 * - shadow rows 포함/미포함
 * - scoring_rule filter 차이
 * - postview_daily / retro backfill 포함 여부
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("env missing");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log("=== n=178 vs n=165 표본 미스매치 진단 (cycle 1549) ===\n");

  // 1) 전체 verified pre_game with is_correct
  const q1 = await sb
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("prediction_type", "pre_game")
    .not("is_correct", "is", null);
  console.log(`[1] verified pre_game (is_correct != null): n=${q1.count}`);

  // 2) scoring_rule 분포
  const q2 = await sb
    .from("predictions")
    .select("scoring_rule, is_correct")
    .eq("prediction_type", "pre_game")
    .not("is_correct", "is", null);
  const bySR: Record<string, number> = {};
  const byCorrect: Record<string, { correct: number; total: number }> = {};
  for (const r of q2.data ?? []) {
    const sr = r.scoring_rule ?? "null";
    bySR[sr] = (bySR[sr] ?? 0) + 1;
    if (!byCorrect[sr]) byCorrect[sr] = { correct: 0, total: 0 };
    byCorrect[sr].total++;
    if (r.is_correct) byCorrect[sr].correct++;
  }
  console.log(`\n[2] scoring_rule 분포 (verified pre_game):`);
  for (const [sr, n] of Object.entries(bySR).sort((a, b) => b[1] - a[1])) {
    const c = byCorrect[sr];
    const acc = ((c.correct / c.total) * 100).toFixed(1);
    console.log(`    ${sr}: n=${n} acc=${acc}%`);
  }

  // 3) v1.8 + v1.8-credit-fail 합계 (사용자 가시 실측)
  const v18Total = (bySR["v1.8"] ?? 0) + (bySR["v1.8-credit-fail"] ?? 0);
  console.log(`\n[3] v1.8 + v1.8-credit-fail 합계: n=${v18Total}`);

  // 4) shadow rows 확인
  const shadowKeys = Object.keys(bySR).filter((k) => k.includes("shadow"));
  const shadowTotal = shadowKeys.reduce((s, k) => s + bySR[k], 0);
  console.log(`\n[4] shadow rows (scoring_rule contains 'shadow'): n=${shadowTotal}`);
  for (const k of shadowKeys) console.log(`    ${k}: n=${bySR[k]}`);

  // 5) predicted_at 기간 분포 (v1.8 시작 5/13 이후)
  const q5 = await sb
    .from("predictions")
    .select("predicted_at, verified_at, scoring_rule")
    .eq("prediction_type", "pre_game")
    .not("is_correct", "is", null)
    .order("predicted_at", { ascending: true });
  const rows5 = q5.data ?? [];
  if (rows5.length > 0) {
    console.log(`\n[5] predicted_at 범위:`);
    console.log(`    first: ${rows5[0].predicted_at} (${rows5[0].scoring_rule})`);
    console.log(`    last: ${rows5[rows5.length - 1].predicted_at} (${rows5[rows5.length - 1].scoring_rule})`);
  }

  // 6) v1.8 시작 (2026-05-13) 이후만 (히스토릭 v1.7 이전 제외)
  const q6 = await sb
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("prediction_type", "pre_game")
    .not("is_correct", "is", null)
    .gte("predicted_at", "2026-05-13");
  console.log(`\n[6] verified pre_game since v1.8 start (2026-05-13): n=${q6.count}`);

  // 7) v1.8 + v1.8-credit-fail scoring_rule + since 5/13
  const q7 = await sb
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("prediction_type", "pre_game")
    .not("is_correct", "is", null)
    .gte("predicted_at", "2026-05-13")
    .in("scoring_rule", ["v1.8", "v1.8-credit-fail"]);
  console.log(`[7] verified pre_game v1.8 family since 5/13: n=${q7.count}`);

  // 8) prediction_type = pre_game X (postview_daily 등 확인)
  const q8 = await sb
    .from("predictions")
    .select("prediction_type")
    .not("is_correct", "is", null);
  const byType: Record<string, number> = {};
  for (const r of q8.data ?? []) {
    const t = r.prediction_type ?? "null";
    byType[t] = (byType[t] ?? 0) + 1;
  }
  console.log(`\n[8] prediction_type 분포 (is_correct != null 전체):`);
  for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t}: n=${n}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
