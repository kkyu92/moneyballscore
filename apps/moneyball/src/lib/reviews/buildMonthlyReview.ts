import { createClient } from "@/lib/supabase/server";
import { CURRENT_MODEL_FILTER } from "@/config/model";
import {
  KBO_TEAMS,
  type TeamCode,
  shortTeamName,
  classifyWinnerProb,
  winnerProbOf,
} from '@moneyball/shared';
import { analyzeFactorAccuracy } from "@/lib/dashboard/factor-accuracy";
import type { MonthRange } from "./computeMonthRange";
import { getPreviousMonth } from "./computeMonthRange";
import type {
  WeeklyHighlight,
  WeeklyTeamStat,
  WeeklyFactorInsight,
} from "./buildWeeklyReview";

export interface MonthlyReview {
  month: MonthRange;
  hasData: boolean;
  totalGames: number;
  verifiedGames: number;
  correctGames: number;
  accuracyRate: number;
  previousAccuracyRate: number | null;
  highlights: WeeklyHighlight[]; // 월간은 5-7개
  teamStats: WeeklyTeamStat[];
  factorInsights: {
    best: WeeklyFactorInsight | null;
    worst: WeeklyFactorInsight | null;
  };
  summary: string;
}

const FACTOR_LABELS: Record<string, string> = {
  sp_fip: "선발 FIP",
  sp_xfip: "선발 xFIP",
  lineup_woba: "타선 wOBA",
  bullpen_fip: "불펜 FIP",
  recent_form: "최근 10경기 폼",
  war: "WAR 누적",
  head_to_head: "상대전적",
  park_factor: "구장 보정",
  elo: "Elo 레이팅",
  sfr: "수비 SFR",
};

interface Row {
  confidence: number | null;
  is_correct: boolean | null;
  factors: Record<string, number> | null;
  reasoning: { homeWinProb?: number | null } | null;
  predicted_winner: number | null;
  predicted_winner_team: { code: string | null } | null;
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

async function fetchRowsInRange(
  startDate: string,
  endDate: string,
): Promise<Row[]> {
  const supabase = await createClient();
  const { data } = await supabase
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
    .lte("game.game_date", endDate);

  return ((data ?? []) as unknown as Row[]).filter((r) => r.game !== null);
}

function pickHighlights(rows: Row[], limit = 6): WeeklyHighlight[] {
  const verified = rows.filter(
    (r) => r.is_correct !== null && r.game && r.game.status === "final",
  );
  if (verified.length === 0) return [];

  const mapped: WeeklyHighlight[] = verified.map((r) => {
    const g = r.game!;
    const homeCode = g.home_team?.code as TeamCode;
    const awayCode = g.away_team?.code as TeamCode;
    const predictedCode = r.predicted_winner_team?.code as TeamCode | null;
    return {
      gameId: g.id,
      gameDate: g.game_date,
      homeCode,
      awayCode,
      homeName: homeCode ? (shortTeamName(homeCode)) : "홈",
      awayName: awayCode ? (shortTeamName(awayCode)) : "원정",
      homeScore: g.home_score,
      awayScore: g.away_score,
      predictedWinnerCode: predictedCode,
      winnerProb: winnerProbOf(r.reasoning?.homeWinProb),
      isCorrect: r.is_correct ?? false,
      badge: null,
    };
  });

  // 월간 하이라이트 — 주간보다 넓게: tier 별 최대 2건씩 tag.
  const picked: WeeklyHighlight[] = [];
  const used = new Set<number>();

  const tag = (h: WeeklyHighlight, badge: WeeklyHighlight["badge"]) => {
    if (!badge || used.has(h.gameId)) return;
    h.badge = badge;
    used.add(h.gameId);
    picked.push(h);
  };

  const closeHits = mapped
    .filter((h) => h.isCorrect && classifyWinnerProb(h.winnerProb) === 'tossup')
    .sort((a, b) => a.winnerProb - b.winnerProb);
  closeHits.slice(0, 2).forEach((h) => tag(h, "박빙 적중"));

  const highHits = mapped
    .filter((h) => h.isCorrect && classifyWinnerProb(h.winnerProb) === 'confident')
    .sort((a, b) => b.winnerProb - a.winnerProb);
  highHits.slice(0, 2).forEach((h) => tag(h, "고확신 적중"));

  const bigMisses = mapped
    .filter((h) => !h.isCorrect && classifyWinnerProb(h.winnerProb) !== 'tossup')
    .sort((a, b) => b.winnerProb - a.winnerProb);
  bigMisses.slice(0, 2).forEach((h) => tag(h, "대역전 실패"));

  return picked.slice(0, limit);
}

function buildTeamStats(rows: Row[]): WeeklyTeamStat[] {
  const byTeam = new Map<
    TeamCode,
    { predicted: number; correct: number }
  >();

  for (const r of rows) {
    if (r.is_correct === null || !r.predicted_winner_team?.code) continue;
    const code = r.predicted_winner_team.code as TeamCode;
    const prev = byTeam.get(code) ?? { predicted: 0, correct: 0 };
    prev.predicted += 1;
    if (r.is_correct) prev.correct += 1;
    byTeam.set(code, prev);
  }

  return Array.from(byTeam.entries())
    .map(([code, s]) => ({
      teamCode: code,
      teamName: shortTeamName(code),
      predicted: s.predicted,
      correct: s.correct,
      accuracy: s.predicted > 0 ? s.correct / s.predicted : 0,
      color: KBO_TEAMS[code]?.color ?? "#888",
    }))
    .sort((a, b) => b.accuracy - a.accuracy || b.predicted - a.predicted);
}

function buildFactorInsights(rows: Row[]): {
  best: WeeklyFactorInsight | null;
  worst: WeeklyFactorInsight | null;
} {
  const samples = rows
    .filter((r) => r.factors && r.game && r.game.status === "final")
    .filter(
      (r) =>
        r.game!.home_team_id != null && r.game!.winner_team_id != null,
    )
    .map((r) => ({
      factors: r.factors as Record<string, number>,
      actualHomeWin: (r.game!.winner_team_id === r.game!.home_team_id
        ? 1
        : 0) as 0 | 1,
    }));

  // 월간은 주간보다 샘플 많아서 min 5
  if (samples.length < 5) return { best: null, worst: null };

  const report = analyzeFactorAccuracy(samples, { minSamples: 5 });
  const eligible = report.stats.filter((s) => s.n >= 5);
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

function buildSummary(
  month: MonthRange,
  verifiedGames: number,
  correctGames: number,
  accuracyRate: number,
  previousAccuracyRate: number | null,
  topTeam: WeeklyTeamStat | null,
): string {
  if (verifiedGames === 0) {
    return `${month.label}에는 아직 검증된 예측이 없습니다. 경기가 치러지고 결과가 반영되면 집계가 시작됩니다.`;
  }

  const pctLabel = `${Math.round(accuracyRate * 100)}%`;
  let text = `${month.label} 한 달 동안 총 ${verifiedGames}경기를 검증한 결과 ${correctGames}경기 적중 (${pctLabel})했습니다.`;

  if (previousAccuracyRate != null && verifiedGames >= 10) {
    const diffPp = Math.round((accuracyRate - previousAccuracyRate) * 100);
    if (diffPp !== 0) {
      text += ` 전월 대비 ${diffPp > 0 ? "+" : ""}${diffPp}%p.`;
    }
  }

  if (topTeam && topTeam.predicted >= 5) {
    text += ` 가장 정확했던 팀은 ${topTeam.teamName} (${topTeam.correct}/${topTeam.predicted} · ${Math.round(topTeam.accuracy * 100)}%).`;
  }

  if (accuracyRate >= 0.65) {
    text += " 모델 v1.6의 견조한 퍼포먼스가 유지됐습니다.";
  } else if (accuracyRate <= 0.45) {
    text += " 변수 많은 달이었으며, 팩터 편향 분석 결과는 다음 튜닝 근거로 축적됩니다.";
  }

  return text;
}

export async function buildMonthlyReview(
  month: MonthRange,
): Promise<MonthlyReview> {
  const rows = await fetchRowsInRange(month.startDate, month.endDate);

  const totalGames = rows.length;
  const verified = rows.filter((r) => r.is_correct !== null);
  const verifiedGames = verified.length;
  const correctGames = verified.filter((r) => r.is_correct === true).length;
  const accuracyRate =
    verifiedGames > 0 ? correctGames / verifiedGames : 0;

  // 전월 비교
  let previousAccuracyRate: number | null = null;
  if (verifiedGames >= 5) {
    const prev = getPreviousMonth(month);
    const prevRows = await fetchRowsInRange(prev.startDate, prev.endDate);
    const prevVerified = prevRows.filter((r) => r.is_correct !== null);
    if (prevVerified.length >= 5) {
      const prevCorrect = prevVerified.filter(
        (r) => r.is_correct === true,
      ).length;
      previousAccuracyRate = prevCorrect / prevVerified.length;
    }
  }

  const highlights = pickHighlights(rows);
  const teamStats = buildTeamStats(rows);
  const factorInsights = buildFactorInsights(rows);
  const topTeam =
    teamStats.find((t) => t.predicted >= 5) ?? teamStats[0] ?? null;
  const summary = buildSummary(
    month,
    verifiedGames,
    correctGames,
    accuracyRate,
    previousAccuracyRate,
    topTeam,
  );

  return {
    month,
    hasData: totalGames > 0,
    totalGames,
    verifiedGames,
    correctGames,
    accuracyRate,
    previousAccuracyRate,
    highlights,
    teamStats,
    factorInsights,
    summary,
  };
}
