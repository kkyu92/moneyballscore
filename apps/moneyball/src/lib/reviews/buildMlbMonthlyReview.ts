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
// week → month 범위 계산(computeMonthRange, 리그 무관)만 교체. KBO 월간 페이지의
// 수렴 픽(강수렴/완전수렴) 섹션은 의도적으로 이식하지 않음 — MLB convergence 함수들
// (getMlbRecentConvergencePickRecord 등)이 시즌 전체 스캔만 지원하고 날짜 range
// 파라미터가 없어 (weekly Phase 1b page.tsx 주석과 동일 사유), 월간 페이지에 억지로
// 태우면 오도된 "월간 성적"으로 보일 수 있어 생략.
export interface MlbMonthlyReview {
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
): string {
  if (verifiedGames === 0) {
    return `${month.label}에는 아직 검증된 MLB 예측이 없습니다. 경기가 치러지고 결과가 반영되면 집계가 시작됩니다.`;
  }

  const pctLabel = `${Math.round(accuracyRate * 100)}%`;
  let text = `${month.label} 한 달 동안 총 ${verifiedGames}경기의 MLB 예측을 검증한 결과 ${correctGames}경기 적중 (${pctLabel})했습니다.`;

  if (previousAccuracyRate != null && verifiedGames >= MIN_VERIFIED_GAMES_HEDGE) {
    const diffPp = Math.round((accuracyRate - previousAccuracyRate) * 100);
    if (diffPp !== 0) {
      text += ` 전월 대비 ${diffPp > 0 ? "+" : ""}${diffPp}%p.`;
    }
  }

  if (topTeam && topTeam.predicted >= SMALL_SAMPLE_N) {
    text += ` 가장 정확했던 팀은 ${topTeam.teamName} (${topTeam.correct}/${topTeam.predicted} · ${Math.round(topTeam.accuracy * 100)}%).`;
  }

  if (accuracyRate >= ACCURACY_GOOD_RATE) {
    text += " 모델의 견조한 퍼포먼스가 유지됐습니다.";
  } else if (accuracyRate <= ACCURACY_WARN_RATE) {
    text += " 변수 많은 달이었으며, 팩터 편향 분석 결과는 다음 튜닝 근거로 축적됩니다.";
  }

  return text;
}

export async function buildMlbMonthlyReview(
  month: MonthRange,
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
  const factorInsights = buildMlbFactorInsights(rows, { minSamples: SMALL_SAMPLE_N });
  const topTeam =
    teamStats.find((t) => t.predicted >= SMALL_SAMPLE_N) ?? teamStats[0] ?? null;
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
