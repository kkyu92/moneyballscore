import { classifyWinnerProb } from '@moneyball/shared';
import type { MonthRange } from "./computeMonthRange";
import { getPreviousMonth } from "./computeMonthRange";
import {
  buildFactorInsights,
  buildTeamStats,
  fetchPredictionRowsInRange,
  mapRowsToHighlightCandidates,
  type PredictionRow,
  type WeeklyFactorInsight,
  type WeeklyHighlight,
  type WeeklyTeamStat,
} from "./shared";

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

function pickHighlights(rows: PredictionRow[], limit = 6): WeeklyHighlight[] {
  const mapped = mapRowsToHighlightCandidates(rows);
  if (mapped.length === 0) return [];

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
    text += " 모델의 견조한 퍼포먼스가 유지됐습니다.";
  } else if (accuracyRate <= 0.45) {
    text += " 변수 많은 달이었으며, 팩터 편향 분석 결과는 다음 튜닝 근거로 축적됩니다.";
  }

  return text;
}

export async function buildMonthlyReview(
  month: MonthRange,
): Promise<MonthlyReview> {
  const rows = await fetchPredictionRowsInRange(
    month.startDate,
    month.endDate,
    `buildMonthlyReview range ${month.startDate}~${month.endDate}`,
  );

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
    const prevRows = await fetchPredictionRowsInRange(
      prev.startDate,
      prev.endDate,
      `buildMonthlyReview range ${prev.startDate}~${prev.endDate}`,
    );
    const prevVerified = prevRows.filter((r) => r.is_correct !== null);
    if (prevVerified.length >= 5) {
      const prevCorrect = prevVerified.filter(
        (r) => r.is_correct === true,
      ).length;
      previousAccuracyRate = prevCorrect / prevVerified.length;
    }
  }

  const highlights = pickHighlights(rows);
  const teamStats = buildTeamStats(rows, { sortBy: "accuracy" });
  const factorInsights = buildFactorInsights(rows, { minSamples: 5 });
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
