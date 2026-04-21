import { createAdminClient } from "@/lib/supabase/admin";
import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";

export interface TeamRecord {
  code: TeamCode;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  winPct: number;
  runsScored: number;
  runsAllowed: number;
  runDiff: number;
  games: number;
}

export interface MonthStat {
  month: number;
  n: number;
  avgRuns: number;     // total runs per game (both teams)
  homeWinRate: number;
}

export interface ExtremeGame {
  id: number;
  date: string;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeScore: number;
  awayScore: number;
  stadium: string | null;
  totalRuns: number;
  margin: number;      // abs(home - away)
}

export interface SeasonSummary {
  season: number;
  totalGames: number;
  finalGames: number;
  postponedGames: number;
  decidedGames: number;
  draws: number;
  leagueAvgRuns: number;   // total runs per game
  leagueHomeWinRate: number;
  teams: TeamRecord[];
  byMonth: MonthStat[];
  topTotalRuns: ExtremeGame[];   // top 3 최다 총득점
  topMargin: ExtremeGame[];      // top 3 최대 점수차
  lowTotalRuns: ExtremeGame[];   // bottom 3 최소 총득점 (0-0 제외)
}

interface GameRow {
  id: number;
  game_date: string;
  stadium: string | null;
  status: string;
  home_team_id: number;
  away_team_id: number;
  winner_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
}

interface TeamMeta { id: number; code: TeamCode; name: string }

export async function buildSeasonSummary(year: number): Promise<SeasonSummary | null> {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return null;
  const db = createAdminClient();

  // teams id → (code, name) 매핑
  const { data: teamRows } = await db.from("teams").select("id, code, name_ko");
  if (!teamRows || teamRows.length === 0) return null;
  const teamById = new Map<number, TeamMeta>();
  for (const t of teamRows) {
    const code = t.code as string;
    if (code in KBO_TEAMS) {
      teamById.set(t.id as number, { id: t.id as number, code: code as TeamCode, name: t.name_ko as string });
    }
  }

  // 시즌 전체 games (1000 row cap 회피 페이지네이션)
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const games: GameRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data } = await db
      .from("games")
      .select("id, game_date, stadium, status, home_team_id, away_team_id, winner_team_id, home_score, away_score")
      .gte("game_date", startDate)
      .lte("game_date", endDate)
      .order("game_date", { ascending: true })
      .range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    games.push(...(data as GameRow[]));
    if (data.length < pageSize) break;
  }

  if (games.length === 0) return null;

  const finalGames = games.filter((g) => g.status === "final");
  const postponedGames = games.filter((g) => g.status === "postponed");

  // decided: home_score, away_score 모두 있고 무승부 아님 (winner != null)
  const decided = finalGames.filter(
    (g) => g.home_score != null && g.away_score != null && g.winner_team_id != null,
  );
  const draws = finalGames.filter(
    (g) => g.home_score != null && g.away_score != null && g.winner_team_id == null && g.home_score === g.away_score,
  );

  // 팀별 집계 — 무승부 포함 (승·패·무)
  interface TeamAcc { w: number; l: number; d: number; rs: number; ra: number; g: number }
  const acc = new Map<TeamCode, TeamAcc>();
  for (const m of teamById.values()) {
    acc.set(m.code, { w: 0, l: 0, d: 0, rs: 0, ra: 0, g: 0 });
  }
  for (const game of finalGames) {
    const hm = teamById.get(game.home_team_id);
    const am = teamById.get(game.away_team_id);
    if (!hm || !am) continue;
    if (game.home_score == null || game.away_score == null) continue;
    const h = acc.get(hm.code)!;
    const a = acc.get(am.code)!;
    h.rs += game.home_score; h.ra += game.away_score; h.g++;
    a.rs += game.away_score; a.ra += game.home_score; a.g++;
    if (game.winner_team_id === hm.id) { h.w++; a.l++; }
    else if (game.winner_team_id === am.id) { a.w++; h.l++; }
    else { h.d++; a.d++; } // 무승부
  }

  const teams: TeamRecord[] = [];
  for (const m of teamById.values()) {
    const a = acc.get(m.code)!;
    const decidedN = a.w + a.l;
    teams.push({
      code: m.code,
      name: m.name,
      wins: a.w,
      losses: a.l,
      draws: a.d,
      winPct: decidedN > 0 ? a.w / decidedN : 0,
      runsScored: a.rs,
      runsAllowed: a.ra,
      runDiff: a.rs - a.ra,
      games: a.g,
    });
  }
  teams.sort((x, y) => y.winPct - x.winPct || y.runDiff - x.runDiff);

  // 월별 통계
  const monthMap = new Map<number, { n: number; totalRuns: number; homeWins: number; decided: number }>();
  for (const g of finalGames) {
    if (g.home_score == null || g.away_score == null) continue;
    const m = parseInt(g.game_date.slice(5, 7), 10);
    if (!m) continue;
    const mm = monthMap.get(m) ?? { n: 0, totalRuns: 0, homeWins: 0, decided: 0 };
    mm.n++;
    mm.totalRuns += g.home_score + g.away_score;
    if (g.winner_team_id != null) {
      mm.decided++;
      if (g.winner_team_id === g.home_team_id) mm.homeWins++;
    }
    monthMap.set(m, mm);
  }
  const byMonth: MonthStat[] = Array.from(monthMap.entries())
    .map(([month, v]) => ({
      month,
      n: v.n,
      avgRuns: v.n > 0 ? v.totalRuns / v.n : 0,
      homeWinRate: v.decided > 0 ? v.homeWins / v.decided : 0,
    }))
    .sort((a, b) => a.month - b.month);

  // 극값 계산
  const toExtreme = (g: GameRow): ExtremeGame | null => {
    if (g.home_score == null || g.away_score == null) return null;
    const hm = teamById.get(g.home_team_id);
    const am = teamById.get(g.away_team_id);
    if (!hm || !am) return null;
    return {
      id: g.id,
      date: g.game_date,
      homeCode: hm.code,
      awayCode: am.code,
      homeScore: g.home_score,
      awayScore: g.away_score,
      stadium: g.stadium,
      totalRuns: g.home_score + g.away_score,
      margin: Math.abs(g.home_score - g.away_score),
    };
  };
  const extremes = finalGames.map(toExtreme).filter((e): e is ExtremeGame => e != null);
  const topTotalRuns = [...extremes].sort((a, b) => b.totalRuns - a.totalRuns).slice(0, 3);
  const topMargin = [...extremes].sort((a, b) => b.margin - a.margin).slice(0, 3);
  const lowTotalRuns = [...extremes]
    .filter((e) => e.totalRuns >= 1) // 0-0 배제 (완봉 승부 중계 드묾)
    .sort((a, b) => a.totalRuns - b.totalRuns)
    .slice(0, 3);

  // 리그 지표
  const totalRuns = extremes.reduce((s, e) => s + e.totalRuns, 0);
  const homeWinsLeague = decided.filter((g) => g.winner_team_id === g.home_team_id).length;

  return {
    season: year,
    totalGames: games.length,
    finalGames: finalGames.length,
    postponedGames: postponedGames.length,
    decidedGames: decided.length,
    draws: draws.length,
    leagueAvgRuns: extremes.length > 0 ? totalRuns / extremes.length : 0,
    leagueHomeWinRate: decided.length > 0 ? homeWinsLeague / decided.length : 0,
    teams,
    byMonth,
    topTotalRuns,
    topMargin,
    lowTotalRuns,
  };
}
