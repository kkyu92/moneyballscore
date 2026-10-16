import { KBO_GAMES_PER_TEAM } from '@moneyball/shared';

interface MagicNumberTeam {
  wins: number;
  losses: number;
  winPct: number;
}

/**
 * 매직넘버 = leader 가 chaser 를 순위상 확정적으로 앞서기까지 필요한 (leader 승 + chaser 패) 합.
 * 공식: G - leaderWins - chaserLosses + 1 (KBO 팀당 동일 스케줄 전제, 무승부는 근사 오차로 허용).
 * leader 가 실제로 chaser 보다 순위상 앞서지 않으면(승률 동률/역전) null — 매직넘버 정의 불가.
 * 순위 비교는 승률 기준 (실제 호출부가 넘기는 standings row 는 전부 승률순 정렬 —
 * 경기수가 팀마다 다를 수 있어 승수만으로는 순위 역전을 오판 가능. cycle 3216 review-code 정정).
 * 0 이하 = 이미 확정(clinched).
 */
export function computeMagicNumber(
  leader: MagicNumberTeam,
  chaser: MagicNumberTeam,
  gamesPerTeam: number = KBO_GAMES_PER_TEAM
): number | null {
  if (leader.winPct <= chaser.winPct) return null;
  return Math.max(gamesPerTeam - leader.wins - chaser.losses + 1, 0);
}
