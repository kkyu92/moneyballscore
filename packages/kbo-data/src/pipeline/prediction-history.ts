import type { PredictionHistory } from '../agents/calibration-agent';

export interface PredictionHistoryRow {
  predicted_winner: number;
  is_correct: boolean | null;
  game?:
    | { home_team_id?: number | null; away_team_id?: number | null }
    | { home_team_id?: number | null; away_team_id?: number | null }[]
    | null;
}

const HOME_AWAY_MIN_SAMPLE = 10;

function pickGame(
  game: PredictionHistoryRow['game'],
): { home_team_id?: number | null; away_team_id?: number | null } | null {
  if (!game) return null;
  return Array.isArray(game) ? game[0] ?? null : game;
}

export function computePredictionHistory(
  rows: PredictionHistoryRow[],
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
  }

  return {
    totalPredictions: total,
    correctPredictions: correct,
    recentResults: [],
    homeTeamAccuracy:
      homePredictedTotal >= HOME_AWAY_MIN_SAMPLE
        ? homePredictedCorrect / homePredictedTotal
        : null,
    awayTeamAccuracy:
      awayPredictedTotal >= HOME_AWAY_MIN_SAMPLE
        ? awayPredictedCorrect / awayPredictedTotal
        : null,
    teamAccuracy: {},
  };
}
