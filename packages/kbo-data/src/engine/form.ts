/**
 * PLAN_v5 Phase 2.5 — 우리 DB 의 games 테이블 기반 recent form / h2h 계산.
 *
 * 기존 `fetchRecentForm` (KBO 공식 TeamRankDaily 스크래핑) 은 당일 결과
 * 포함 여부를 제어할 수 없어 주말 낮+저녁 혼합편성에서 stat 누수 위험.
 *
 * 이 모듈은 pure function 으로 DB 쿼리 결과만 받아 계산. asOfDate 이전
 * 경기만 포함하는 조건은 DB 쿼리 `lt('game_date', asOfDate)` 로 해결.
 * 따라서 당일 낮경기 결과는 구조적으로 저녁 예측 stat 에 못 들어감.
 */

export interface FinishedGame {
  home_team_id: number;
  away_team_id: number;
  winner_team_id: number | null;
}

/**
 * 해당 team 의 최근 N 경기 승률 (0.0-1.0). 경기 데이터 없으면 null.
 *
 * games 배열은 이미 asOfDate 이전 final 경기로 필터링 + game_date desc 정렬
 * 되어 있다고 가정. 이 함수는 teamId 기준 필터링 + slice + 승 카운트만.
 *
 * @param games - DB 쿼리 결과 (game_date desc 정렬된 final 경기)
 * @param teamId - teams 테이블 PK
 * @param lastN - 최근 몇 경기 기준 (기본 10)
 */
export function calculateRecentForm(
  games: FinishedGame[],
  teamId: number,
  lastN = 10,
): number | null {
  const relevant = games
    .filter((g) => g.home_team_id === teamId || g.away_team_id === teamId)
    .slice(0, lastN);
  if (relevant.length === 0) return null;
  const wins = relevant.filter((g) => g.winner_team_id === teamId).length;
  return wins / relevant.length;
}

/**
 * 두 팀 간 시즌 head-to-head. homeTeamId 기준 승/패.
 *
 * games 배열은 final 경기 목록 (asOfDate 이전) 가정. 순서 무관.
 * 경기장 (home/away) 과 팀 id 매칭 방식이 중요 — 이 시즌 내 두 팀
 * 경기 전부 포함 (홈 경기·원정 경기 모두).
 */
export function calculateHeadToHead(
  games: FinishedGame[],
  homeTeamId: number,
  awayTeamId: number,
): { wins: number; losses: number } {
  const h2h = games.filter(
    (g) =>
      (g.home_team_id === homeTeamId && g.away_team_id === awayTeamId) ||
      (g.home_team_id === awayTeamId && g.away_team_id === homeTeamId),
  );
  let wins = 0;
  let losses = 0;
  for (const g of h2h) {
    if (g.winner_team_id == null) continue;
    if (g.winner_team_id === homeTeamId) wins++;
    else if (g.winner_team_id === awayTeamId) losses++;
  }
  return { wins, losses };
}
