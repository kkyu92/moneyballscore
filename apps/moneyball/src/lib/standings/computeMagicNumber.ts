import { KBO_GAMES_PER_TEAM } from '@moneyball/shared';

export interface MagicNumberTeam {
  wins: number;
  losses: number;
}

/**
 * 매직넘버 = leader 가 chaser 를 순위상 확정적으로 앞서기까지 필요한 (leader 승 + chaser 패) 합.
 * 공식: G - leaderWins - chaserLosses + 1 (KBO 팀당 동일 스케줄 전제, 무승부는 근사 오차로 허용).
 * leader 가 실제로 chaser 보다 승수 앞서지 않으면(동률/역전) null — 매직넘버 정의 불가.
 * 0 이하 = 이미 확정(clinched).
 */
export function computeMagicNumber(
  leader: MagicNumberTeam,
  chaser: MagicNumberTeam,
  gamesPerTeam: number = KBO_GAMES_PER_TEAM
): number | null {
  if (leader.wins <= chaser.wins) return null;
  return Math.max(gamesPerTeam - leader.wins - chaser.losses + 1, 0);
}
