import { computeSeasonHeadToHeadFromGames, type MlbTeamCode } from "@moneyball/shared";
import type { MlbMatchupGame } from "./buildMlbMatchupProfile";

export interface MlbSeasonHeadToHead {
  year: string;
  aWins: number;
  bWins: number;
  played: number;
}

/**
 * 시즌(연도)별 두 팀 맞대결 승패 요약 — 최신 연도 먼저.
 * 실제 로직은 packages/shared 단일 source (computeSeasonHeadToHeadFromGames) —
 * cycle 2064 review-code heavy, buildSeasonHeadToHead(KBO) 과 독립 중복 통합
 * (plan #24 Phase 3 carry-over item 이었던 dedup 완료).
 */
export function buildMlbSeasonHeadToHead(
  games: MlbMatchupGame[],
  codeA: MlbTeamCode,
  codeB: MlbTeamCode,
): MlbSeasonHeadToHead[] {
  return computeSeasonHeadToHeadFromGames(games, codeA, codeB);
}
