import { createClient } from "@/lib/supabase/server";
import { assertSelectOk, KBO_TEAMS, type TeamCode } from "@moneyball/shared";
import { CURRENT_DEBATE_VERSION } from "@/config/model";

export interface EloDataPoint {
  date: string;
  [teamCode: string]: number | string;
}

export interface EloTrendData {
  points: EloDataPoint[];
  teams: TeamCode[];
}

interface EloGameRow {
  game_date: string;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
    home_elo: number | null;
    away_elo: number | null;
    debate_version: string | null;
  }>;
}

const TEAM_CODES = Object.keys(KBO_TEAMS) as TeamCode[];
const SEASON_START = "2026-01-01";

export async function buildEloTrend(): Promise<EloTrendData> {
  const supabase = await createClient();

  const result = await supabase
    .from("games")
    .select(`
      game_date,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(home_elo, away_elo, debate_version)
    `)
    .gte("game_date", SEASON_START)
    .eq("predictions.prediction_type", "pre_game")
    .eq("predictions.debate_version", CURRENT_DEBATE_VERSION)
    .not("predictions.home_elo", "is", null)
    .order("game_date", { ascending: true })
    .limit(600);

  const { data } = assertSelectOk(result, "standings.buildEloTrend");
  if (!data || data.length === 0) return { points: [], teams: [] };

  // 날짜별 팀 Elo 집계 (같은 날 여러 경기 대비 최신 값 덮어쓰기)
  const rawByDate = new Map<string, Map<string, number>>();
  const observedTeams = new Set<string>();

  for (const game of data as unknown as EloGameRow[]) {
    const pred = game.predictions?.[0];
    if (!pred) continue;
    const homeCode = game.home_team?.code;
    const awayCode = game.away_team?.code;
    const date = game.game_date;

    if (!rawByDate.has(date)) rawByDate.set(date, new Map());
    const dateMap = rawByDate.get(date)!;

    if (homeCode && pred.home_elo != null) {
      dateMap.set(homeCode, pred.home_elo);
      observedTeams.add(homeCode);
    }
    if (awayCode && pred.away_elo != null) {
      dateMap.set(awayCode, pred.away_elo);
      observedTeams.add(awayCode);
    }
  }

  if (rawByDate.size === 0) return { points: [], teams: [] };

  const teams = TEAM_CODES.filter((c) => observedTeams.has(c));
  const sortedDates = Array.from(rawByDate.keys()).sort();

  // Elo 연속 추이: 경기 없는 날에는 이전 값 유지 (forward-fill)
  const lastElo = new Map<string, number>();
  const points: EloDataPoint[] = [];

  for (const date of sortedDates) {
    const dateMap = rawByDate.get(date)!;
    // 오늘 경기에서 갱신
    for (const [code, elo] of dateMap) {
      lastElo.set(code, elo);
    }
    // 데이터 포인트 생성 (경기 있는 날만)
    const pt: EloDataPoint = { date };
    for (const team of teams) {
      const elo = lastElo.get(team);
      if (elo != null) pt[team] = elo;
    }
    points.push(pt);
  }

  // 데이터 포인트가 너무 많으면 간격 축소 (최대 60개 — 2개월치)
  const sampled =
    points.length > 60
      ? points.filter((_, i) => i % Math.ceil(points.length / 60) === 0 || i === points.length - 1)
      : points;

  return { points: sampled, teams };
}
