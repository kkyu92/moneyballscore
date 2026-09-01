import { createClient } from "@/lib/supabase/server";
import { deriveMlbOutcome } from "@/lib/mlb/deriveMlbOutcome";
import { FACTOR_LABELS, FACTOR_LABELS_EN } from "@/lib/predictions/factorLabels";
import { pearsonCorrelation } from "@/lib/stats/pearson";
import {
  MISS_REPORT_LIMIT,
  MLB_PRODUCTION_COHORT_RULES,
  MLB_TEAMS,
  assertSelectOk,
  classifyWinnerProb,
  mlbShortTeamName,
  normalizeMlbTeamCode,
  type MlbTeamCode,
  type SelectResult,
} from "@moneyball/shared";

// KBO reviews/shared.ts 대응. MLB predictions 는 정규화된 `factors` JSONB(0.5 중심) 대신
// home_*/away_* 플랫 원본 스탯 컬럼 + games FK 대신 mlb_schedule(string 팀코드) +
// predictions.external_game_id 조인 모델 — fetchMlbConvergencePickDetailedResults
// (analysis/convergenceRecord.ts) 와 동일 two-query 패턴, range 필터만 추가.
// predicted_winner/is_correct/confidence 컬럼은 MLB 행에서 전량 NULL(deriveMlbOutcome.ts
// 주석 참조)이라 home_win_prob + 경기 결과로 직접 derive.

export interface MlbWeeklyHighlight {
  externalGameId: string;
  gameDate: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  predictedHomeWin: boolean | null;
  // 예측 승자 적중 확률 (max(hwp, 1-hwp)) — deriveMlbOutcome().confidence 와 동일 0.5~1 스케일.
  winnerProb: number;
  isCorrect: boolean;
  badge: "박빙 적중" | "고확신 적중" | "대역전 실패" | null;
}

export interface MlbWeeklyTeamStat {
  teamCode: MlbTeamCode;
  teamName: string;
  predicted: number;
  correct: number;
  accuracy: number;
  color: string;
}

export interface MlbWeeklyFactorInsight {
  label: string;
  correlation: number;
  directionalAccuracy: number | null;
}

export interface MlbPredictionRow {
  external_game_id: string;
  game_date: string;
  home_score: number | null;
  away_score: number | null;
  home_team_code: MlbTeamCode;
  away_team_code: MlbTeamCode;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_war_total: number | null;
  away_war_total: number | null;
  predictedHomeWin: boolean | null;
  actualHomeWin: boolean | null;
  isCorrect: boolean | null;
  // deriveMlbOutcome().confidence — 0.5~1 스케일 (0.5=tossup).
  confidence: number | null;
}

interface MlbScheduleRangeRow {
  external_game_id: string;
  game_date: string;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team_code: string;
  away_team_code: string;
}

// buildMlbMissReport 전용 — status 는 서버측 .eq("status","final") 필터로만 쓰이고
// JS 단에서 재참조 안 됨 (MlbScheduleRangeRow 와 달리 select 에서도 제외).
// 미소비 select 필드 패턴 (kbo-live.ts/buildPicksStats.ts 등과 동일 계열, cycle 2688).
interface MlbMissScheduleRow {
  external_game_id: string;
  game_date: string;
  home_score: number | null;
  away_score: number | null;
  home_team_code: string;
  away_team_code: string;
}

interface MlbPredBreakdownRow {
  external_game_id: string | null;
  home_win_prob: number | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_war_total: number | null;
  away_war_total: number | null;
}

export async function fetchMlbPredictionRowsInRange(
  startDate: string,
  endDate: string,
  queryLabel: string,
): Promise<MlbPredictionRow[]> {
  const supabase = await createClient();

  const scheduleResult = (await supabase
    .from("mlb_schedule")
    .select(
      "external_game_id, game_date, status, home_score, away_score, home_team_code, away_team_code",
    )
    .gte("game_date", startDate)
    .lte("game_date", endDate)) as unknown as SelectResult<MlbScheduleRangeRow[]>;
  const { data: scheduleData } = assertSelectOk(scheduleResult, `${queryLabel} schedule`);
  const scheduleRows = scheduleData ?? [];
  if (scheduleRows.length === 0) return [];

  const predResult = (await supabase
    .from("predictions")
    .select(
      `
        external_game_id, home_win_prob,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
        home_war_total, away_war_total
      `,
    )
    .eq("prediction_type", "pre_game")
    .eq("league", "mlb")
    .in("scoring_rule", MLB_PRODUCTION_COHORT_RULES)
    .in(
      "external_game_id",
      scheduleRows.map((s) => s.external_game_id),
    )) as unknown as SelectResult<MlbPredBreakdownRow[]>;
  const { data: predData } = assertSelectOk(predResult, `${queryLabel} predictions`);
  const predByExternalId = new Map(
    (predData ?? []).filter((p) => p.external_game_id).map((p) => [p.external_game_id as string, p]),
  );

  const rows: MlbPredictionRow[] = [];
  for (const s of scheduleRows) {
    const pred = predByExternalId.get(s.external_game_id);
    if (!pred) continue;

    const hasFinalScore = s.status === "final" && s.home_score != null && s.away_score != null;
    const { predictedHomeWin, actualHomeWin, isCorrect, confidence } = deriveMlbOutcome({
      homeWinProb: pred.home_win_prob,
      hasFinalScore,
      homeScore: s.home_score,
      awayScore: s.away_score,
    });

    rows.push({
      external_game_id: s.external_game_id,
      game_date: s.game_date,
      home_score: s.home_score,
      away_score: s.away_score,
      home_team_code: normalizeMlbTeamCode(s.home_team_code) ?? (s.home_team_code as MlbTeamCode),
      away_team_code: normalizeMlbTeamCode(s.away_team_code) ?? (s.away_team_code as MlbTeamCode),
      home_sp_fip: pred.home_sp_fip,
      away_sp_fip: pred.away_sp_fip,
      home_sp_xfip: pred.home_sp_xfip,
      away_sp_xfip: pred.away_sp_xfip,
      home_lineup_woba: pred.home_lineup_woba,
      away_lineup_woba: pred.away_lineup_woba,
      home_bullpen_fip: pred.home_bullpen_fip,
      away_bullpen_fip: pred.away_bullpen_fip,
      home_war_total: pred.home_war_total,
      away_war_total: pred.away_war_total,
      predictedHomeWin,
      actualHomeWin,
      isCorrect,
      confidence,
    });
  }
  return rows;
}

export function mapMlbRowsToHighlightCandidates(rows: MlbPredictionRow[]): MlbWeeklyHighlight[] {
  return rows
    .filter((r) => r.isCorrect !== null)
    .map((r) => ({
      externalGameId: r.external_game_id,
      gameDate: r.game_date,
      homeCode: r.home_team_code,
      awayCode: r.away_team_code,
      homeName: mlbShortTeamName(r.home_team_code),
      awayName: mlbShortTeamName(r.away_team_code),
      homeScore: r.home_score,
      awayScore: r.away_score,
      predictedHomeWin: r.predictedHomeWin,
      winnerProb: r.confidence ?? 0.5,
      isCorrect: r.isCorrect ?? false,
      badge: null,
    }));
}

export function buildMlbTeamStats(rows: MlbPredictionRow[]): MlbWeeklyTeamStat[] {
  const byTeam = new Map<MlbTeamCode, { predicted: number; correct: number }>();

  for (const r of rows) {
    if (r.isCorrect === null || r.predictedHomeWin === null) continue;
    const code = r.predictedHomeWin ? r.home_team_code : r.away_team_code;
    const prev = byTeam.get(code) ?? { predicted: 0, correct: 0 };
    prev.predicted += 1;
    if (r.isCorrect) prev.correct += 1;
    byTeam.set(code, prev);
  }

  return Array.from(byTeam.entries())
    .map(([code, s]) => ({
      teamCode: code,
      teamName: mlbShortTeamName(code),
      predicted: s.predicted,
      correct: s.correct,
      accuracy: s.predicted > 0 ? s.correct / s.predicted : 0,
      color: MLB_TEAMS[code]?.color ?? "#888",
    }))
    .sort((a, b) => b.predicted - a.predicted);
}

// KBO analyzeFactorAccuracy(dashboard/factor-accuracy.ts) 대응. MLB 는 정규화된 0.5중심
// factors map 이 없어 home/away 원본 값 diff 를 직접 Pearson 상관계수에 태움 — lower-is-better
// (FIP류) 는 diff 부호 반전(양수=홈 우세로 정규화, buildMlbFactorAccuracy.ts 의 LOWER_IS_BETTER
// 규칙과 동일 소스).
export const MLB_FACTOR_COLUMN_PAIRS = {
  sp_fip: ["home_sp_fip", "away_sp_fip"],
  sp_xfip: ["home_sp_xfip", "away_sp_xfip"],
  lineup_woba: ["home_lineup_woba", "away_lineup_woba"],
  bullpen_fip: ["home_bullpen_fip", "away_bullpen_fip"],
  war: ["home_war_total", "away_war_total"],
} as const;

export type MlbFactorKey = keyof typeof MLB_FACTOR_COLUMN_PAIRS;

export const LOWER_IS_BETTER = new Set<MlbFactorKey>(["sp_fip", "sp_xfip", "bullpen_fip"]);

export function buildMlbFactorInsights(
  rows: MlbPredictionRow[],
  options: { minSamples: number; locale?: "ko" | "en" },
): { best: MlbWeeklyFactorInsight | null; worst: MlbWeeklyFactorInsight | null } {
  const { minSamples } = options;
  const labels = options.locale === "en" ? FACTOR_LABELS_EN : FACTOR_LABELS;
  const finished = rows.filter((r) => r.actualHomeWin !== null);

  const results: MlbWeeklyFactorInsight[] = [];
  for (const key of Object.keys(MLB_FACTOR_COLUMN_PAIRS) as MlbFactorKey[]) {
    const [homeCol, awayCol] = MLB_FACTOR_COLUMN_PAIRS[key];
    const diffs: number[] = [];
    const actuals: number[] = [];
    let dirN = 0;
    let dirCorrect = 0;

    for (const r of finished) {
      const homeVal = r[homeCol as keyof MlbPredictionRow] as number | null;
      const awayVal = r[awayCol as keyof MlbPredictionRow] as number | null;
      if (homeVal == null || awayVal == null) continue;
      const rawDiff = homeVal - awayVal;
      const diff = LOWER_IS_BETTER.has(key) ? -rawDiff : rawDiff;
      const actual = r.actualHomeWin ? 1 : 0;
      diffs.push(diff);
      actuals.push(actual);
      if (diff !== 0) {
        dirN += 1;
        const predictedHome = diff > 0;
        if (predictedHome === (actual === 1)) dirCorrect += 1;
      }
    }

    if (diffs.length < minSamples) continue;
    const correlation = pearsonCorrelation(diffs, actuals);
    results.push({
      label: labels[key] ?? key,
      correlation,
      directionalAccuracy: dirN > 0 ? dirCorrect / dirN : null,
    });
  }

  if (results.length === 0) return { best: null, worst: null };
  const sorted = [...results].sort((a, b) => b.correlation - a.correlation);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

export interface MlbMissFactorSupport {
  factor: MlbFactorKey;
  label: string;
}

export interface MlbMissReportItem {
  externalGameId: string;
  gameDate: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  predictedHomeWin: boolean;
  winnerProb: number;
  topSupportingFactors: MlbMissFactorSupport[];
}

// KBO buildMissReport.ts 대응 — MLB 는 postview 심판 에이전트가 없어(judgeReasoning/
// factorErrors 컬럼 전량 미생성, postview-daily.ts 는 KBO 전용) 사후 서술 대신 어떤
// 팩터가 (틀린) 예측 방향을 가장 강하게 뒷받침했는지 정량 계산으로 대체.
export async function buildMlbMissReport(
  options: { limit?: number; locale?: "ko" | "en" } = {},
): Promise<MlbMissReportItem[]> {
  const limit = options.limit ?? MISS_REPORT_LIMIT;
  const labels = options.locale === "en" ? FACTOR_LABELS_EN : FACTOR_LABELS;
  const supabase = await createClient();

  const scheduleResult = (await supabase
    .from("mlb_schedule")
    .select(
      "external_game_id, game_date, home_score, away_score, home_team_code, away_team_code",
    )
    .eq("status", "final")) as unknown as SelectResult<MlbMissScheduleRow[]>;
  const { data: scheduleData } = assertSelectOk(scheduleResult, "buildMlbMissReport schedule");
  const scheduleRows = scheduleData ?? [];
  if (scheduleRows.length === 0) return [];

  const predResult = (await supabase
    .from("predictions")
    .select(
      `
        external_game_id, home_win_prob,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
        home_war_total, away_war_total
      `,
    )
    .eq("prediction_type", "pre_game")
    .eq("league", "mlb")
    .in("scoring_rule", MLB_PRODUCTION_COHORT_RULES)) as unknown as SelectResult<MlbPredBreakdownRow[]>;
  const { data: predData } = assertSelectOk(predResult, "buildMlbMissReport predictions");
  const predByExternalId = new Map(
    (predData ?? []).filter((p) => p.external_game_id).map((p) => [p.external_game_id as string, p]),
  );

  const misses: { row: MlbMissScheduleRow; pred: MlbPredBreakdownRow; conf: number }[] = [];
  for (const s of scheduleRows) {
    const pred = predByExternalId.get(s.external_game_id);
    if (!pred || pred.home_win_prob == null) continue;
    if (s.home_score == null || s.away_score == null) continue;
    if (classifyWinnerProb(pred.home_win_prob) === "tossup") continue;

    const predictedHomeWin = pred.home_win_prob >= 0.5;
    const actualHomeWin = s.home_score > s.away_score;
    if (predictedHomeWin === actualHomeWin) continue; // 적중 — miss 아님

    const conf = Math.max(pred.home_win_prob, 1 - pred.home_win_prob);
    misses.push({ row: s, pred, conf });
  }

  misses.sort((a, b) => b.conf - a.conf);
  const top = misses.slice(0, limit);

  return top.map(({ row: s, pred, conf }) => {
    const predictedHomeWin = pred.home_win_prob! >= 0.5;

    // supportMagnitude 는 정렬용 내부 키 — 공개 인터페이스(MlbMissFactorSupport)엔 미노출.
    const factorSupports: (MlbMissFactorSupport & { supportMagnitude: number })[] = [];
    for (const key of Object.keys(MLB_FACTOR_COLUMN_PAIRS) as MlbFactorKey[]) {
      const [homeCol, awayCol] = MLB_FACTOR_COLUMN_PAIRS[key];
      const homeVal = pred[homeCol as keyof MlbPredBreakdownRow] as number | null;
      const awayVal = pred[awayCol as keyof MlbPredBreakdownRow] as number | null;
      if (homeVal == null || awayVal == null) continue;
      const rawDiff = homeVal - awayVal;
      // 홈 우세 방향으로 정규화 (lower-is-better 팩터는 부호 반전) 후, 예측 방향과
      // 일치하는 크기만 "뒷받침" 으로 카운트 (반대 방향이면 오히려 경고 신호이므로 제외).
      const homeAdvantage = LOWER_IS_BETTER.has(key) ? -rawDiff : rawDiff;
      const supportMagnitude = predictedHomeWin ? homeAdvantage : -homeAdvantage;
      if (supportMagnitude <= 0) continue;
      factorSupports.push({ factor: key, label: labels[key] ?? key, supportMagnitude });
    }
    factorSupports.sort((a, b) => b.supportMagnitude - a.supportMagnitude);

    return {
      externalGameId: s.external_game_id,
      gameDate: s.game_date,
      homeCode: normalizeMlbTeamCode(s.home_team_code) ?? (s.home_team_code as MlbTeamCode),
      awayCode: normalizeMlbTeamCode(s.away_team_code) ?? (s.away_team_code as MlbTeamCode),
      homeName: mlbShortTeamName(s.home_team_code),
      awayName: mlbShortTeamName(s.away_team_code),
      homeScore: s.home_score,
      awayScore: s.away_score,
      predictedHomeWin,
      winnerProb: conf,
      topSupportingFactors: factorSupports.slice(0, 3),
    };
  });
}
