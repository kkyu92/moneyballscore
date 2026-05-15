import { classifyWinnerProb, shortTeamName, type TeamCode } from '@moneyball/shared';
import type { WeekRange } from "./computeWeekRange";
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

export type {
  WeeklyFactorInsight,
  WeeklyHighlight,
  WeeklyTeamStat,
} from "./shared";

export interface WeeklyGameResult {
  gameId: number;
  gameDate: string;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: TeamCode | null;
  confidence: number | null;
  isCorrect: boolean | null;
}

export interface WeeklyReview {
  week: WeekRange;
  hasData: boolean;
  totalGames: number;
  verifiedGames: number;
  correctGames: number;
  accuracyRate: number;
  highlights: WeeklyHighlight[];
  teamStats: WeeklyTeamStat[];
  factorInsights: {
    best: WeeklyFactorInsight | null;
    worst: WeeklyFactorInsight | null;
  };
  games: WeeklyGameResult[];
  summary: string;
}

function pickHighlights(rows: PredictionRow[]): WeeklyHighlight[] {
  const mapped = mapRowsToHighlightCandidates(rows);
  if (mapped.length === 0) return [];

  // 3단계 tier 기반 badge — 예측 승자 적중 확률 기준.
  //   박빙 적중 = tossup (winnerProb < 0.55) + 적중 → 작은 확률로 맞춘 경기
  //   고확신 적중 = confident (winnerProb >= 0.65) + 적중 → 예측대로 맞춘 경기
  //   대역전 실패 = confident OR lean (winnerProb >= 0.55) + 실패 → 빗나간 강한 예측
  const closeHit = mapped
    .filter((h) => h.isCorrect && classifyWinnerProb(h.winnerProb) === 'tossup')
    .sort((a, b) => a.winnerProb - b.winnerProb)[0];
  if (closeHit) closeHit.badge = "박빙 적중";

  const highHit = mapped
    .filter((h) => h.isCorrect && classifyWinnerProb(h.winnerProb) === 'confident')
    .sort((a, b) => b.winnerProb - a.winnerProb)[0];
  if (highHit && highHit !== closeHit) highHit.badge = "고확신 적중";

  const bigMiss = mapped
    .filter((h) => !h.isCorrect && classifyWinnerProb(h.winnerProb) !== 'tossup')
    .sort((a, b) => b.winnerProb - a.winnerProb)[0];
  if (bigMiss) bigMiss.badge = "대역전 실패";

  const picked = [closeHit, highHit, bigMiss].filter(
    (h): h is WeeklyHighlight => !!h && !!h.badge,
  );
  return picked;
}

function buildSummary(
  week: WeekRange,
  verifiedGames: number,
  correctGames: number,
  accuracyRate: number,
  topHighlight: WeeklyHighlight | null,
): string {
  if (verifiedGames === 0) {
    return `${week.label} 주간은 아직 검증된 예측이 없습니다. 경기가 치러지고 결과가 반영되면 적중률이 집계됩니다.`;
  }

  const pctLabel = `${Math.round(accuracyRate * 100)}%`;
  let text = `${week.label} 주간에는 총 ${verifiedGames}경기가 검증되어 ${correctGames}경기 적중 (${pctLabel})했습니다.`;

  if (topHighlight) {
    const winner = topHighlight.predictedWinnerCode
      ? shortTeamName(topHighlight.predictedWinnerCode)
      : "";
    const topPct = Math.round(topHighlight.winnerProb * 100);
    if (topHighlight.badge === "박빙 적중") {
      text += ` 가장 인상적인 결과는 ${topHighlight.awayName} vs ${topHighlight.homeName} — 예측 적중 확률 ${topPct}%의 박빙 경기를 맞춘 사례.`;
    } else if (topHighlight.badge === "고확신 적중") {
      text += ` ${topHighlight.gameDate} ${winner} 승리 예측이 ${topPct}% 적중 확률로 맞아떨어지며 강한 예측 구간의 신뢰도를 보여줬습니다.`;
    } else if (topHighlight.badge === "대역전 실패") {
      text += ` 다만 ${topHighlight.awayName} vs ${topHighlight.homeName}에서 ${topPct}% 적중 확률 예측이 빗나가는 이변도 있었습니다.`;
    }
  }

  if (accuracyRate >= 0.7) {
    text += " 모델의 이번 주 퍼포먼스가 강했습니다.";
  } else if (accuracyRate <= 0.4) {
    text += " 이번 주는 모델이 고전한 구간으로, 팩터 편향 분석을 통해 튜닝 근거를 축적하고 있습니다.";
  }

  return text;
}

export async function buildWeeklyReview(
  week: WeekRange,
): Promise<WeeklyReview> {
  const rows = await fetchPredictionRowsInRange(
    week.startDate,
    week.endDate,
    `buildWeeklyReview week ${week.startDate}~${week.endDate}`,
  );

  const totalGames = rows.length;
  const verified = rows.filter((r) => r.is_correct !== null);
  const verifiedGames = verified.length;
  const correctGames = verified.filter((r) => r.is_correct === true).length;
  const accuracyRate =
    verifiedGames > 0 ? correctGames / verifiedGames : 0;

  const highlights = pickHighlights(rows);
  const teamStats = buildTeamStats(rows);
  const factorInsights = buildFactorInsights(rows, { minSamples: 3 });
  const summary = buildSummary(
    week,
    verifiedGames,
    correctGames,
    accuracyRate,
    highlights[0] ?? null,
  );

  const games: WeeklyGameResult[] = rows
    .filter((r) => r.game !== null)
    .map((r) => ({
      gameId: r.game!.id,
      gameDate: r.game!.game_date,
      homeCode: r.game!.home_team?.code as TeamCode,
      awayCode: r.game!.away_team?.code as TeamCode,
      homeScore: r.game!.home_score,
      awayScore: r.game!.away_score,
      predictedWinnerCode: r.predicted_winner_team?.code as TeamCode | null,
      confidence: r.confidence,
      isCorrect: r.is_correct,
    }))
    .sort((a, b) => a.gameDate.localeCompare(b.gameDate));

  return {
    week,
    hasData: totalGames > 0,
    totalGames,
    verifiedGames,
    correctGames,
    accuracyRate,
    highlights,
    teamStats,
    factorInsights,
    games,
    summary,
  };
}
