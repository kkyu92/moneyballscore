import { ACCURACY_STRONG_RATE, ACCURACY_WEAK_RATE, classifyWinnerProb, mlbShortTeamName, type MlbTeamCode } from '@moneyball/shared';
import type { WeekRange } from "./computeWeekRange";
import {
  buildMlbFactorInsights,
  buildMlbTeamStats,
  fetchMlbPredictionRowsInRange,
  mapMlbRowsToHighlightCandidates,
  type MlbPredictionRow,
  type MlbWeeklyFactorInsight,
  type MlbWeeklyHighlight,
  type MlbWeeklyTeamStat,
} from "./mlb-shared";

export type {
  MlbWeeklyFactorInsight,
  MlbWeeklyHighlight,
  MlbWeeklyTeamStat,
} from "./mlb-shared";

export interface MlbWeeklyGameResult {
  externalGameId: string;
  gameDate: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedHomeWin: boolean | null;
  confidence: number | null;
  isCorrect: boolean | null;
}

export interface MlbWeeklyReview {
  week: WeekRange;
  hasData: boolean;
  totalGames: number;
  verifiedGames: number;
  correctGames: number;
  accuracyRate: number;
  highlights: MlbWeeklyHighlight[];
  teamStats: MlbWeeklyTeamStat[];
  factorInsights: {
    best: MlbWeeklyFactorInsight | null;
    worst: MlbWeeklyFactorInsight | null;
  };
  games: MlbWeeklyGameResult[];
  summary: string;
}

// buildWeeklyReview.ts(KBO) 의 pickHighlights/buildSummary 와 동일 구조 —
// classifyWinnerProb 는 리그 무관(0.5~1 스케일 threshold 만).
function pickHighlights(rows: MlbPredictionRow[]): MlbWeeklyHighlight[] {
  const mapped = mapMlbRowsToHighlightCandidates(rows);
  if (mapped.length === 0) return [];

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

  return [closeHit, highHit, bigMiss].filter(
    (h): h is MlbWeeklyHighlight => !!h && !!h.badge,
  );
}

function buildSummary(
  week: WeekRange,
  verifiedGames: number,
  correctGames: number,
  accuracyRate: number,
  topHighlight: MlbWeeklyHighlight | null,
  locale: "ko" | "en" = "ko",
): string {
  const isEn = locale === "en";

  if (verifiedGames === 0) {
    return isEn
      ? `No MLB predictions have been verified yet for the week of ${week.label}. Accuracy will be tallied once games are played and results come in.`
      : `${week.label} 주간은 아직 검증된 MLB 예측이 없습니다. 경기가 치러지고 결과가 반영되면 적중률이 집계됩니다.`;
  }

  const pctLabel = `${Math.round(accuracyRate * 100)}%`;
  let text = isEn
    ? `A total of ${verifiedGames} games were verified during the week of ${week.label}, with ${correctGames} correct predictions (${pctLabel}).`
    : `${week.label} 주간에는 총 ${verifiedGames}경기가 검증되어 ${correctGames}경기 적중 (${pctLabel})했습니다.`;

  if (topHighlight) {
    const winner = topHighlight.predictedHomeWin === null
      ? ""
      : mlbShortTeamName(topHighlight.predictedHomeWin ? topHighlight.homeCode : topHighlight.awayCode);
    const topPct = Math.round(topHighlight.winnerProb * 100);
    if (topHighlight.badge === "박빙 적중") {
      text += isEn
        ? ` The most impressive result was ${topHighlight.awayName} vs ${topHighlight.homeName} — a nail-biter the model called correctly at just ${topPct}% win probability.`
        : ` 가장 인상적인 결과는 ${topHighlight.awayName} vs ${topHighlight.homeName} — 예측 적중 확률 ${topPct}%의 박빙 경기를 맞춘 사례.`;
    } else if (topHighlight.badge === "고확신 적중") {
      text += isEn
        ? ` On ${topHighlight.gameDate}, a ${winner} win prediction hit at ${topPct}% confidence, reinforcing trust in the model's high-confidence range.`
        : ` ${topHighlight.gameDate} ${winner} 승리 예측이 ${topPct}% 적중 확률로 맞아떨어지며 강한 예측 구간의 신뢰도를 보여줬습니다.`;
    } else if (topHighlight.badge === "대역전 실패") {
      text += isEn
        ? ` However, there was an upset too — a ${topPct}% confidence pick on ${topHighlight.awayName} vs ${topHighlight.homeName} missed.`
        : ` 다만 ${topHighlight.awayName} vs ${topHighlight.homeName}에서 ${topPct}% 적중 확률 예측이 빗나가는 이변도 있었습니다.`;
    }
  }

  if (accuracyRate >= ACCURACY_STRONG_RATE) {
    text += isEn ? " The model had a strong week." : " 모델의 이번 주 퍼포먼스가 강했습니다.";
  } else if (accuracyRate <= ACCURACY_WEAK_RATE) {
    text += isEn
      ? " This was a rough week for the model — we're using the factor bias breakdown below to build the case for future tuning."
      : " 이번 주는 모델이 고전한 구간으로, 팩터 편향 분석을 통해 튜닝 근거를 축적하고 있습니다.";
  }

  return text;
}

export async function buildMlbWeeklyReview(
  week: WeekRange,
  locale: "ko" | "en" = "ko",
): Promise<MlbWeeklyReview> {
  const rows = await fetchMlbPredictionRowsInRange(
    week.startDate,
    week.endDate,
    `buildMlbWeeklyReview week ${week.startDate}~${week.endDate}`,
  );

  const totalGames = rows.length;
  const verified = rows.filter((r) => r.isCorrect !== null);
  const verifiedGames = verified.length;
  const correctGames = verified.filter((r) => r.isCorrect === true).length;
  const accuracyRate = verifiedGames > 0 ? correctGames / verifiedGames : 0;

  const highlights = pickHighlights(rows);
  const teamStats = buildMlbTeamStats(rows);
  const factorInsights = buildMlbFactorInsights(rows, { minSamples: 3, locale });
  const summary = buildSummary(
    week,
    verifiedGames,
    correctGames,
    accuracyRate,
    highlights[0] ?? null,
    locale,
  );

  const games: MlbWeeklyGameResult[] = rows
    .map((r) => ({
      externalGameId: r.external_game_id,
      gameDate: r.game_date,
      homeCode: r.home_team_code,
      awayCode: r.away_team_code,
      homeScore: r.home_score,
      awayScore: r.away_score,
      predictedHomeWin: r.predictedHomeWin,
      confidence: r.confidence,
      isCorrect: r.isCorrect,
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
