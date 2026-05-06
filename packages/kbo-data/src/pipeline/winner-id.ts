// 동점 (homeScore === awayScore) final 경기는 winner_team_id NULL 박제.
// 기존 인라인 패턴 (`homeScore > awayScore ? home : away`) 은 동점 시 awayTeamId
// 가 winner 로 silent 박제 — KBO 정규시즌 12회 무승부 종결 규정과 mismatch.
// `getVerifyResults` / `updateAccuracy` 가 적중률 계산 시 잘못된 winner 가 끼어듦.
export function computeWinnerTeamId(
  status: string,
  homeScore: number | null | undefined,
  awayScore: number | null | undefined,
  homeTeamId: number,
  awayTeamId: number,
): number | null {
  if (status !== 'final') return null;
  if (homeScore == null || awayScore == null) return null;
  if (homeScore === awayScore) return null;
  return homeScore > awayScore ? homeTeamId : awayTeamId;
}
