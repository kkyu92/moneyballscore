import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function main() {
  // Check team_season_stats (if exists) or team_stats for WAR values
  // Based on migration 003, it's team_season_stats.total_war
  const { data, error } = await supabase
    .from("team_season_stats")
    .select("team_id, season, total_war, last_synced")
    .eq("season", 2026)
    .order("team_id");
  
  if (error) { console.error("team_season_stats error:", error.message); }
  else {
    console.log(`team_season_stats (2026): ${data?.length} teams`);
    const zeroWar = (data || []).filter(t => !t.total_war || t.total_war === 0);
    for (const t of data || []) {
      const flag = (!t.total_war || t.total_war === 0) ? "⚠️ WAR=0" : "✓";
      console.log(`  team=${t.team_id} war=${t.total_war?.toFixed(2) || "null"} synced=${t.last_synced?.slice(0,10)} ${flag}`);
    }
    console.log(`\nTeams with WAR=0 or null: ${zeroWar.length}`);
  }
  
  // Check recent game predictions for war fields
  const { data: recentPreds } = await supabase
    .from("predictions")
    .select("id, home_war_total, away_war_total, games!inner(game_date, home_team_id, away_team_id)")
    .gte("games.game_date", "2026-07-16")
    .lte("games.game_date", "2026-07-19")
    .in("scoring_rule", ["v1.8", "v1.8-credit-fail"])
    .not("is_correct", "is", null)
    .limit(20);
  
  console.log("\nPost-break WAR values in predictions:");
  for (const p of recentPreds || []) {
    const g = p.games as any;
    console.log(`  ${g.game_date} home=${g.home_team_id} away=${g.away_team_id}: homeWar=${p.home_war_total} awayWar=${p.away_war_total}`);
  }
}
main().catch(console.error);
