import type { TeamCode } from "@moneyball/shared";
import type { MatchupGame } from "./buildMatchupProfile";

export interface SeasonHeadToHead {
  year: string;
  aWins: number;
  bWins: number;
  played: number;
}

/** 시즌(연도)별 두 팀 맞대결 승패 요약 — 최신 연도 먼저. */
export function buildSeasonHeadToHead(
  games: MatchupGame[],
  codeA: TeamCode,
  codeB: TeamCode,
): SeasonHeadToHead[] {
  const byYear = new Map<string, SeasonHeadToHead>();
  for (const g of games) {
    if (g.status !== "final" || !g.actualWinnerCode) continue;
    const year = g.gameDate.slice(0, 4);
    const bucket = byYear.get(year) ?? { year, aWins: 0, bWins: 0, played: 0 };
    bucket.played += 1;
    if (g.actualWinnerCode === codeA) bucket.aWins += 1;
    else if (g.actualWinnerCode === codeB) bucket.bWins += 1;
    byYear.set(year, bucket);
  }
  return [...byYear.values()].sort((a, b) => b.year.localeCompare(a.year));
}
