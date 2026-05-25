/**
 * Backtest harness — 통합 entry + Zod schema input/output validation.
 *
 * plan #9 Step 2 spec 박제 (cycle 890) 의 Step 3 구현 (cycle 893):
 *  - 기존 7 backtest script (bootstrap-ci / grid / logistic / manual / v3 / wayback / run)
 *    를 하나의 entry 로 통합하기 위한 framework
 *  - Zod schema 가 input/output shape 검증 — 신규 factor 추가 시 silent shape drift 차단
 *  - factorBreakdown coverage 측정 — 운영 데이터 안 신규 factor missing 비율 가시화
 *
 * 본 cycle 893 = skeleton (runBacktest wrapper + Zod validation + coverage 측정).
 * 실제 factor 통합 model (makeModelWithCandidates) 은 Step 4 carry-over (GameFeatures
 * 9 신규 field 확장 후 박제).
 */

import { z } from 'zod';

import { runBacktest } from './runner';
import type {
  BacktestGame,
  GameFeatures,
  MetricsSummary,
  Model,
} from './types';
import type { EloHistory } from './elo-history';

// =============================================================================
// Zod schema — base 10 factor + candidate 9 factor enum
// =============================================================================

export const BASE_FACTORS = [
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

export const CANDIDATE_FACTORS = [
  // immediate collection (7건) — plan #9 Step 1 cycle 889 박제
  'back_to_back',
  'weather_temp',
  'weather_wind',
  'weather_precipitation',
  'travel_distance',
  'series_game_order',
  'streak_momentum',
  // dependency_blocked (2건)
  'sp_rest_days',
  'umpire_strike_zone_bias',
] as const;

export const ALL_FACTORS = [...BASE_FACTORS, ...CANDIDATE_FACTORS] as const;

// =============================================================================
// HarnessInput schema
// =============================================================================

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const HarnessInputSchema = z
  .object({
    scope: z.object({
      seasonStart: z.number().int().min(2020).max(2030),
      seasonEnd: z.number().int().min(2020).max(2030),
      dateStart: z.string().regex(dateRegex).optional(),
      dateEnd: z.string().regex(dateRegex).optional(),
    }),
    factors: z.object({
      base: z.array(z.enum(BASE_FACTORS)),
      candidates: z.array(z.enum(CANDIDATE_FACTORS)).default([]),
    }),
    weights: z.record(z.string(), z.number().min(0).max(1)),
    options: z
      .object({
        homeAdvantage: z.number().min(0).max(0.1).default(0.015),
        includeFancyStats: z.boolean().default(false),
        skipMissingFeatures: z.boolean().default(true),
      })
      .default({}),
  })
  .refine((v) => v.scope.seasonEnd >= v.scope.seasonStart, {
    message: 'scope.seasonEnd must be >= scope.seasonStart',
    path: ['scope'],
  });

export type HarnessInput = z.infer<typeof HarnessInputSchema>;

// =============================================================================
// HarnessOutput schema
// =============================================================================

export const CalibrationBucketSchema = z.object({
  lo: z.number(),
  hi: z.number(),
  n: z.number().int().min(0),
  avgPredicted: z.number(),
  actualRate: z.number(),
});

export const MetricsSummarySchema = z.object({
  n: z.number().int().min(0),
  brier: z.number(),
  logLoss: z.number(),
  accuracy: z.number().min(0).max(1),
  calibration: z.array(CalibrationBucketSchema),
});

export const FactorCoverageSchema = z.object({
  weight: z.number(),
  coverage: z.number().min(0).max(1),
  nUsed: z.number().int().min(0),
  nMissing: z.number().int().min(0),
});

export const HarnessOutputSchema = z.object({
  scope: z.object({
    seasonStart: z.number().int(),
    seasonEnd: z.number().int(),
    nGames: z.number().int().min(0),
    skippedGames: z.number().int().min(0),
  }),
  perModel: z.record(z.string(), MetricsSummarySchema),
  factorBreakdown: z.record(z.string(), FactorCoverageSchema),
  generatedAt: z.string(),
});

export type HarnessOutput = z.infer<typeof HarnessOutputSchema>;

// =============================================================================
// Factor coverage 측정 — GameFeatures 안 factor 실측 nUsed / nMissing 집계
// =============================================================================

const FACTOR_FEATURE_KEYS: Record<
  (typeof ALL_FACTORS)[number],
  ReadonlyArray<keyof GameFeatures>
> = {
  // base 10 — buildFeatures 가 채우는 필드
  sp_fip: ['homeFip', 'awayFip'],
  sp_xfip: [],
  lineup_woba: ['homeWoba', 'awayWoba'],
  bullpen_fip: ['homeBullpenInningsL3', 'awayBullpenInningsL3'],
  recent_form: ['homeForm', 'awayForm'],
  war: [],
  head_to_head: ['h2hHomeWins', 'h2hAwayWins'],
  park_factor: ['parkPf'],
  elo: ['homeElo', 'awayElo'],
  sfr: ['homeSfr', 'awaySfr'],
  // candidate 9 — Step 4 시점 GameFeatures 확장 후 키 채움
  back_to_back: [],
  weather_temp: [],
  weather_wind: [],
  weather_precipitation: [],
  travel_distance: [],
  series_game_order: [],
  streak_momentum: [],
  sp_rest_days: [],
  umpire_strike_zone_bias: [],
};

export function measureFactorCoverage(
  factor: (typeof ALL_FACTORS)[number],
  features: ReadonlyArray<GameFeatures | null>,
): { nUsed: number; nMissing: number; coverage: number } {
  const keys = FACTOR_FEATURE_KEYS[factor];
  if (keys.length === 0) {
    return { nUsed: 0, nMissing: features.length, coverage: 0 };
  }
  let used = 0;
  for (const f of features) {
    if (!f) continue;
    const allPresent = keys.every((k) => {
      const v = f[k];
      return v !== undefined && v !== null;
    });
    if (allPresent) used++;
  }
  const missing = features.length - used;
  const coverage = features.length === 0 ? 0 : used / features.length;
  return { nUsed: used, nMissing: missing, coverage };
}

// =============================================================================
// Harness entry — runBacktest wrapper
// =============================================================================

export interface HarnessRunContext {
  games: BacktestGame[];
  eloHistory: EloHistory;
  models: Record<string, Model>;
  /** buildFeatures 결과 (coverage 측정용). runner.ts 내부 재계산 회피. */
  featuresSample?: ReadonlyArray<GameFeatures | null>;
}

export async function runHarness(
  rawInput: unknown,
  ctx: HarnessRunContext,
): Promise<HarnessOutput> {
  const input = HarnessInputSchema.parse(rawInput);

  const runnerResult = runBacktest({
    games: ctx.games,
    eloHistory: ctx.eloHistory,
    models: ctx.models,
  });

  const perModel: Record<string, MetricsSummary> = runnerResult.perModel;

  const factorBreakdown: Record<
    string,
    z.infer<typeof FactorCoverageSchema>
  > = {};
  const sample = ctx.featuresSample ?? [];
  const allFactors: ReadonlyArray<(typeof ALL_FACTORS)[number]> = [
    ...input.factors.base,
    ...input.factors.candidates,
  ];
  for (const factor of allFactors) {
    const weight = input.weights[factor] ?? 0;
    const { nUsed, nMissing, coverage } = measureFactorCoverage(factor, sample);
    factorBreakdown[factor] = { weight, coverage, nUsed, nMissing };
  }

  const output: HarnessOutput = {
    scope: {
      seasonStart: input.scope.seasonStart,
      seasonEnd: input.scope.seasonEnd,
      nGames: runnerResult.used,
      skippedGames: runnerResult.skipped,
    },
    perModel,
    factorBreakdown,
    generatedAt: new Date().toISOString(),
  };

  return HarnessOutputSchema.parse(output);
}
