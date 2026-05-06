import { createClient } from "@/lib/supabase/server";
import { CURRENT_MODEL_FILTER } from "@/config/model";
import {
  KBO_TEAMS,
  assertSelectOk,
  classifyWinnerProb,
  shortTeamName,
  winnerProbOf,
  type SelectResult,
  type TeamCode,
} from '@moneyball/shared';
import { analyzeFactorAccuracy } from "@/lib/dashboard/factor-accuracy";
import type { WeekRange } from "./computeWeekRange";

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
  summary: string;
}

interface Row {
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

function pickHighlights(rows: Row[]): WeeklyHighlight[] {
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
    .sort((a, b) => b.predicted - a.predicted);
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

  if (samples.length < 3) return { best: null, worst: null };

  const report = analyzeFactorAccuracy(samples, { minSamples: 3 });
  const eligible = report.stats.filter((s) => s.n >= 3);
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
    text += " 모델 v1.6의 이번 주 퍼포먼스가 강했습니다.";
  } else if (accuracyRate <= 0.4) {
    text += " 이번 주는 모델이 고전한 구간으로, 팩터 편향 분석을 통해 튜닝 근거를 축적하고 있습니다.";
  }

  return text;
}

export async function buildWeeklyReview(
  week: WeekRange,
): Promise<WeeklyReview> {
  const supabase = await createClient();
  // assertSelectOk — cycle 173 silent drift family apps/moneyball lib sub-dir
  // 차원 (reviews) 첫 진입. error 시 fail-loud (기존엔 data=null silent fallback
  // → 빈 weekly review → "이번 주 검증 0" 위장).
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
    .gte("game.game_date", week.startDate)
    .lte("game.game_date", week.endDate)) as unknown as SelectResult<Row[]>;

  const { data } = assertSelectOk(
    result,
    `buildWeeklyReview week ${week.startDate}~${week.endDate}`,
  );
  const rows = ((data ?? []) as Row[]).filter((r) => r.game !== null);

  const totalGames = rows.length;
  const verified = rows.filter((r) => r.is_correct !== null);
  const verifiedGames = verified.length;
  const correctGames = verified.filter((r) => r.is_correct === true).length;
  const accuracyRate =
    verifiedGames > 0 ? correctGames / verifiedGames : 0;

  const highlights = pickHighlights(rows);
  const teamStats = buildTeamStats(rows);
  const factorInsights = buildFactorInsights(rows);
  const summary = buildSummary(
    week,
    verifiedGames,
    correctGames,
    accuracyRate,
    highlights[0] ?? null,
  );

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
    summary,
  };
}
