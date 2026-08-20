import { createClient } from '@/lib/supabase/server';
import {
  assertSelectOk,
  normalizeMlbTeamCode,
  MLB_TEAMS,
  type MlbTeamCode,
} from '@moneyball/shared';
import {
  computeTeamRecentRecord,
  computeTeamStreak,
  type StreakGame,
  type TeamRecentRecord,
  type TeamStreak,
} from '@/lib/teams/buildTeamProfile';

// KBO buildTeamStrengthSnapshot 는 predictions.home_elo/home_recent_form (모델 팩터) 기반 —
// MLB 는 elo 가 전부 ELO_NEUTRAL placeholder(plan #25, Elo 미구현 확정)고 recent_form 컬럼은
// mlb-pipeline.ts 가 저장 자체를 안 해 전량 null(plan #28 Phase 2 조사, cycle 2316) — 모델
// 팩터 포팅이 불가능. 대신 mlb_schedule 의 실제 완료 경기 결과로 "진짜 전적" 기준 전력을
// 계산 (computeTeamRecentRecord/computeTeamStreak 는 KBO/MLB StreakGame 구조 호환 재사용,
// buildTeamProfile.ts:194 주석 정합 — 신규 MLB_ 접두 중복 함수 X).

export interface MlbTeamStrengthRow {
  teamCode: MlbTeamCode;
  teamName: string;
  recentRecord: TeamRecentRecord;
  streak: TeamStreak | null;
}

interface MlbScheduleFinalRow {
  game_date: string;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
}

export async function buildMlbTeamStrengthSnapshot(): Promise<MlbTeamStrengthRow[]> {
  const supabase = await createClient();

  // 전체 팀 단일 쿼리 — buildMlbDivisionStandings 와 동일 패턴(팀별 N+1 회피).
  const result = await supabase
    .from('mlb_schedule')
    .select('game_date, home_team_code, away_team_code, home_score, away_score')
    .eq('league', 'mlb')
    .eq('status', 'final')
    .order('game_date', { ascending: false });

  const { data } = assertSelectOk(result, 'buildMlbTeamStrengthSnapshot mlb_schedule');
  const rows = (data ?? []) as MlbScheduleFinalRow[];
  if (rows.length === 0) return [];

  // mlb_schedule 은 StatsAPI 컨벤션 코드 저장(buildMlbTeamProfile.ts:223 정합) — canonical 로 정규화.
  const gamesByTeam = new Map<MlbTeamCode, StreakGame[]>();
  for (const g of rows) {
    if (g.home_score == null || g.away_score == null || g.home_score === g.away_score) continue;
    const homeCode = normalizeMlbTeamCode(g.home_team_code);
    const awayCode = normalizeMlbTeamCode(g.away_team_code);

    // 쿼리가 game_date desc 로 이미 정렬돼있어 팀별 필터 순서도 desc 유지
    // (computeTeamRecentRecord/computeTeamStreak 계약 — 내림차순 전달 필수).
    if (homeCode) {
      const list = gamesByTeam.get(homeCode) ?? [];
      list.push({ status: 'final', ourScore: g.home_score, opponentScore: g.away_score });
      gamesByTeam.set(homeCode, list);
    }
    if (awayCode) {
      const list = gamesByTeam.get(awayCode) ?? [];
      list.push({ status: 'final', ourScore: g.away_score, opponentScore: g.home_score });
      gamesByTeam.set(awayCode, list);
    }
  }

  const teamStrengthRows: MlbTeamStrengthRow[] = [];
  for (const [teamCode, games] of gamesByTeam) {
    const recentRecord = computeTeamRecentRecord(games);
    if (!recentRecord) continue; // RECENT_RECORD_MIN_GAMES 미달 — 시즌 초반 결측 가능
    teamStrengthRows.push({
      teamCode,
      teamName: MLB_TEAMS[teamCode].shortName,
      recentRecord,
      streak: computeTeamStreak(games),
    });
  }

  teamStrengthRows.sort((a, b) => {
    const aPct = a.recentRecord.wins / a.recentRecord.sampleSize;
    const bPct = b.recentRecord.wins / b.recentRecord.sampleSize;
    if (bPct !== aPct) return bPct - aPct;
    return b.recentRecord.wins - a.recentRecord.wins;
  });

  return teamStrengthRows;
}
