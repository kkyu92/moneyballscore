import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  normalizeMlbTeamCode,
  MLB_DIVISIONS,
  MLB_TEAMS,
  MLB_WILDCARD_COUNT,
  type MlbTeamCode,
  type MlbLeagueSide,
  type MlbDivisionSide,
} from "@moneyball/shared";

// mlb/standings 전용 — 자체 datasource(별도 스크래퍼) 통합 대신 이미 수집된 mlb_schedule
// (final 경기 home_score/away_score, MLB statsapi 원본) 로 W-L/GB 를 직접 계산.
// 페이지가 "라이브 record 는 별도 datasource 통합 시" 라고 적어둔 placeholder 를
// 해소 — 근거 데이터는 이미 스크래핑되어 있고 (cycle 2212 mlb_schedule.status 재고착
// fix 로 신선도 확보) 별도 연동 없이 계산만으로 충분.

interface MlbStandingsRow {
  teamCode: MlbTeamCode;
  wins: number;
  losses: number;
  winPct: number;
  /** division 1위와의 격차. 1위 행은 null */
  gamesBehind: number | null;
}

type MlbDivisionStandings = Record<
  MlbLeagueSide,
  Record<MlbDivisionSide, MlbStandingsRow[]>
>;

interface MlbScheduleFinalRow {
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
}

export async function buildMlbDivisionStandings(): Promise<MlbDivisionStandings> {
  const supabase = await createClient();
  const result = await supabase
    .from("mlb_schedule")
    .select("home_team_code, away_team_code, home_score, away_score")
    .eq("league", "mlb")
    .eq("status", "final");
  const { data } = assertSelectOk(result, "buildMlbDivisionStandings mlb_schedule");
  const rows = (data ?? []) as MlbScheduleFinalRow[];

  const record = new Map<MlbTeamCode, { wins: number; losses: number }>();
  for (const code of Object.keys(MLB_TEAMS) as MlbTeamCode[]) {
    record.set(code, { wins: 0, losses: 0 });
  }

  for (const g of rows) {
    if (g.home_score == null || g.away_score == null || g.home_score === g.away_score) continue;
    const homeCode = normalizeMlbTeamCode(g.home_team_code);
    const awayCode = normalizeMlbTeamCode(g.away_team_code);
    if (!homeCode || !awayCode) continue;
    const homeRec = record.get(homeCode);
    const awayRec = record.get(awayCode);
    if (!homeRec || !awayRec) continue;
    if (g.home_score > g.away_score) {
      homeRec.wins += 1;
      awayRec.losses += 1;
    } else {
      homeRec.losses += 1;
      awayRec.wins += 1;
    }
  }

  const standings = {} as MlbDivisionStandings;
  for (const league of Object.keys(MLB_DIVISIONS) as MlbLeagueSide[]) {
    standings[league] = {} as Record<MlbDivisionSide, MlbStandingsRow[]>;
    for (const division of Object.keys(MLB_DIVISIONS[league]) as MlbDivisionSide[]) {
      const codes = MLB_DIVISIONS[league][division];
      const withRecord = codes.map((code) => {
        const rec = record.get(code) ?? { wins: 0, losses: 0 };
        const total = rec.wins + rec.losses;
        return {
          teamCode: code,
          wins: rec.wins,
          losses: rec.losses,
          winPct: total > 0 ? rec.wins / total : 0,
        };
      });
      withRecord.sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
      const leader = withRecord[0];
      standings[league][division] = withRecord.map((r) => ({
        ...r,
        gamesBehind:
          !leader || r.teamCode === leader.teamCode
            ? null
            : (leader.wins - r.wins + (r.losses - leader.losses)) / 2,
      }));
    }
  }
  return standings;
}

interface MlbTeamDivisionRank {
  rank: number;
  total: number;
  gamesBehind: number | null;
}

/**
 * standings 결과에서 특정 팀의 division 내 순위 추출 — /mlb/team/[code] 페이지가
 * league/division 라벨만 보여주고 실제 순위는 표시하지 않던 gap 해소
 * (cycle 2213 explore-idea heavy next_recommended carry-over).
 */
export function findMlbTeamDivisionRank(
  standings: MlbDivisionStandings,
  league: MlbLeagueSide,
  division: MlbDivisionSide,
  teamCode: MlbTeamCode,
): MlbTeamDivisionRank | null {
  const rows = standings[league][division];
  const idx = rows.findIndex((r) => r.teamCode === teamCode);
  if (idx === -1) return null;
  return { rank: idx + 1, total: rows.length, gamesBehind: rows[idx].gamesBehind };
}

export interface MlbWildcardRow extends MlbStandingsRow {
  /**
   * 리그 컷오프(MLB_WILDCARD_COUNT 번째 팀) 기준 게임차. 컷오프 팀=0, 양수=컷오프
   * 미달(추격 중, 탈락권), 음수=컷오프 확보(여유). division gamesBehind 와 별개 지표.
   */
  wcGamesBehind: number | null;
}

/**
 * 리그별 Wild Card pool — division 1위 3팀을 제외한 나머지 팀을 승률 내림차순 정렬.
 * `/mlb/wild-card` 가 "ETA 2026-08" placeholder 로 방치돼있던 실제 라이브 데이터
 * 갭 해소 (cycle 2296 explore-idea carry-over — division 매직넘버 후속으로 명시된
 * 미구현 항목). computeMagicNumber 재사용: pool[MLB_WILDCARD_COUNT-1](컷오프) vs
 * pool[MLB_WILDCARD_COUNT](첫 탈락 팀) 이 KBO standings playoffMN 과 동일 패턴.
 */
export function buildMlbWildcardStandings(
  standings: MlbDivisionStandings,
): Record<MlbLeagueSide, MlbWildcardRow[]> {
  const result = {} as Record<MlbLeagueSide, MlbWildcardRow[]>;
  for (const league of Object.keys(MLB_DIVISIONS) as MlbLeagueSide[]) {
    const pool = (Object.keys(MLB_DIVISIONS[league]) as MlbDivisionSide[])
      .flatMap((division) => standings[league][division].slice(1))
      .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
    const cutoff = pool[MLB_WILDCARD_COUNT - 1];
    result[league] = pool.map((r) => ({
      ...r,
      wcGamesBehind: !cutoff ? null : (cutoff.wins - r.wins + (r.losses - cutoff.losses)) / 2,
    }));
  }
  return result;
}
