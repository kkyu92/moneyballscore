import {
  ACCURACY_GOOD_RATE,
  ACCURACY_WARN_RATE,
  classifyWinnerProb,
  MIN_VERIFIED_GAMES_HEDGE,
  SMALL_SAMPLE_N,
} from '@moneyball/shared';
import type { MonthRange } from "./computeMonthRange";
import { getPreviousMonth } from "./computeMonthRange";
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

// buildMonthlyReview.ts(KBO) 의 MLB 대응 (plan #26 Phase 2) — Phase 1a/1b
// (buildMlbWeeklyReview.ts, mlb-shared.ts) 가 이미 확립한 데이터 레이어를 그대로 재사용,
// week → month 범위 계산(computeMonthRange, 리그 무관)만 교체. 수렴 픽(강수렴/완전수렴)
// 섹션은 이 빌더가 아니라 monthly/[month]/page.tsx 가 직접 range.startDate/endDate 로
// MLB convergence 함수(cycle 2345, date-range 파라미터 추가)를 호출해 렌더 — KBO
// monthly/[month]/page.tsx 와 동일 배선 위치.
interface MlbMonthlyReview {
  month: MonthRange;
  hasData: boolean;
  totalGames: number;
  verifiedGames: number;
  correctGames: number;
  accuracyRate: number;
  previousAccuracyRate: number | null;
  highlights: MlbWeeklyHighlight[]; // 월간은 5-7개
  teamStats: MlbWeeklyTeamStat[];
  factorInsights: {
    best: MlbWeeklyFactorInsight | null;
    worst: MlbWeeklyFactorInsight | null;
  };
  summary: string;
}

// buildMonthlyReview.ts(KBO) 의 pickHighlights 와 동일 구조 — tier 별 최대 2건씩 tag.
function pickHighlights(rows: MlbPredictionRow[], limit = 6): MlbWeeklyHighlight[] {
  const mapped = mapMlbRowsToHighlightCandidates(rows);
  if (mapped.length === 0) return [];

  const picked: MlbWeeklyHighlight[] = [];
  const used = new Set<string>();

  const tag = (h: MlbWeeklyHighlight, badge: MlbWeeklyHighlight["badge"]) => {
    if (!badge || used.has(h.externalGameId)) return;
    h.badge = badge;
    used.add(h.externalGameId);
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
  topTeam: MlbWeeklyTeamStat | null,
  locale: "ko" | "en" = "ko",
): string {
  const isEn = locale === "en";

  if (verifiedGames === 0) {
    return isEn
      ? `No MLB predictions have been verified yet for ${month.label}. The tally begins once games are played and results come in.`
      : `${month.label}에는 아직 검증된 MLB 예측이 없습니다. 경기가 치러지고 결과가 반영되면 집계가 시작됩니다.`;
  }

  const pctLabel = `${Math.round(accuracyRate * 100)}%`;
  let text = isEn
    ? `A total of ${verifiedGames} MLB predictions were verified over ${month.label}, with ${correctGames} correct (${pctLabel}).`
    : `${month.label} 한 달 동안 총 ${verifiedGames}경기의 MLB 예측을 검증한 결과 ${correctGames}경기 적중 (${pctLabel})했습니다.`;

  if (previousAccuracyRate != null && verifiedGames >= MIN_VERIFIED_GAMES_HEDGE) {
    const diffPp = Math.round((accuracyRate - previousAccuracyRate) * 100);
    if (diffPp !== 0) {
      text += isEn
        ? ` ${diffPp > 0 ? "+" : ""}${diffPp}pp vs. the previous month.`
        : ` 전월 대비 ${diffPp > 0 ? "+" : ""}${diffPp}%p.`;
    }
  }

  if (topTeam && topTeam.predicted >= SMALL_SAMPLE_N) {
    text += isEn
      ? ` The most accurately predicted team was ${topTeam.teamName} (${topTeam.correct}/${topTeam.predicted} · ${Math.round(topTeam.accuracy * 100)}%).`
      : ` 가장 정확했던 팀은 ${topTeam.teamName} (${topTeam.correct}/${topTeam.predicted} · ${Math.round(topTeam.accuracy * 100)}%).`;
  }

  if (accuracyRate >= ACCURACY_GOOD_RATE) {
    text += isEn ? " The model held a solid performance this month." : " 모델의 견조한 퍼포먼스가 유지됐습니다.";
  } else if (accuracyRate <= ACCURACY_WARN_RATE) {
    text += isEn
      ? " This was a volatile month — the factor bias breakdown below feeds into future tuning."
      : " 변수 많은 달이었으며, 팩터 편향 분석 결과는 다음 튜닝 근거로 축적됩니다.";
  }

  return text;
}

export async function buildMlbMonthlyReview(
  month: MonthRange,
  locale: "ko" | "en" = "ko",
): Promise<MlbMonthlyReview> {
  const rows = await fetchMlbPredictionRowsInRange(
    month.startDate,
    month.endDate,
    `buildMlbMonthlyReview range ${month.startDate}~${month.endDate}`,
  );

  const totalGames = rows.length;
  const verified = rows.filter((r) => r.isCorrect !== null);
  const verifiedGames = verified.length;
  const correctGames = verified.filter((r) => r.isCorrect === true).length;
  const accuracyRate = verifiedGames > 0 ? correctGames / verifiedGames : 0;

  // 전월 비교
  let previousAccuracyRate: number | null = null;
  if (verifiedGames >= SMALL_SAMPLE_N) {
    const prev = getPreviousMonth(month);
    const prevRows = await fetchMlbPredictionRowsInRange(
      prev.startDate,
      prev.endDate,
      `buildMlbMonthlyReview range ${prev.startDate}~${prev.endDate}`,
    );
    const prevVerified = prevRows.filter((r) => r.isCorrect !== null);
    if (prevVerified.length >= SMALL_SAMPLE_N) {
      const prevCorrect = prevVerified.filter(
        (r) => r.isCorrect === true,
      ).length;
      previousAccuracyRate = prevCorrect / prevVerified.length;
    }
  }

  const highlights = pickHighlights(rows);
  const teamStats = buildMlbTeamStats(rows);
  const factorInsights = buildMlbFactorInsights(rows, { minSamples: SMALL_SAMPLE_N, locale });
  const topTeam =
    teamStats.find((t) => t.predicted >= SMALL_SAMPLE_N) ?? teamStats[0] ?? null;
  const summary = buildSummary(
    month,
    verifiedGames,
    correctGames,
    accuracyRate,
    previousAccuracyRate,
    topTeam,
    locale,
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
