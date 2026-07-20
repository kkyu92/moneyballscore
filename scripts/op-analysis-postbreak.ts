import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

function isCE(r: { scoring_rule: string|null, debate_version: string|null }): boolean {
  if (r.scoring_rule === "v1.8-credit-fail") return true;
  if (r.scoring_rule === "v1.8" && !r.debate_version) return true;
  return false;
}

interface DayStat {
  correct: number; total: number; ce: number; ce_correct: number; non_ce: number; non_ce_correct: number;
}

async function main() {
  const { data, error } = await supabase
    .from("predictions")
    .select(`id, is_correct, confidence, scoring_rule, debate_version, predicted_winner, home_win_prob, games!inner(game_date, home_team_id, away_team_id, home_score, away_score, status)`)
    .eq("league", "kbo")
    .in("scoring_rule", ["v1.8", "v1.8-credit-fail"])
    .not("is_correct", "is", null)
    .gte("games.game_date", "2026-07-10")
    .order("games(game_date)", { ascending: true });

  if (error) { console.error("Error:", error); return; }

  const byDate: Record<string, DayStat> = {};
  for (const row of data || []) {
    const g = row.games as any;
    const date = g?.game_date || "unknown";
    if (!byDate[date]) byDate[date] = { correct: 0, total: 0, ce: 0, ce_correct: 0, non_ce: 0, non_ce_correct: 0 };
    const s = byDate[date];
    s.total++;
    const correct = row.is_correct === true;
    if (correct) s.correct++;
    const ce = isCE(row);
    if (ce) { s.ce++; if (correct) s.ce_correct++; }
    else { s.non_ce++; if (correct) s.non_ce_correct++; }
  }

  const allStar = "2026-07-16";
  for (const [date, s] of Object.entries(byDate).sort()) {
    const acc = (s.correct / s.total * 100).toFixed(1);
    const flag = date >= allStar ? "POST" : "pre ";
    const ceStr = s.ce > 0 ? ` CE=${s.ce_correct}/${s.ce}` : "";
    const nonCeStr = s.non_ce > 0 ? ` nonCE=${s.non_ce_correct}/${s.non_ce}` : "";
    console.log(`[${flag}] ${date}: ${acc}% (${s.correct}/${s.total})${ceStr}${nonCeStr}`);
  }

  const pre = { correct: 0, total: 0 };
  const post = { correct: 0, total: 0, ce: 0, ce_correct: 0, non_ce: 0, non_ce_correct: 0 };
  for (const [date, s] of Object.entries(byDate)) {
    if (date >= allStar) {
      post.correct += s.correct; post.total += s.total;
      post.ce += s.ce; post.ce_correct += s.ce_correct;
      post.non_ce += s.non_ce; post.non_ce_correct += s.non_ce_correct;
    } else {
      pre.correct += s.correct; pre.total += s.total;
    }
  }

  console.log(`\nPRE-BREAK: ${pre.total > 0 ? (pre.correct/pre.total*100).toFixed(1) : "n/a"}% (${pre.correct}/${pre.total})`);
  console.log(`POST-BREAK: ${post.total > 0 ? (post.correct/post.total*100).toFixed(1) : "n/a"}% (${post.correct}/${post.total})`);
  if (post.ce > 0) console.log(`  CE: ${(post.ce_correct/post.ce*100).toFixed(1)}% (${post.ce_correct}/${post.ce})`);
  if (post.non_ce > 0) console.log(`  nonCE: ${(post.non_ce_correct/post.non_ce*100).toFixed(1)}% (${post.non_ce_correct}/${post.non_ce})`);
}

main().catch(console.error);
