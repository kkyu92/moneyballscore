import { MLB_TEAMS, type MlbTeamCode } from "@moneyball/shared";

export interface MlbMatchupPair {
  /** 알파벳 오름차순으로 정렬된 두 팀 */
  codeA: MlbTeamCode;
  codeB: MlbTeamCode;
  /** canonical URL path — /mlb/matchup/[a]/[b] */
  path: string;
}

function isMlbTeamCode(v: string): v is MlbTeamCode {
  return v in MLB_TEAMS;
}

/**
 * 두 MLB 팀 코드를 받아 canonical 쌍을 반환.
 * KBO canonicalPair 와 동일 규칙 (같은 팀/유효하지 않은 코드는 null, 알파벳 오름차순 정렬) —
 * plan #24 risk 최소화 위해 KBO_TEAMS 를 인자로 받는 일반화 대신 병렬 구현으로 시작 (후속 review-code dedup 대상).
 */
export function mlbCanonicalPair(
  a: string,
  b: string,
): MlbMatchupPair | null {
  if (!isMlbTeamCode(a) || !isMlbTeamCode(b)) return null;
  if (a === b) return null;
  const [codeA, codeB] = a < b ? [a, b] : [b, a];
  return {
    codeA,
    codeB,
    path: `/mlb/matchup/${codeA}/${codeB}`,
  };
}

/**
 * 특정 팀의 상대 29팀에 대한 canonical 매치업 쌍 목록.
 */
export function mlbPairsForTeam(team: MlbTeamCode): MlbMatchupPair[] {
  const pairs: MlbMatchupPair[] = [];
  for (const code of Object.keys(MLB_TEAMS) as MlbTeamCode[]) {
    if (code === team) continue;
    const p = mlbCanonicalPair(team, code);
    if (p) pairs.push(p);
  }
  return pairs;
}

/**
 * N × (N-1) / 2 = N choose 2 canonical 쌍 전체 (N = 30, MLB 팀 수 → 435 pairs).
 */
export function mlbAllPairs(): MlbMatchupPair[] {
  const codes = Object.keys(MLB_TEAMS) as MlbTeamCode[];
  const pairs: MlbMatchupPair[] = [];
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const p = mlbCanonicalPair(codes[i], codes[j]);
      if (p) pairs.push(p);
    }
  }
  return pairs;
}
