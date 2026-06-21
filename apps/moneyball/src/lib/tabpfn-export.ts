// TabPFN CSV export — pure transform layer (no I/O).
//
// scripts/export-predictions-tabpfn.ts 가 supabase fetch + file write 담당. 본 모듈은
// predictions JOIN games row 1건을 CSV 한 줄로 평탄화 + 결측/이상 row drop 판정.
//
// 자율 영역 한도: CSV 박제 only (Step 3 사용자 Python sidecar 영역 inference 입력).
// docs/research/tabpfn-data-prep.md schema 정합. cycle 1130 v17 candidate P.

import { HOME_ADVANTAGE } from '@moneyball/shared';

export { HOME_ADVANTAGE };

export const REQUIRED_FACTORS = [
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

export const CSV_HEADER = [
  'game_id',
  'game_date',
  'prediction_type',
  'scoring_rule',
  ...REQUIRED_FACTORS,
  'home_advantage',
  'predicted_home_win_prob',
  'home_won',
  'is_correct',
].join(',');

export type PredictionExportRow = {
  game_id: number;
  predicted_winner: number | null;
  confidence: number | null;
  prediction_type: string;
  scoring_rule: string | null;
  factors: Record<string, unknown> | null;
  reasoning: { homeWinProb?: unknown } | null;
  is_correct: boolean | null;
  games: {
    id: number;
    game_date: string;
    home_team_id: number;
    winner_team_id: number | null;
    status: string;
  } | null;
};

export type DropReason =
  | 'no_games_join'
  | 'no_factors'
  | 'missing_factor_key'
  | 'invalid_factor_value'
  | 'no_home_win_prob'
  | 'no_winner_team_id'
  | 'is_correct_null';

export type RowResult =
  | { ok: true; line: string }
  | { ok: false; reason: DropReason };

export type ExtractFactorsResult =
  | { ok: true; factors: Record<string, number> }
  | { ok: false; reason: DropReason };

export function extractFactors(
  factors: Record<string, unknown> | null,
): ExtractFactorsResult {
  if (!factors) return { ok: false, reason: 'no_factors' };
  const out: Record<string, number> = {};
  for (const key of REQUIRED_FACTORS) {
    if (!(key in factors)) return { ok: false, reason: 'missing_factor_key' };
    const raw = factors[key];
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(num)) return { ok: false, reason: 'invalid_factor_value' };
    out[key] = num;
  }
  return { ok: true, factors: out };
}

export function deriveHomeWinProb(row: PredictionExportRow): number | null {
  const raw = row.reasoning?.homeWinProb;
  const fromReasoning = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isFinite(fromReasoning) && fromReasoning >= 0 && fromReasoning <= 1) {
    return fromReasoning;
  }
  if (
    typeof row.confidence !== 'number' ||
    !Number.isFinite(row.confidence) ||
    row.confidence < 0 ||
    row.confidence > 1 ||
    row.predicted_winner == null ||
    row.games == null
  ) {
    return null;
  }
  const predictedHome = row.predicted_winner === row.games.home_team_id;
  return predictedHome ? row.confidence : 1 - row.confidence;
}

export function deriveHomeWon(row: PredictionExportRow): 0 | 1 | null {
  if (!row.games || row.games.winner_team_id == null) return null;
  return row.games.winner_team_id === row.games.home_team_id ? 1 : 0;
}

export function buildCsvRow(row: PredictionExportRow): RowResult {
  if (!row.games) return { ok: false, reason: 'no_games_join' };
  if (row.is_correct == null) return { ok: false, reason: 'is_correct_null' };

  const factorsResult = extractFactors(row.factors);
  if (!factorsResult.ok) return { ok: false, reason: factorsResult.reason };
  const factors = factorsResult.factors;

  const hwp = deriveHomeWinProb(row);
  if (hwp == null) return { ok: false, reason: 'no_home_win_prob' };

  const won = deriveHomeWon(row);
  if (won == null) return { ok: false, reason: 'no_winner_team_id' };

  const cells: (string | number)[] = [
    row.game_id,
    row.games.game_date,
    row.prediction_type,
    row.scoring_rule ?? '',
    ...REQUIRED_FACTORS.map((k) => factors[k]),
    HOME_ADVANTAGE,
    hwp,
    won,
    row.is_correct ? 1 : 0,
  ];
  return { ok: true, line: cells.join(',') };
}
