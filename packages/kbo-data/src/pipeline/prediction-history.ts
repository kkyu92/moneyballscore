import type { TeamCode } from '@moneyball/shared';
import type { PredictionHistory } from '../agents/calibration-agent';

export interface PredictionHistoryRow {
  predicted_winner: number;
  is_correct: boolean | null;
  home_win_prob?: number | null;
  game?:
    | { home_team_id?: number | null; away_team_id?: number | null; game_date?: string | null }
    | { home_team_id?: number | null; away_team_id?: number | null; game_date?: string | null }[]
    | null;
}

const HOME_AWAY_MIN_SAMPLE = 10;
const RECENT_RESULTS_LIMIT = 5; // calibration-agent buildStatsBlock 이 slice(0, 5) 로 소비

function pickGame(
  game: PredictionHistoryRow['game'],
): { home_team_id?: number | null; away_team_id?: number | null; game_date?: string | null } | null {
  if (!game) return null;
  return Array.isArray(game) ? game[0] ?? null : game;
}

/**
 * reverseTeamMap 미전달 시 (기존 호출부 하위호환) teamAccuracy/recentResults 는
 * 빈 상태 유지 — cycle 133 최초 구현 당시의 known gap. daily.ts 실제 caller 는
 * team_id → TeamCode 역맵을 전달해 이 두 필드를 실제로 채운다 (cycle 2823 wiring fix).
 */
export function computePredictionHistory(
  rows: PredictionHistoryRow[],
  reverseTeamMap: Record<number, TeamCode> = {},
): PredictionHistory {
  if (rows.length === 0) {
    return {
      totalPredictions: 0,
      correctPredictions: 0,
      recentResults: [],
      homeTeamAccuracy: null,
      awayTeamAccuracy: null,
      teamAccuracy: {},
    };
  }

  const total = rows.length;
  let correct = 0;
  let homePredictedTotal = 0;
  let homePredictedCorrect = 0;
  let awayPredictedTotal = 0;
  let awayPredictedCorrect = 0;
  const teamAccuracy: Record<string, { correct: number; total: number }> = {};
  const recentResults: PredictionHistory['recentResults'] = [];

  for (const r of rows) {
    if (r.is_correct) correct++;
    const game = pickGame(r.game);
    const homeId = game?.home_team_id;
    const awayId = game?.away_team_id;
    if (homeId == null || awayId == null) continue;
    if (r.predicted_winner === homeId) {
      homePredictedTotal++;
      if (r.is_correct) homePredictedCorrect++;
    } else if (r.predicted_winner === awayId) {
      awayPredictedTotal++;
      if (r.is_correct) awayPredictedCorrect++;
    }

    const homeCode = reverseTeamMap[homeId];
    const awayCode = reverseTeamMap[awayId];
    if (homeCode) {
      const acc = (teamAccuracy[homeCode] ??= { correct: 0, total: 0 });
      acc.total++;
      if (r.is_correct) acc.correct++;
    }
    if (awayCode) {
      const acc = (teamAccuracy[awayCode] ??= { correct: 0, total: 0 });
      acc.total++;
      if (r.is_correct) acc.correct++;
    }

    if (recentResults.length < RECENT_RESULTS_LIMIT && homeCode && awayCode && game?.game_date) {
      const predictedCode =
        r.predicted_winner === homeId ? homeCode : r.predicted_winner === awayId ? awayCode : null;
      if (predictedCode) {
        const actualCode = r.is_correct ? predictedCode : predictedCode === homeCode ? awayCode : homeCode;
        recentResults.push({
          date: game.game_date,
          homeTeam: homeCode,
          awayTeam: awayCode,
          predictedWinner: predictedCode,
          actualWinner: actualCode,
          isCorrect: r.is_correct,
          homeWinProb: r.home_win_prob ?? 0.5,
        });
      }
    }
  }

  return {
    totalPredictions: total,
    correctPredictions: correct,
    recentResults,
    homeTeamAccuracy:
      homePredictedTotal >= HOME_AWAY_MIN_SAMPLE
        ? homePredictedCorrect / homePredictedTotal
        : null,
    awayTeamAccuracy:
      awayPredictedTotal >= HOME_AWAY_MIN_SAMPLE
        ? awayPredictedCorrect / awayPredictedTotal
        : null,
    teamAccuracy,
  };
}
