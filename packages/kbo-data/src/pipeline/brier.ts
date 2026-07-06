/**
 * Brier score utilities — single source of truth.
 *
 * Primary metric: home_win_prob vs actual home win (1/0).
 * Winner-centric (confidence vs is_correct) is intentionally NOT exported here —
 * that metric is polluted by confidence=0.3 fallback markers (CREDIT_EXHAUSTED path)
 * and should not be used for model quality assessment.
 *
 * M3 context (cycle 1456 Fable plan): op-analysis confirmed home_win_prob Brier is
 * stable (0.24 pre/post). "drift" to 0.35+ was purely from winner-centric metric
 * mixing in conf=0.3 fallback rows.
 */

export interface BrierRow {
  home_win_prob: number;
  home_won: 0 | 1;
}

/** Single-game Brier: (p − outcome)². */
export function brierPoint(homeWinProb: number, homeWon: 0 | 1): number {
  return (homeWinProb - homeWon) ** 2;
}

/** Mean Brier over an array of rows. Returns null for empty input. */
export function brierMean(rows: BrierRow[]): number | null {
  if (rows.length === 0) return null;
  return rows.reduce((s, r) => s + brierPoint(r.home_win_prob, r.home_won), 0) / rows.length;
}

/**
 * Bootstrap 95% CI for Brier mean.
 * Returns { lo, hi, mean } or null if rows empty.
 */
export function brierBootstrapCI(
  rows: BrierRow[],
  iters = 2000,
  alpha = 0.05,
): { lo: number; hi: number; mean: number } | null {
  if (rows.length === 0) return null;
  const samples: number[] = [];
  for (let i = 0; i < iters; i++) {
    let s = 0;
    for (let j = 0; j < rows.length; j++) {
      const r = rows[Math.floor(Math.random() * rows.length)];
      s += brierPoint(r.home_win_prob, r.home_won);
    }
    samples.push(s / rows.length);
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / iters;
  return {
    lo: samples[Math.floor(iters * (alpha / 2))],
    hi: samples[Math.floor(iters * (1 - alpha / 2))],
    mean,
  };
}

/** Coin-flip baseline: 0.25 (p=0.5 always → (0.5-0)²+(0.5-1)² / 2 = 0.25). */
export const COIN_FLIP_BRIER = 0.25;
