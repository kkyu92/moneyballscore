/**
 * game_records 기반 경기 시점 feature 계산. 모두 순수 함수.
 *
 * 공통 규칙:
 *   - `priorRecords`: target.date **미만** 의 완료 경기만 (시즌 내 누적).
 *     호출자가 필터링 책임. look-ahead bias 없음을 보장.
 *   - teamId: DB teams.id (PK).
 *   - 반환 0 / null 처리: 데이터 부족 시 0 (절대 throw 없음). logistic
 *     입력 벡터 안정성.
 */

import { parseInnings, type NaverPitcherRecord } from '../scrapers/naver-record';

export interface GameRecordLite {
  gameId: number;
  gameDate: string; // YYYY-MM-DD
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  pitchersHome: NaverPitcherRecord[];
  pitchersAway: NaverPitcherRecord[];
}

/** YYYY-MM-DD + days → YYYY-MM-DD (음수 = 과거). */
export function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 지난 N일 불펜 (선발 제외) 투구 이닝 합.
 * 선발 = pitchers[0] 로 간주 (Naver 구조: 등판 순).
 * 큰 값일수록 피로 누적.
 */
export function bullpenInningsLastNDays(
  priorRecords: GameRecordLite[],
  teamId: number,
  targetDate: string,
  days: number,
): number {
  const cutoff = shiftDate(targetDate, -days);
  let total = 0;
  for (const r of priorRecords) {
    if (r.gameDate < cutoff || r.gameDate >= targetDate) continue;
    const isHome = r.homeTeamId === teamId;
    const isAway = r.awayTeamId === teamId;
    if (!isHome && !isAway) continue;
    const pitchers = isHome ? r.pitchersHome : r.pitchersAway;
    // 선발 제외: 첫 투수 skip
    for (let i = 1; i < pitchers.length; i++) {
      const inn = parseInnings(pitchers[i].inn);
      if (Number.isFinite(inn)) total += inn;
    }
  }
  return total;
}

/**
 * 지난 N일 불펜 투수 등판 인원 합 (중복 허용 — 동일 투수 여러 번 등판도 카운트).
 * 불펜 투수진 과로도 측정.
 */
export function bullpenAppearancesLastNDays(
  priorRecords: GameRecordLite[],
  teamId: number,
  targetDate: string,
  days: number,
): number {
  const cutoff = shiftDate(targetDate, -days);
  let total = 0;
  for (const r of priorRecords) {
    if (r.gameDate < cutoff || r.gameDate >= targetDate) continue;
    const isHome = r.homeTeamId === teamId;
    if (!isHome && r.awayTeamId !== teamId) continue;
    const pitchers = isHome ? r.pitchersHome : r.pitchersAway;
    total += Math.max(0, pitchers.length - 1);
  }
  return total;
}

/** 팀의 최근 N경기 (시즌 내) — priorRecords 최신 → 과거 정렬 가정. */
function getRecentTeamGames(
  priorRecords: GameRecordLite[],
  teamId: number,
  targetDate: string,
  n: number,
): GameRecordLite[] {
  const relevant = priorRecords
    .filter(
      (r) =>
        r.gameDate < targetDate &&
        (r.homeTeamId === teamId || r.awayTeamId === teamId),
    )
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate));
  return relevant.slice(0, n);
}

/**
 * 팀 최근 N경기 평균 득점 (자팀 점수).
 * 타자 폼 지표 — 큰 값일수록 공격 강세.
 */
export function teamRunsPerGameLastN(
  priorRecords: GameRecordLite[],
  teamId: number,
  targetDate: string,
  n: number,
): number {
  const games = getRecentTeamGames(priorRecords, teamId, targetDate, n);
  if (games.length === 0) return 0;
  let total = 0;
  for (const g of games) {
    total += g.homeTeamId === teamId ? g.homeScore : g.awayScore;
  }
  return total / games.length;
}

/**
 * 팀 최근 N경기 평균 실점 (상대 점수).
 * 투수진 컨디션 지표 — 작은 값일수록 수비 강세.
 */
export function teamRunsAllowedPerGameLastN(
  priorRecords: GameRecordLite[],
  teamId: number,
  targetDate: string,
  n: number,
): number {
  const games = getRecentTeamGames(priorRecords, teamId, targetDate, n);
  if (games.length === 0) return 0;
  let total = 0;
  for (const g of games) {
    total += g.homeTeamId === teamId ? g.awayScore : g.homeScore;
  }
  return total / games.length;
}

/**
 * 팀 최근 N경기 득실차 (run differential).
 * 종합 모멘텀 지표.
 */
export function teamRunDiffLastN(
  priorRecords: GameRecordLite[],
  teamId: number,
  targetDate: string,
  n: number,
): number {
  return (
    teamRunsPerGameLastN(priorRecords, teamId, targetDate, n) -
    teamRunsAllowedPerGameLastN(priorRecords, teamId, targetDate, n)
  );
}

/**
 * 팀 최근 N경기 총 홈런 수. 장타력 지표.
 * 불펜/타자 record 에서 HR 합계 — pitchersHome 의 상대 타자 HR 합.
 * (Naver 필드: pitcher.hr = 피홈런, 상대 타자가 친 것.)
 * 자팀 공격 HR 계산 = 상대 투수진 hr 합.
 */
export function teamHomeRunsLastN(
  priorRecords: GameRecordLite[],
  teamId: number,
  targetDate: string,
  n: number,
): number {
  const games = getRecentTeamGames(priorRecords, teamId, targetDate, n);
  let total = 0;
  for (const g of games) {
    // 상대팀 투수진 피홈런 = 자팀 공격 HR
    const oppositePitchers =
      g.homeTeamId === teamId ? g.pitchersAway : g.pitchersHome;
    for (const p of oppositePitchers) total += p.hr || 0;
  }
  return total;
}
