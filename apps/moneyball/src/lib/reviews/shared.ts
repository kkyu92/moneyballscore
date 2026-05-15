import { createClient } from "@/lib/supabase/server";
import { CURRENT_MODEL_FILTER } from "@/config/model";
import {
  KBO_TEAMS,
  assertSelectOk,
  shortTeamName,
  winnerProbOf,
  type SelectResult,
  type TeamCode,
} from '@moneyball/shared';
import { analyzeFactorAccuracy } from "@/lib/dashboard/factor-accuracy";
import { FACTOR_LABELS_TECHNICAL as FACTOR_LABELS } from "@/lib/predictions/factorLabels";

export interface WeeklyHighlight {
  gameId: number;
  gameDate: string;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: TeamCode | null;
  // 예측 승자 적중 확률 (max(hwp, 1-hwp)). 퍼센트 표기 anchor.
  winnerProb: number;
  isCorrect: boolean;
  badge: "박빙 적중" | "고확신 적중" | "대역전 실패" | null;
}

export interface WeeklyTeamStat {
  teamCode: TeamCode;
  teamName: string;
  predicted: number;
  correct: number;
  accuracy: number;
  color: string;
}

export interface WeeklyFactorInsight {
  factor: string;
  label: string;
  correlation: number;
  directionalAccuracy: number | null;
  direction: "positive" | "negative" | "weak";
}

export interface PredictionRow {
  confidence: number | null;
  is_correct: boolean | null;
  factors: Record<string, number> | null;
  reasoning: { homeWinProb?: number | null } | null;
  predicted_winner: number | null;
  predicted_winner_team: {
    code: string | null;
  } | null;
  game: {
    id: number;
    game_date: string;
    home_score: number | null;
    away_score: number | null;
    status: string | null;
    home_team_id: number | null;
    winner_team_id: number | null;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
  } | null;
}

// cycle 173 silent drift family apps/moneyball lib sub-dir 차원 (reviews) 회귀
// 가드. error 시 fail-loud (기존엔 data=null silent fallback → 빈 review → "검증 0"
// 위장 = 정상 미검증 vs DB 오류 구분 불가 = 모델 평가 차단).
export async function fetchPredictionRowsInRange(
  startDate: string,
  endDate: string,
  queryLabel: string,
): Promise<PredictionRow[]> {
  const supabase = await createClient();
  const result = (await supabase
    .from("predictions")
    .select(
      `
        confidence, is_correct, factors, reasoning, predicted_winner,
        predicted_winner_team:teams!predictions_predicted_winner_fkey(code),
        game:games!predictions_game_id_fkey(
          id, game_date, home_score, away_score, status,
          home_team_id, winner_team_id,
          home_team:teams!games_home_team_id_fkey(code),
          away_team:teams!games_away_team_id_fkey(code)
        )
      `,
    )
    .eq("prediction_type", "pre_game")
    .match(CURRENT_MODEL_FILTER)
    .gte("game.game_date", startDate)
    .lte("game.game_date", endDate)) as unknown as SelectResult<PredictionRow[]>;

  const { data } = assertSelectOk(result, queryLabel);
  return ((data ?? []) as PredictionRow[]).filter((r) => r.game !== null);
}

export function mapRowsToHighlightCandidates(
  rows: PredictionRow[],
): WeeklyHighlight[] {
  const verified = rows.filter(
    (r) => r.is_correct !== null && r.game && r.game.status === "final",
  );
  return verified.map((r) => {
    const g = r.game!;
    const homeCode = g.home_team?.code as TeamCode;
    const awayCode = g.away_team?.code as TeamCode;
    const predictedCode = r.predicted_winner_team?.code as TeamCode | null;
    return {
      gameId: g.id,
      gameDate: g.game_date,
      homeCode,
      awayCode,
      homeName: homeCode ? shortTeamName(homeCode) : "홈",
      awayName: awayCode ? shortTeamName(awayCode) : "원정",
      homeScore: g.home_score,
      awayScore: g.away_score,
      predictedWinnerCode: predictedCode,
      winnerProb: winnerProbOf(r.reasoning?.homeWinProb),
      isCorrect: r.is_correct ?? false,
      badge: null,
    };
  });
}

export type TeamStatsSort = "predicted" | "accuracy";

export function buildTeamStats(
  rows: PredictionRow[],
  options: { sortBy?: TeamStatsSort } = {},
): WeeklyTeamStat[] {
  const { sortBy = "predicted" } = options;
  const byTeam = new Map<TeamCode, { predicted: number; correct: number }>();

  for (const r of rows) {
    if (r.is_correct === null || !r.predicted_winner_team?.code) continue;
    const code = r.predicted_winner_team.code as TeamCode;
    const prev = byTeam.get(code) ?? { predicted: 0, correct: 0 };
    prev.predicted += 1;
    if (r.is_correct) prev.correct += 1;
    byTeam.set(code, prev);
  }

  const stats: WeeklyTeamStat[] = Array.from(byTeam.entries()).map(
    ([code, s]) => ({
      teamCode: code,
      teamName: shortTeamName(code),
      predicted: s.predicted,
      correct: s.correct,
      accuracy: s.predicted > 0 ? s.correct / s.predicted : 0,
      color: KBO_TEAMS[code]?.color ?? "#888",
    }),
  );

  if (sortBy === "accuracy") {
    return stats.sort(
      (a, b) => b.accuracy - a.accuracy || b.predicted - a.predicted,
    );
  }
  return stats.sort((a, b) => b.predicted - a.predicted);
}

export function buildFactorInsights(
  rows: PredictionRow[],
  options: { minSamples: number },
): { best: WeeklyFactorInsight | null; worst: WeeklyFactorInsight | null } {
  const { minSamples } = options;
  const samples = rows
    .filter((r) => r.factors && r.game && r.game.status === "final")
    .filter(
      (r) => r.game!.home_team_id != null && r.game!.winner_team_id != null,
    )
    .map((r) => ({
      factors: r.factors as Record<string, number>,
      actualHomeWin: (r.game!.winner_team_id === r.game!.home_team_id
        ? 1
        : 0) as 0 | 1,
    }));

  if (samples.length < minSamples) return { best: null, worst: null };

  const report = analyzeFactorAccuracy(samples, { minSamples });
  const eligible = report.stats.filter((s) => s.n >= minSamples);
  if (eligible.length === 0) return { best: null, worst: null };

  const toInsight = (key: string): WeeklyFactorInsight | null => {
    const s = eligible.find((e) => e.factor === key);
    if (!s) return null;
    return {
      factor: s.factor,
      label: FACTOR_LABELS[s.factor] ?? s.factor,
      correlation: s.correlation,
      directionalAccuracy: s.directionalAccuracy,
      direction:
        s.correlation >= 0.2
          ? "positive"
          : s.correlation <= -0.1
            ? "negative"
            : "weak",
    };
  };

  const sortedByCorr = [...eligible].sort(
    (a, b) => b.correlation - a.correlation,
  );
  const best = toInsight(sortedByCorr[0].factor);
  const worst = toInsight(sortedByCorr[sortedByCorr.length - 1].factor);

  return { best, worst };
}
