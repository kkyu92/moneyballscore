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

// 기피점수(unpopularityScore) 밴드 기준 프레임. 비율 표기 순서 고정:
// very-popular(<-3) : balanced[-3,7] : moderate(7,14] : unique(>14)
export const FrameKeySchema = z.enum([
  "very-popular",
  "balanced",
  "moderate",
  "unique",
]);

export const OOSPassRateEntrySchema = z.object({
  draw: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  match_distribution: MatchDistributionSchema.optional(),
  winning_score_breakdown: WinningScoreBreakdownSchema.optional(),
  frame: FrameKeySchema.optional(), // 1등 조합이 속한 프레임 (결과표 표기)
});

export const FrameBucketSchema = z.object({
  frame: FrameKeySchema,
  count: z.number().int().nonnegative(),
  pct: z.number().min(0).max(100),
});

export const FrameWindowSchema = z.object({
  n: z.number().int().nonnegative(),
  mean_score: z.number(),
  buckets: z.array(FrameBucketSchema),
});

// 앞으로 픽 생성 시 적용할 프레임 비율 (합 100, 표기 순서 고정)
export const FrameRatioSchema = z.object({
  "very-popular": z.number().nonnegative(),
  balanced: z.number().nonnegative(),
  moderate: z.number().nonnegative(),
  unique: z.number().nonnegative(),
});

export const FrameDistributionSchema = z.object({
  all_time: FrameWindowSchema,
  recent_100: FrameWindowSchema,
  target_ratio: FrameRatioSchema,
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
  frame_distribution: FrameDistributionSchema.optional(),
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
export type RulesHistoryEntry = z.infer<typeof RulesHistoryEntrySchema>;
export type OOSPassRateEntry = z.infer<typeof OOSPassRateEntrySchema>;
export type FrameKey = z.infer<typeof FrameKeySchema>;
export type FrameBucket = z.infer<typeof FrameBucketSchema>;
export type FrameWindow = z.infer<typeof FrameWindowSchema>;
export type FrameDistribution = z.infer<typeof FrameDistributionSchema>;
export type ChainFireHistoryEntry = z.infer<typeof ChainFireHistoryEntrySchema>;
export type MatchDistribution = z.infer<typeof MatchDistributionSchema>;
export type WinningScoreBreakdown = z.infer<typeof WinningScoreBreakdownSchema>;
export type LottoScoreBacktest = z.infer<typeof LottoScoreBacktestSchema>;
export type ScoreStats = z.infer<typeof ScoreStatsSchema>;
export type ScorePercentiles = z.infer<typeof ScorePercentilesSchema>;
