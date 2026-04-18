import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";

export interface MatchupPair {
  /** 알파벳 오름차순으로 정렬된 두 팀 */
  codeA: TeamCode;
  codeB: TeamCode;
  /** canonical URL path — /matchup/[a]/[b] */
  path: string;
}

export class InvalidMatchupError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidMatchupError";
  }
}

function isTeamCode(v: string): v is TeamCode {
  return v in KBO_TEAMS;
}

/**
 * 두 팀 코드를 받아 canonical 쌍을 반환.
 * - 같은 팀이면 null
 * - 유효하지 않은 코드면 null
 * - 알파벳 오름차순으로 정렬 (HT vs LG → {HT, LG}, LG vs HT도 같은 canonical)
 */
export function canonicalPair(
  a: string,
  b: string,
): MatchupPair | null {
  if (!isTeamCode(a) || !isTeamCode(b)) return null;
  if (a === b) return null;
  const [codeA, codeB] = a < b ? [a, b] : [b, a];
  return {
    codeA,
    codeB,
    path: `/matchup/${codeA}/${codeB}`,
  };
}

/**
 * 특정 팀의 상대 9팀에 대한 canonical 매치업 쌍 목록.
 * 각 팀 프로필에서 "주요 매치업" 섹션에 사용.
 */
export function pairsForTeam(team: TeamCode): MatchupPair[] {
  const pairs: MatchupPair[] = [];
  for (const code of Object.keys(KBO_TEAMS) as TeamCode[]) {
    if (code === team) continue;
    const p = canonicalPair(team, code);
    if (p) pairs.push(p);
  }
  return pairs;
}

/**
 * 10팀 × 9상대 / 2 = 45개 canonical 쌍 전체.
 * 인덱스 페이지 · sitemap 생성에 사용.
 */
export function allPairs(): MatchupPair[] {
  const codes = Object.keys(KBO_TEAMS) as TeamCode[];
  const pairs: MatchupPair[] = [];
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const p = canonicalPair(codes[i], codes[j]);
      if (p) pairs.push(p);
    }
  }
  return pairs;
}
