// TabPFN inference output CSV reader — v18 candidate Y.
//
// Python inference output format (2-column CSV):
//   game_id,tabpfn_home_win_prob
//   12345,0.63
//   ...
//
// Import flow: pnpm tsx scripts/import-tabpfn-predictions.ts --input <file.csv>
// Storage: predictions table, scoring_rule='tabpfn-shadow', reasoning.homeWinProb.
// Retrieval: /accuracy/shadow page, pairProbForRow 'tabpfn-shadow' path.

export const TABPFN_OUTPUT_HEADER = 'game_id,tabpfn_home_win_prob';

export type TabpfnOutputRow = {
  game_id: number;
  tabpfn_home_win_prob: number;
};

export type TabpfnParseResult =
  | { ok: true; rows: TabpfnOutputRow[] }
  | { ok: false; error: string };

export type TabpfnRowDropReason =
  | 'invalid_game_id'
  | 'invalid_prob'
  | 'prob_out_of_range';

export type TabpfnRowResult =
  | { ok: true; row: TabpfnOutputRow }
  | { ok: false; reason: TabpfnRowDropReason };

export function parseTabpfnRow(cells: string[]): TabpfnRowResult {
  if (cells.length < 2) return { ok: false, reason: 'invalid_game_id' };
  const gameId = parseInt(cells[0], 10);
  if (!Number.isInteger(gameId) || gameId <= 0) {
    return { ok: false, reason: 'invalid_game_id' };
  }
  const prob = parseFloat(cells[1]);
  if (!Number.isFinite(prob)) return { ok: false, reason: 'invalid_prob' };
  if (prob < 0 || prob > 1) return { ok: false, reason: 'prob_out_of_range' };
  return { ok: true, row: { game_id: gameId, tabpfn_home_win_prob: prob } };
}

export function parseTabpfnOutputCsv(csv: string): TabpfnParseResult {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) return { ok: false, error: 'empty file' };

  const header = lines[0].trim().replace(/\r$/, '');
  if (header !== TABPFN_OUTPUT_HEADER) {
    return {
      ok: false,
      error: `unexpected header: "${header}" (expected: "${TABPFN_OUTPUT_HEADER}")`,
    };
  }

  const rows: TabpfnOutputRow[] = [];
  const drops: Record<TabpfnRowDropReason, number> = {
    invalid_game_id: 0,
    invalid_prob: 0,
    prob_out_of_range: 0,
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim().replace(/\r$/, '');
    if (!line) continue;
    const result = parseTabpfnRow(line.split(','));
    if (result.ok) {
      rows.push(result.row);
    } else {
      drops[result.reason] += 1;
    }
  }

  const totalDropped = Object.values(drops).reduce((s, n) => s + n, 0);
  if (totalDropped > 0) {
    console.warn('tabpfn-import: drops', drops);
  }

  return { ok: true, rows };
}

/** predictions table upsert shape — subset required for tabpfn-shadow insert. */
export type TabpfnPredictionInsert = {
  game_id: number;
  scoring_rule: 'tabpfn-shadow';
  prediction_type: 'pre_game';
  reasoning: { homeWinProb: number };
  predicted_winner: null;
  confidence: number;
};

export function buildTabpfnPredictionInsert(
  row: TabpfnOutputRow,
): TabpfnPredictionInsert {
  return {
    game_id: row.game_id,
    scoring_rule: 'tabpfn-shadow',
    prediction_type: 'pre_game',
    reasoning: { homeWinProb: row.tabpfn_home_win_prob },
    predicted_winner: null,
    // confidence = distance from 0.5 (calibration proxy)
    confidence: Math.abs(row.tabpfn_home_win_prob - 0.5) * 2,
  };
}
