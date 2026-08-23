/**
 * MLB 최근폼(recent_form) / 상대전적(head_to_head) 순수 계산.
 *
 * KBO 쪽 engine/form.ts (calculateRecentForm/calculateHeadToHead) 와 동일 계약이지만
 * MLB 는 teams 테이블 PK(number) 대신 mlb_schedule.home_team_code/away_team_code
 * (string) 기준 — mlb_pipeline.ts 가 이 값들을 그대로 사용해 별도 정규화 불필요
 * (mlb_team_stats/mlb_team_elo 조회와 달리 mlb_schedule 자기 자신끼리 비교라 컨벤션 일관).
 */

export interface MlbFinishedGameForForm {
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
}

/**
 * 해당 팀의 최근 N 경기 승률 (0.0-1.0). 유효 경기 없으면 null.
 *
 * games 는 game_date desc 정렬 + status='final' 필터링 완료 가정 (호출부 책임).
 * home_score/away_score 둘 다 있는 경기만 카운트(스코어 결측 = 판정 불가로 제외).
 * MLB 는 무승부 없음(연장 승부 결정) — home_score===away_score 는 데이터 이상(서스펜드
 * 오분류 등)이라 판정 불가로 제외. mlb-elo.ts replayMlbGames 의 동일 guard 와 정합
 * (기존엔 이 파일만 guard 누락 — 동점 스코어 시 무조건 패로 오집계될 위험이 있었음).
 */
export function calculateMlbRecentForm(
  games: readonly MlbFinishedGameForForm[],
  teamCode: string,
  lastN = 10,
): number | null {
  const relevant = games
    .filter(
      (g) =>
        (g.home_team_code === teamCode || g.away_team_code === teamCode) &&
        g.home_score != null &&
        g.away_score != null &&
        g.home_score !== g.away_score,
    )
    .slice(0, lastN);
  if (relevant.length === 0) return null;

  const wins = relevant.filter((g) => {
    const isHome = g.home_team_code === teamCode;
    const teamScore = isHome ? g.home_score! : g.away_score!;
    const oppScore = isHome ? g.away_score! : g.home_score!;
    return teamScore > oppScore;
  }).length;

  return wins / relevant.length;
}

/**
 * 두 팀 간 시즌 head-to-head. homeTeamCode 관점 승/패
 * (실제 과거 경기에서 어느 쪽이 홈/원정이었는지 무관하게 homeTeamCode 기준 집계).
 *
 * 동점 스코어(home_score===away_score) 는 calculateMlbRecentForm 과 동일 이유로 제외
 * — MLB 무승부 없음 전제라 데이터 이상으로 간주, 무조건 losses 로 오집계 방지.
 */
export function calculateMlbHeadToHead(
  games: readonly MlbFinishedGameForForm[],
  homeTeamCode: string,
  awayTeamCode: string,
): { wins: number; losses: number } {
  let wins = 0;
  let losses = 0;

  for (const g of games) {
    if (g.home_score == null || g.away_score == null || g.home_score === g.away_score) continue;
    const involvesBoth =
      (g.home_team_code === homeTeamCode && g.away_team_code === awayTeamCode) ||
      (g.home_team_code === awayTeamCode && g.away_team_code === homeTeamCode);
    if (!involvesBoth) continue;

    const homeCodeWon =
      (g.home_team_code === homeTeamCode && g.home_score > g.away_score) ||
      (g.away_team_code === homeTeamCode && g.away_score > g.home_score);
    if (homeCodeWon) wins++;
    else losses++;
  }

  return { wins, losses };
}
