import { z } from "zod";

export const RulesHistoryEntrySchema = z.object({
  cycle: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  delta: z.number().int(),
});

export const MatchDistributionSchema = z.object({
  tier_3: z.number().int().nonnegative(), // 5등 (3개 매칭)
  tier_4: z.number().int().nonnegative(), // 4등 (4개)
  tier_5: z.number().int().nonnegative(), // 3등 (5개)
  tier_5_bonus: z.number().int().nonnegative(), // 2등 (5+보너스)
  tier_6: z.number().int().nonnegative(), // 1등 (6개)
  avg_match: z.number().nonnegative(),
  random_expected_tier_3: z.number().nonnegative(),
  over_perform_ratio: z.number().nonnegative(), // 실제 / random expected
});

export const WinningScoreBreakdownSchema = z.object({
  lucky_penalty: z.number(),
  consec_pairs_bonus: z.number(),
  sum_distance: z.number(),
  arith_penalty: z.number(),
  decade_penalty: z.number(),
  very_low_penalty: z.number(),
  total: z.number(),
  pool_rank_pct: z.number().min(0).max(100).optional(),
});

export const OOSPassRateEntrySchema = z.object({
  draw: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  match_distribution: MatchDistributionSchema.optional(),
  winning_score_breakdown: WinningScoreBreakdownSchema.optional(),
});

export const ChainFireHistoryEntrySchema = z.object({
  cycle: z.number().int().positive(),
  outcome: z.enum(["success", "partial", "fail", "interrupted", "retro-only"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  next_recommended: z.string().optional(),
});

export const LottoDataSchema = z.object({
  version: z.number().int().positive(),
  generated_at: z.string(),
  rules_total: z.number().int().nonnegative(),
  count_valid: z.number().int().nonnegative(),
  total_combinations: z.literal(8_145_060),
  rules_history: z.array(RulesHistoryEntrySchema),
  oos_pass_rate: z.array(OOSPassRateEntrySchema),
  chain_fire_history: z.array(ChainFireHistoryEntrySchema),
});

export const ScoreStatsSchema = z.object({
  n: z.number().int().nonnegative(),
  min: z.number(),
  max: z.number(),
  median: z.number(),
  mean: z.number(),
});

export const ScorePercentilesSchema = z.object({
  p0: z.number(),
  p5: z.number(),
  p10: z.number(),
  p25: z.number(),
  p50: z.number(),
  p75: z.number(),
  p90: z.number(),
  p95: z.number(),
  p100: z.number(),
});

export const LottoScoreBacktestSchema = z.object({
  generated_at: z.string(),
  n_rounds: z.number().int().nonnegative(),
  score_stats: ScoreStatsSchema,
  score_percentiles: ScorePercentilesSchema,
  note: z.string(),
  limitations: z.array(z.string()),
});

export type LottoData = z.infer<typeof LottoDataSchema>;
export type LottoScoreBacktest = z.infer<typeof LottoScoreBacktestSchema>;
