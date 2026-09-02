import { createClient } from '@/lib/supabase/server';
import { assertSelectOk, MLB_PRODUCTION_COHORT_RULES, SMALL_SAMPLE_N, type MlbTeamCode } from '@moneyball/shared';
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
    .sort((a, b) => (b.accuracyRate ?? -1) - (a.accuracyRate ?? -1) || a.teamCode.localeCompare(b.teamCode));
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

export interface MlbTeamBiasRow {
  teamCode: MlbTeamCode;
  totalN: number;
  predictedWinN: number;
  predictedWinRate: number | null;
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null;
  actualWinPct: number | null;
  biasGap: number | null; // predictedWinRate - actualWinPct
}

/**
 * MLB 팀별 예측 편향 분석 — buildTeamBiasAnalysis(KBO) 대응. KBO 는 실시간 순위 스크랩
 * (fetchStandings)으로 actualWinPct 를 구하지만, MLB 는 mlb_schedule 자체가 이미
 * final 경기 스코어를 갖고 있어 별도 standings 스크래퍼 없이 완료 경기 승패로 직접
 * derive (deriveMlbOutcome 의 predictedHomeWin/actualHomeWin 재사용, cycle 2117 통합 로직).
 */
export async function buildMlbTeamBiasAnalysis(): Promise<MlbTeamBiasRow[]> {
  const supabase = await createClient();

  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_team_code, away_team_code, home_score, away_score')
    .eq('status', 'final');

  const { data: scheduleData } = assertSelectOk(scheduleResult, 'buildMlbTeamBiasAnalysis mlb_schedule');
  const scheduleRows = (scheduleData ?? []) as ScheduleFinalRow[];
  if (scheduleRows.length === 0) return [];

  const predResult = await supabase
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id));

  const { data: predData } = assertSelectOk(predResult, 'buildMlbTeamBiasAnalysis predictions');
  const predByExternalId = new Map<string, PredMiniRow>();
  for (const p of (predData ?? []) as PredMiniRow[]) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  const acc = new Map<
    string,
    { totalN: number; predictedWinN: number; verifiedN: number; correctN: number; actualWinN: number }
  >();
  const bump = (code: string, predictedWin: boolean, actualWin: boolean, correct: boolean) => {
    const cur = acc.get(code) ?? { totalN: 0, predictedWinN: 0, verifiedN: 0, correctN: 0, actualWinN: 0 };
    cur.totalN += 1;
    cur.verifiedN += 1;
    if (predictedWin) cur.predictedWinN += 1;
    if (actualWin) cur.actualWinN += 1;
    if (correct) cur.correctN += 1;
    acc.set(code, cur);
  };

  for (const s of scheduleRows) {
    const pred = predByExternalId.get(s.external_game_id);
    if (!pred) continue;

    const { predictedHomeWin, actualHomeWin, isCorrect } = deriveMlbOutcome({
      homeWinProb: pred.home_win_prob,
      hasFinalScore: s.home_score != null && s.away_score != null,
      homeScore: s.home_score,
      awayScore: s.away_score,
    });
    if (predictedHomeWin == null || actualHomeWin == null || isCorrect == null) continue;

    bump(s.home_team_code, predictedHomeWin, actualHomeWin, isCorrect);
    bump(s.away_team_code, !predictedHomeWin, !actualHomeWin, isCorrect);
  }

  return Array.from(acc.entries())
    .map(([code, { totalN, predictedWinN, verifiedN, correctN, actualWinN }]) => {
      const predictedWinRate = totalN > 0 ? predictedWinN / totalN : null;
      const actualWinPct = totalN > 0 ? actualWinN / totalN : null;
      const biasGap =
        predictedWinRate != null && actualWinPct != null ? predictedWinRate - actualWinPct : null;
      return {
        teamCode: code as MlbTeamCode,
        totalN,
        predictedWinN,
        predictedWinRate,
        verifiedN,
        correctN,
        accuracyRate: verifiedN > 0 ? correctN / verifiedN : null,
        actualWinPct,
        biasGap,
      };
    })
    .filter((r) => r.totalN >= SMALL_SAMPLE_N)
    .sort((a, b) => Math.abs(b.biasGap ?? 0) - Math.abs(a.biasGap ?? 0));
}
