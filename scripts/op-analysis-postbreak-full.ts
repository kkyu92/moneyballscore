import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

function isCE(r: { scoring_rule: string|null, debate_version: string|null }): boolean {
  if (r.scoring_rule === "v1.8-credit-fail") return true;
  if (r.scoring_rule === "v1.8" && !r.debate_version) return true;
  return false;
}

async function main() {
  let all: any[] = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from("predictions")
      .select(`id, is_correct, confidence, scoring_rule, debate_version, home_win_prob, games!inner(game_date)`)
      .eq("league", "kbo")
      .in("scoring_rule", ["v1.8", "v1.8-credit-fail"])
      .not("is_correct", "is", null)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    
    if (error) { console.error(error); break; }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  console.log(`Total v1.8 verified predictions: ${all.length}`);
  
  let totalCE = { correct: 0, n: 0 };
  let totalNonCE = { correct: 0, n: 0 };
  
  // Monthly breakdown
  const monthly: Record<string, { ce_c: number, ce_n: number, nce_c: number, nce_n: number }> = {};
  const allStar = "2026-07-16";
  let preBreakCE = { c: 0, n: 0 };
  let postBreakCE = { c: 0, n: 0 };
  
  for (const row of all) {
    const g = row.games as any;
    const date = g?.game_date || "";
    const month = date.slice(0, 7);
    if (!monthly[month]) monthly[month] = { ce_c: 0, ce_n: 0, nce_c: 0, nce_n: 0 };
    const m = monthly[month];
    const correct = row.is_correct === true;
    const ce = isCE(row);
    if (ce) {
      totalCE.n++; if (correct) totalCE.correct++;
      m.ce_n++; if (correct) m.ce_c++;
      if (date >= allStar) { postBreakCE.n++; if (correct) postBreakCE.c++; }
      else { preBreakCE.n++; if (correct) preBreakCE.c++; }
    } else {
      totalNonCE.n++; if (correct) totalNonCE.correct++;
      m.nce_n++; if (correct) m.nce_c++;
    }
  }
  
  console.log(`\nOverall CE acc: ${(totalCE.correct/totalCE.n*100).toFixed(1)}% (${totalCE.correct}/${totalCE.n})`);
  console.log(`Overall non-CE acc: ${totalNonCE.n > 0 ? (totalNonCE.correct/totalNonCE.n*100).toFixed(1) : "n/a"}% (${totalNonCE.correct}/${totalNonCE.n})`);
  
  console.log(`\nPre-break CE acc: ${preBreakCE.n > 0 ? (preBreakCE.c/preBreakCE.n*100).toFixed(1) : "n/a"}% (${preBreakCE.c}/${preBreakCE.n})`);
  console.log(`Post-break CE acc: ${postBreakCE.n > 0 ? (postBreakCE.c/postBreakCE.n*100).toFixed(1) : "n/a"}% (${postBreakCE.c}/${postBreakCE.n})`);
  
  console.log(`\nMonthly breakdown:`);
  for (const [month, m] of Object.entries(monthly).sort()) {
    const ceAcc = m.ce_n > 0 ? `${(m.ce_c/m.ce_n*100).toFixed(1)}%(${m.ce_c}/${m.ce_n})` : "-";
    const nceAcc = m.nce_n > 0 ? `${(m.nce_c/m.nce_n*100).toFixed(1)}%(${m.nce_c}/${m.nce_n})` : "-";
    console.log(`  ${month}: CE=${ceAcc} nonCE=${nceAcc}`);
  }
  
  // Recent 30 predictions trend (last 30 verified)
  console.log(`\nLast 30 predictions rolling trend:`);
  const last30 = all.slice(-30);
  let streak = { c: 0, n: 0 };
  for (const row of last30) {
    const correct = row.is_correct === true;
    streak.n++; if (correct) streak.c++;
  }
  console.log(`  Last 30: ${(streak.c/streak.n*100).toFixed(1)}% (${streak.c}/${streak.n})`);
  
  const last10 = all.slice(-10);
  let s10 = { c: 0, n: 0 };
  for (const row of last10) { s10.n++; if (row.is_correct) s10.c++; }
  console.log(`  Last 10: ${(s10.c/s10.n*100).toFixed(1)}% (${s10.c}/${s10.n})`);
}

main().catch(console.error);
