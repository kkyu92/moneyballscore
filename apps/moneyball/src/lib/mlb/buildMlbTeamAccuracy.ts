import { createClient } from '@/lib/supabase/server';
import { assertSelectOk, MLB_PRODUCTION_COHORT_RULES, type MlbTeamCode } from '@moneyball/shared';
import { deriveMlbOutcome } from './deriveMlbOutcome';

export interface MlbTeamAccuracyRow {
  teamCode: MlbTeamCode;
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null;
}

interface ScheduleFinalRow {
  external_game_id: string;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
}

interface PredMiniRow {
  external_game_id: string | null;
  home_win_prob: number | null;
}

/**
 * MLB 팀별 예측 적중률 — buildAllTeamAccuracy(KBO) 대응. KBO 는 games/teams FK join 으로
 * 팀 코드를 얻지만 MLB 는 mlb_schedule 에 home_team_code/away_team_code 가 string 컬럼으로
 * 직접 있어 join 불필요 (deriveMlbOutcome.ts 주석 참조 — is_correct 는 전량 NULL이라 여기서
 * home_win_prob + 실제 스코어로 직접 derive).
 */
export async function buildAllMlbTeamAccuracy(): Promise<MlbTeamAccuracyRow[]> {
  const supabase = await createClient();

  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_team_code, away_team_code, home_score, away_score')
    .eq('status', 'final');

  const { data: scheduleData } = assertSelectOk(scheduleResult, 'buildAllMlbTeamAccuracy mlb_schedule');
  const scheduleRows = (scheduleData ?? []) as ScheduleFinalRow[];
  if (scheduleRows.length === 0) return [];

  const predResult = await supabase
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id));

  const { data: predData } = assertSelectOk(predResult, 'buildAllMlbTeamAccuracy predictions');
  const predByExternalId = new Map<string, PredMiniRow>();
  for (const p of (predData ?? []) as PredMiniRow[]) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  const acc = new Map<string, { verifiedN: number; correctN: number }>();
  const bump = (code: string, correct: boolean) => {
    const cur = acc.get(code) ?? { verifiedN: 0, correctN: 0 };
    cur.verifiedN += 1;
    if (correct) cur.correctN += 1;
    acc.set(code, cur);
  };

  for (const s of scheduleRows) {
    const pred = predByExternalId.get(s.external_game_id);
    if (!pred) continue;

    const { isCorrect } = deriveMlbOutcome({
      homeWinProb: pred.home_win_prob,
      hasFinalScore: s.home_score != null && s.away_score != null,
      homeScore: s.home_score,
      awayScore: s.away_score,
    });
    if (isCorrect == null) continue;

    bump(s.home_team_code, isCorrect);
    bump(s.away_team_code, isCorrect);
  }

  return Array.from(acc.entries())
    .map(([teamCode, v]) => ({
      teamCode: teamCode as MlbTeamCode,
      verifiedN: v.verifiedN,
      correctN: v.correctN,
      accuracyRate: v.verifiedN > 0 ? v.correctN / v.verifiedN : null,
    }))
    .sort((a, b) => b.verifiedN - a.verifiedN || a.teamCode.localeCompare(b.teamCode));
}

export interface MlbMatchupRow {
  teamCode: MlbTeamCode;
  opponentCode: MlbTeamCode;
  n: number;
  correct: number;
  accuracyRate: number | null;
}

export interface MlbTeamHomeAwayRow {
  teamCode: MlbTeamCode;
  homeN: number;
  homeCorrect: number;
  homeAccuracy: number | null;
  awayN: number;
  awayCorrect: number;
  awayAccuracy: number | null;
}

/**
 * MLB 상대전적/홈원정 분석 — buildMatchupData(KBO) 대응 (TeamMatchupCards 공유 렌더).
 */
export async function buildMlbMatchupData(): Promise<{
  matchups: MlbMatchupRow[];
  homeAway: MlbTeamHomeAwayRow[];
}> {
  const supabase = await createClient();

  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_team_code, away_team_code, home_score, away_score')
    .eq('status', 'final');

  const { data: scheduleData } = assertSelectOk(scheduleResult, 'buildMlbMatchupData mlb_schedule');
  const scheduleRows = (scheduleData ?? []) as ScheduleFinalRow[];
  if (scheduleRows.length === 0) return { matchups: [], homeAway: [] };

  const predResult = await supabase
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id));

  const { data: predData } = assertSelectOk(predResult, 'buildMlbMatchupData predictions');
  const predByExternalId = new Map<string, PredMiniRow>();
  for (const p of (predData ?? []) as PredMiniRow[]) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  const matchupMap = new Map<string, Map<string, { n: number; correct: number }>>();
  const haMap = new Map<string, { homeN: number; homeCorrect: number; awayN: number; awayCorrect: number }>();

  for (const s of scheduleRows) {
    const pred = predByExternalId.get(s.external_game_id);
    if (!pred) continue;

    const { isCorrect } = deriveMlbOutcome({
      homeWinProb: pred.home_win_prob,
      hasFinalScore: s.home_score != null && s.away_score != null,
      homeScore: s.home_score,
      awayScore: s.away_score,
    });
    if (isCorrect == null) continue;

    const homeCode = s.home_team_code;
    const awayCode = s.away_team_code;

    for (const [code, isHome] of [[homeCode, true], [awayCode, false]] as [string, boolean][]) {
      if (!haMap.has(code)) haMap.set(code, { homeN: 0, homeCorrect: 0, awayN: 0, awayCorrect: 0 });
      const ha = haMap.get(code)!;
      if (isHome) { ha.homeN++; if (isCorrect) ha.homeCorrect++; }
      else { ha.awayN++; if (isCorrect) ha.awayCorrect++; }
    }

    for (const [team, opp] of [[homeCode, awayCode], [awayCode, homeCode]] as [string, string][]) {
      if (!matchupMap.has(team)) matchupMap.set(team, new Map());
      const oppMap = matchupMap.get(team)!;
      if (!oppMap.has(opp)) oppMap.set(opp, { n: 0, correct: 0 });
      const entry = oppMap.get(opp)!;
      entry.n++;
      if (isCorrect) entry.correct++;
    }
  }

  const matchups: MlbMatchupRow[] = [];
  for (const [team, oppMap] of matchupMap.entries()) {
    for (const [opp, { n, correct }] of oppMap.entries()) {
      matchups.push({
        teamCode: team as MlbTeamCode,
        opponentCode: opp as MlbTeamCode,
        n,
        correct,
        accuracyRate: n > 0 ? correct / n : null,
      });
    }
  }

  const homeAway: MlbTeamHomeAwayRow[] = Array.from(haMap.entries()).map(
    ([code, { homeN, homeCorrect, awayN, awayCorrect }]) => ({
      teamCode: code as MlbTeamCode,
      homeN,
      homeCorrect,
      homeAccuracy: homeN > 0 ? homeCorrect / homeN : null,
      awayN,
      awayCorrect,
      awayAccuracy: awayN > 0 ? awayCorrect / awayN : null,
    }),
  );

  return { matchups, homeAway };
}
