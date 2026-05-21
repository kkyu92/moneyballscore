import { z } from "zod";

export const RulesHistoryEntrySchema = z.object({
  cycle: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  delta: z.number().int(),
});

export const OOSPassRateEntrySchema = z.object({
  draw: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
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

export type LottoData = z.infer<typeof LottoDataSchema>;
export type RulesHistoryEntry = z.infer<typeof RulesHistoryEntrySchema>;
export type OOSPassRateEntry = z.infer<typeof OOSPassRateEntrySchema>;
export type ChainFireHistoryEntry = z.infer<typeof ChainFireHistoryEntrySchema>;
