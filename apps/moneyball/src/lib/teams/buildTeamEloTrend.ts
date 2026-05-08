import { type TeamCode } from "@moneyball/shared";
import { buildEloTrend } from "@/lib/standings/buildEloTrend";

export interface TeamEloPoint {
  date: string;
  elo: number;
  avg: number;
}

export interface TeamEloTrendData {
  points: TeamEloPoint[];
}

export async function buildTeamEloTrend(
  code: TeamCode,
): Promise<TeamEloTrendData> {
  const { points, teams } = await buildEloTrend();
  if (points.length === 0) return { points: [] };

  const result: TeamEloPoint[] = [];
  for (const pt of points) {
    const elo = pt[code];
    if (typeof elo !== "number") continue;

    const values = teams
      .map((t) => pt[t])
      .filter((v): v is number => typeof v === "number");
    const avg =
      values.length > 0
        ? values.reduce((s, v) => s + v, 0) / values.length
        : elo;

    result.push({ date: pt.date, elo, avg });
  }

  return { points: result };
}
