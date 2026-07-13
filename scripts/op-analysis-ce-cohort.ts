/**
 * op-analysis CE cohort 분석 — cycle 1547 spec 축 A (op-analysis heavy).
 *
 * 목적: CREDIT_EXHAUSTED (CE) vs 비CE 정확도 격차 10.4pp 원인 규명.
 *   원인 후보 (cycle 1547 spec):
 *   - (a) LLM 부가가치 (LLM 제거 시 순 quant → base rate)
 *   - (b) temporal cohort bias (CE 구간 특정 시기 편중)
 *   - (c) 조합
 *
 * 산출:
 *   1. CE / 비CE 분리 acc + Brier
 *   2. CE 날짜 분포 (히스토그램)
 *   3. 팀별 CE 정확도
 *   4. same-day v1.8 vs v1.8-credit-fail delta (mixed-day 있으면)
 *
 * 사용:
 *   pnpm tsx scripts/op-analysis-ce-cohort.ts <out-path>
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

interface PredRow {
  id: number;
  game_id: number;
  is_correct: boolean | null;
  scoring_rule: string | null;
  debate_version: string | null;
  confidence: number | null;
  verified_at: string | null;
  reasoning: Record<string, unknown> | null;
  games: {
    game_date: string | null;
    home_team_id: number | null;
    away_team_id: number | null;
  } | null;
}

// CE 판별
// CE = LLM debate 실패 fallback 경로 (confidence=0.3 flat 또는 credit-fail 라벨)
//   - scoring_rule='v1.8-credit-fail' (retrospective backfill 완료 row)
//   - debate_version IS NULL AND scoring_rule='v1.8' (실패 강등 라벨)
function isCE(r: PredRow): boolean {
  if (r.scoring_rule === "v1.8-credit-fail") return true;
  if (r.scoring_rule === "v1.8" && !r.debate_version) return true;
  return false;
}

interface CohortStats {
  n: number;
  correct: number;
  brier: number;
}

function emptyStats(): CohortStats {
  return { n: 0, correct: 0, brier: 0 };
}

function accum(s: CohortStats, correct: boolean, conf: number) {
  s.n++;
  if (correct) s.correct++;
  s.brier += (conf - (correct ? 1 : 0)) ** 2;
}

function accStr(s: CohortStats): string {
  if (s.n === 0) return "—";
  return `${((s.correct / s.n) * 100).toFixed(1)}% (${s.correct}/${s.n}) Brier=${(s.brier / s.n).toFixed(4)}`;
}

async function main() {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error("usage: pnpm tsx scripts/op-analysis-ce-cohort.ts <out-path>");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // pre_game only, v1.8 + v1.8-credit-fail, verified
  const { data, error } = await supabase
    .from("predictions")
    .select(
      "id, game_id, is_correct, scoring_rule, debate_version, confidence, verified_at, reasoning, games(game_date, home_team_id, away_team_id)",
    )
    .eq("prediction_type", "pre_game")
    .in("scoring_rule", ["v1.8", "v1.8-credit-fail"])
    .not("is_correct", "is", null);
  if (error) throw error;
  const rows = (data ?? []) as unknown as PredRow[];

  const all = emptyStats();
  const ce = emptyStats();
  const nonCE = emptyStats();
  const byMonthCE: Record<string, CohortStats> = {};
  const byMonthNonCE: Record<string, CohortStats> = {};
  const byTeamCE: Record<number, CohortStats> = {};
  const byTeamNonCE: Record<number, CohortStats> = {};
  const byDayCE: Record<string, CohortStats> = {};
  const byDayNonCE: Record<string, CohortStats> = {};

  for (const r of rows) {
    const conf = r.confidence ?? 0.5;
    const correct = !!r.is_correct;
    const isCe = isCE(r);
    const bucket = isCe ? ce : nonCE;
    accum(all, correct, conf);
    accum(bucket, correct, conf);

    const gameDate = r.games?.game_date;
    if (gameDate) {
      const ym = gameDate.slice(0, 7);
      const map = isCe ? byMonthCE : byMonthNonCE;
      if (!map[ym]) map[ym] = emptyStats();
      accum(map[ym], correct, conf);

      const dayMap = isCe ? byDayCE : byDayNonCE;
      if (!dayMap[gameDate]) dayMap[gameDate] = emptyStats();
      accum(dayMap[gameDate], correct, conf);
    }

    // 팀별 (home_team_id 기준 — CE 실패는 홈 예측이므로 home 팀 편중 가능)
    const homeId = r.games?.home_team_id;
    const awayId = r.games?.away_team_id;
    for (const tid of [homeId, awayId]) {
      if (tid == null) continue;
      const tmap = isCe ? byTeamCE : byTeamNonCE;
      if (!tmap[tid]) tmap[tid] = emptyStats();
      accum(tmap[tid], correct, conf);
    }
  }

  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`# op-analysis CE cohort 분석 (${today}, cycle 1550)`);
  lines.push("");
  lines.push("cycle 1547 spec 축 A — CE(CREDIT_EXHAUSTED) vs 비CE 10.4pp 격차 원인 규명 heavy retrospective.");
  lines.push("");
  lines.push("## CE 판별 기준");
  lines.push("");
  lines.push("- CE = `scoring_rule='v1.8-credit-fail'` OR (`scoring_rule='v1.8'` AND `debate_version IS NULL`)");
  lines.push("- 비CE = `scoring_rule='v1.8'` AND `debate_version='v2-persona4'`");
  lines.push("");
  lines.push("## 1. 전체 vs CE vs 비CE");
  lines.push("");
  lines.push(`- **전체**: ${accStr(all)}`);
  lines.push(`- **CE**: ${accStr(ce)}`);
  lines.push(`- **비CE**: ${accStr(nonCE)}`);
  if (ce.n > 0 && nonCE.n > 0) {
    const gap = (nonCE.correct / nonCE.n - ce.correct / ce.n) * 100;
    lines.push("");
    lines.push(`**격차 (비CE − CE) = ${gap.toFixed(1)}pp**`);
  }

  lines.push("");
  lines.push("## 2. 월별 CE / 비CE 분포 (temporal bias check)");
  lines.push("");
  lines.push("| 월 | CE n | CE acc | 비CE n | 비CE acc |");
  lines.push("|---|---|---|---|---|");
  const allMonths = Array.from(new Set([...Object.keys(byMonthCE), ...Object.keys(byMonthNonCE)])).sort();
  for (const m of allMonths) {
    const cs = byMonthCE[m] ?? emptyStats();
    const ns = byMonthNonCE[m] ?? emptyStats();
    const csAcc = cs.n > 0 ? `${((cs.correct / cs.n) * 100).toFixed(1)}%` : "—";
    const nsAcc = ns.n > 0 ? `${((ns.correct / ns.n) * 100).toFixed(1)}%` : "—";
    lines.push(`| ${m} | ${cs.n} | ${csAcc} | ${ns.n} | ${nsAcc} |`);
  }

  lines.push("");
  lines.push("## 3. 팀별 CE 정확도 (팀 편중 check)");
  lines.push("");
  lines.push("| team_id | CE n | CE acc | 비CE n | 비CE acc |");
  lines.push("|---|---|---|---|---|");
  const allTeams = Array.from(new Set([...Object.keys(byTeamCE), ...Object.keys(byTeamNonCE)])).sort(
    (a, b) => +a - +b,
  );
  for (const t of allTeams) {
    const cs = byTeamCE[+t] ?? emptyStats();
    const ns = byTeamNonCE[+t] ?? emptyStats();
    const csAcc = cs.n > 0 ? `${((cs.correct / cs.n) * 100).toFixed(1)}%` : "—";
    const nsAcc = ns.n > 0 ? `${((ns.correct / ns.n) * 100).toFixed(1)}%` : "—";
    lines.push(`| ${t} | ${cs.n} | ${csAcc} | ${ns.n} | ${nsAcc} |`);
  }

  // same-day mixed cohort (CE 와 비CE 가 같은 날 존재 시)
  const mixedDays: string[] = [];
  for (const d of Object.keys(byDayCE)) {
    if (byDayNonCE[d]) mixedDays.push(d);
  }
  mixedDays.sort();

  lines.push("");
  lines.push("## 4. Same-day mixed cohort (CE + 비CE 공존 날짜)");
  lines.push("");
  if (mixedDays.length === 0) {
    lines.push("**mixed days = 0** — CE 는 특정 날짜 전체 편중 (LLM fallback 이 세션 단위 실패 = 같은 날 예측 모두 CE / 모두 비CE 이분화).");
  } else {
    lines.push(`**mixed days = ${mixedDays.length}**`);
    lines.push("");
    lines.push("| 날짜 | CE n | CE acc | 비CE n | 비CE acc |");
    lines.push("|---|---|---|---|---|");
    for (const d of mixedDays) {
      const cs = byDayCE[d];
      const ns = byDayNonCE[d];
      lines.push(
        `| ${d} | ${cs.n} | ${((cs.correct / cs.n) * 100).toFixed(1)}% | ${ns.n} | ${((ns.correct / ns.n) * 100).toFixed(1)}% |`,
      );
    }
  }

  lines.push("");
  lines.push("## 5. 원인 진단");
  lines.push("");
  lines.push("### (a) LLM 부가가치 가설");
  lines.push("");
  lines.push("- CE = LLM 실패 (순 quant) / 비CE = LLM 성공 (quant + debate shift)");
  lines.push("- 순 quant base rate 는 CE acc 로 관측됨");
  if (ce.n > 0 && nonCE.n > 0) {
    const gap = (nonCE.correct / nonCE.n - ce.correct / ce.n) * 100;
    lines.push(`- 격차 ${gap.toFixed(1)}pp 가 순수 LLM 부가가치 (temporal bias 배제 시)`);
  }

  lines.push("");
  lines.push("### (b) temporal bias 가설");
  lines.push("");
  lines.push("- CE 는 특정 월 (2026-05 credit 소진기) 편중 여부 = 월별 표 참조");
  lines.push("- 만약 CE 월과 비CE 월 이 완전 분리 → base rate 자체 시기 차이 가능");
  const ceMonths = Object.keys(byMonthCE);
  const nonCEMonths = Object.keys(byMonthNonCE);
  const overlapMonths = ceMonths.filter((m) => nonCEMonths.includes(m));
  lines.push(`- CE 월 수: ${ceMonths.length} / 비CE 월 수: ${nonCEMonths.length} / **overlap 월 수: ${overlapMonths.length}**`);
  if (overlapMonths.length > 0) {
    lines.push(`  - overlap: ${overlapMonths.join(", ")}`);
    // overlap 월 안 격차 재측정
    let ovCECorr = 0, ovCEN = 0, ovNonCECorr = 0, ovNonCEN = 0;
    for (const m of overlapMonths) {
      ovCECorr += byMonthCE[m]!.correct;
      ovCEN += byMonthCE[m]!.n;
      ovNonCECorr += byMonthNonCE[m]!.correct;
      ovNonCEN += byMonthNonCE[m]!.n;
    }
    if (ovCEN > 0 && ovNonCEN > 0) {
      const ovGap = (ovNonCECorr / ovNonCEN - ovCECorr / ovCEN) * 100;
      lines.push(`  - overlap 월 안 격차 (temporal 통제): ${ovGap.toFixed(1)}pp (CE ${((ovCECorr / ovCEN) * 100).toFixed(1)}% / 비CE ${((ovNonCECorr / ovNonCEN) * 100).toFixed(1)}%)`);
      lines.push("  - overlap 격차 ≈ 전체 격차 → LLM 부가가치 우세 / overlap 격차 <<  전체 격차 → temporal bias 우세");
    }
  }

  lines.push("");
  lines.push("### (c) 결론");
  lines.push("");
  lines.push("- 위 진단 (a) / (b) 조합 검토 → 다음 cycle plan #24 draft input.");

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("자동 생성 — cycle 1550 op-analysis (heavy). `scripts/op-analysis-ce-cohort.ts`.");

  writeFileSync(outPath, lines.join("\n"));
  console.log(`saved: ${outPath}`);
  console.log(`total n=${all.n} / CE n=${ce.n} / 비CE n=${nonCE.n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
