import { computeSeasonHeadToHeadFromGames, type TeamCode } from "@moneyball/shared";
import type { MatchupGame } from "./buildMatchupProfile";

export interface SeasonHeadToHead {
  year: string;
  aWins: number;
  bWins: number;
  played: number;
}

/**
 * 시즌(연도)별 두 팀 맞대결 승패 요약 — 최신 연도 먼저.
 * 실제 로직은 packages/shared 단일 source (computeSeasonHeadToHeadFromGames) —
 * cycle 2064 review-code heavy, buildMlbSeasonHeadToHead 과 독립 중복 통합.
 */
export function buildSeasonHeadToHead(
  games: MatchupGame[],
  codeA: TeamCode,
  codeB: TeamCode,
): SeasonHeadToHead[] {
  return computeSeasonHeadToHeadFromGames(games, codeA, codeB);
}
