import { type TeamCode } from "@moneyball/shared";
import { buildEloTrend } from "@/lib/standings/buildEloTrend";

export interface MatchupEloPoint {
  date: string;
  eloA: number | null;
  eloB: number | null;
}

interface MatchupEloTrendData {
  points: MatchupEloPoint[];
}

export async function buildMatchupEloTrend(
  codeA: TeamCode,
  codeB: TeamCode,
): Promise<MatchupEloTrendData> {
  const { points } = await buildEloTrend();
  if (points.length === 0) return { points: [] };

  const result: MatchupEloPoint[] = [];
  for (const pt of points) {
    const eloA = typeof pt[codeA] === "number" ? pt[codeA] : null;
    const eloB = typeof pt[codeB] === "number" ? pt[codeB] : null;
    if (eloA === null && eloB === null) continue;
    result.push({ date: pt.date, eloA, eloB });
  }

  return { points: result };
}
