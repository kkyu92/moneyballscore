import { FACTOR_LABELS, NEUTRAL_LO, NEUTRAL_HI } from '@/lib/predictions/factorLabels';

const FACTOR_KEYS = [
  'sp_fip',
  'sp_xfip',
  'lineup_woba',
  'bullpen_fip',
  'recent_form',
  'war',
  'head_to_head',
  'park_factor',
  'elo',
  'sfr',
] as const;

export interface FactorAccuracyRow {
  key: string;
  label: string;
  n: number;
  accuracy: number;
  homeN: number;
  awayN: number;
}

export interface FactorPredRow {
  factors: Record<string, number> | null;
  is_correct: boolean;
  home_win_prob: number | null;
}

export function buildFactorAccuracy(rows: FactorPredRow[]): FactorAccuracyRow[] {
  const stats: Record<string, { total: number; correct: number; homeN: number; awayN: number }> =
    Object.fromEntries(FACTOR_KEYS.map((k) => [k, { total: 0, correct: 0, homeN: 0, awayN: 0 }]));

  for (const row of rows) {
    if (!row.factors || row.home_win_prob == null) continue;
    // Derive actual outcome — model always picks team with higher homeWinProb.
    // is_correct=true → predicted winner actually won.
    const homeActuallyWon = (row.home_win_prob >= 0.5) === row.is_correct;

    for (const key of FACTOR_KEYS) {
      const val = row.factors[key];
      if (val == null) continue;
      if (val >= NEUTRAL_LO && val <= NEUTRAL_HI) continue; // near-neutral — skip
      const factorSaysHome = val > 0.5;
      const s = stats[key];
      s.total++;
      if (factorSaysHome === homeActuallyWon) s.correct++;
      if (factorSaysHome) s.homeN++;
      else s.awayN++;
    }
  }

  return FACTOR_KEYS.map((key) => ({
    key,
    label: FACTOR_LABELS[key] ?? key,
    n: stats[key].total,
    accuracy: stats[key].total > 0 ? stats[key].correct / stats[key].total : 0,
    homeN: stats[key].homeN,
    awayN: stats[key].awayN,
  }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.accuracy - a.accuracy);
}
