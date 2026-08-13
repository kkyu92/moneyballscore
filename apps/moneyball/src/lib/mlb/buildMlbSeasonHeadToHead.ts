import type { MlbTeamCode } from "@moneyball/shared";
import type { MlbMatchupGame } from "./buildMlbMatchupProfile";

export interface MlbSeasonHeadToHead {
  year: string;
  aWins: number;
  bWins: number;
  played: number;
}

// KBO buildSeasonHeadToHead.ts 병렬 구현 (plan #24 Phase 3 — risk 최소화 위해 MLB 전용
// 복제로 시작, buildMlbMatchupProfile 이 이미 조회한 games 배열을 그대로 소비하므로 추가
// DB 쿼리 없음). 로직은 리그 무관 순수 함수라 dedup 대상(review-code heavy carry-over).
/** 시즌(연도)별 두 팀 맞대결 승패 요약 — 최신 연도 먼저. */
export function buildMlbSeasonHeadToHead(
  games: MlbMatchupGame[],
  codeA: MlbTeamCode,
  codeB: MlbTeamCode,
): MlbSeasonHeadToHead[] {
  const byYear = new Map<string, MlbSeasonHeadToHead>();
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
