/**
 * KBO 팀 라이벌리 정의
 *
 * Phase v4-4 신규. 빅매치 자동 선정 알고리즘에서 rivalry_bonus 가산점 계산에 사용.
 * CEO 리뷰 Q2 + Eng 리뷰 C1 결정 (2026-04-15).
 *
 * 5쌍 정의:
 *   LG-OB: 잠실 한지붕 라이벌 (같은 구장 공유)
 *   KIA-SS: 영호남 전통 라이벌 (역사적 대결 구도)
 *   OB-HH: 서울-대전 (과거 트레이드 이슈)
 *   HH-KT: 충청 라이벌 (지역 인접)
 *   NC-LT: 경남 라이벌 (지역 인접)
 *
 * 이 정의는 v4-4 빅매치 선정에만 사용. 리그 확장 시 MLB/NPB 라이벌리도
 * 같은 파일에 추가 예정.
 */

import type { TeamCode } from './index';

export const KBO_RIVALRIES: ReadonlyArray<readonly [TeamCode, TeamCode]> = [
  ['LG', 'OB'],  // 잠실 한지붕
  ['HT', 'SS'],  // 영호남 (KIA = HT)
  ['OB', 'HH'],  // 서울-대전
  ['HH', 'KT'],  // 충청
  ['NC', 'LT'],  // 경남
] as const;

/**
 * 두 팀이 라이벌 관계인지 판정 (양방향)
 *
 * isRivalry('LG', 'OB') === isRivalry('OB', 'LG') === true
 */
export function isRivalry(a: TeamCode, b: TeamCode): boolean {
  return KBO_RIVALRIES.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a)
  );
}
