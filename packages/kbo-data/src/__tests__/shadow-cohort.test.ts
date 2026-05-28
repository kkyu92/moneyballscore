import { describe, it, expect } from 'vitest';
import {
  computeShadowPrediction,
  shadowBrierDelta,
  insertShadowRow,
  type ShadowRowInsertInput,
} from '../pipeline/shadow-cohort';
import { SHADOW_WEIGHTS, SHADOW_SCORING_RULE } from '@moneyball/shared';

const FACTORS_HOME_FAVORED: Record<string, number> = {
  sp_fip: 0.65,
  sp_xfip: 0.6,
  lineup_woba: 0.7,
  bullpen_fip: 0.6,
  recent_form: 0.65,
  war: 0.6,
  head_to_head: 0.55,
  park_factor: 0.5,
  elo: 0.7,
  sfr: 0.5,
  park_weather: 0.5,
  umpire_sz: 0.5,
};

function baseMeta(): ShadowRowInsertInput['baseRowMeta'] {
  return {
    home_sp_fip: 3.5,
    away_sp_fip: 4.0,
    home_sp_xfip: 3.7,
    away_sp_xfip: 4.2,
    home_lineup_woba: 0.34,
    away_lineup_woba: 0.32,
    home_bullpen_fip: 3.8,
    away_bullpen_fip: 4.1,
    home_war_total: 18,
    away_war_total: 14,
    home_recent_form: 0.65,
    away_recent_form: 0.5,
    head_to_head_rate: 0.55,
    park_factor: 1.02,
    home_elo: 1550,
    away_elo: 1470,
    home_sfr: 2.5,
    away_sfr: -1.0,
    reasoning: 'v1.8 reasoning text',
  };
}

function mockInsert(returnValue: {
  data?: { id: number }[] | null;
  error?: { code?: string; message: string } | null;
}) {
  const calls: Array<{ table: string; payload: unknown }> = [];
  const db = {
    from: (table: string) => ({
      insert: (payload: unknown) => {
        calls.push({ table, payload });
        return {
          select: () => Promise.resolve(returnValue),
        };
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { db, calls };
}

describe('computeShadowPrediction (M-V2 quant 재계산)', () => {
  it('test 2 — Brier delta calc (홈 유리 factors → homeWinProb > 0.5)', () => {
    const result = computeShadowPrediction(FACTORS_HOME_FAVORED);
    expect(result).not.toBeNull();
    expect(result!.homeWinProb).toBeGreaterThan(0.5);
    expect(result!.factorTotal).toBeCloseTo(0.9, 6); // SHADOW_WEIGHTS sum
  });

  it('factors null/undefined → null 반환', () => {
    expect(computeShadowPrediction(null)).toBeNull();
    expect(computeShadowPrediction(undefined)).toBeNull();
  });

  it('shadow factor (park_weather / umpire_sz) 부재 시 neutral fallback (factor=0.5)', () => {
    const partial: Record<string, number> = { ...FACTORS_HOME_FAVORED };
    delete partial.park_weather;
    delete partial.umpire_sz;
    const result = computeShadowPrediction(partial);
    expect(result).not.toBeNull();
    expect(result!.homeWinProb).toBeGreaterThan(0.5);
  });

  it('SHADOW_WEIGHTS 합계 0.90 (production 0.85 + shadow 0.05)', () => {
    const sum = (Object.values(SHADOW_WEIGHTS) as number[]).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBeCloseTo(0.9, 6);
  });

  it('clamp [0.15, 0.85]', () => {
    // 극단 입력 — 모든 factor = 1 (홈 압도)
    const extreme: Record<string, number> = Object.fromEntries(
      Object.keys(SHADOW_WEIGHTS).map((k) => [k, 1]),
    );
    const result = computeShadowPrediction(extreme);
    expect(result!.homeWinProb).toBeLessThanOrEqual(0.85);
    expect(result!.homeWinProb).toBeGreaterThanOrEqual(0.15);
  });
});

describe('shadowBrierDelta', () => {
  it('shadow 가 더 정확 (적은 Brier) → delta < 0', () => {
    // 홈 승 (outcome=1). v1.8 = 0.55, shadow = 0.65 → shadow Brier 더 작음
    const d = shadowBrierDelta(0.55, 0.65, true);
    expect(d.v18Brier).toBeCloseTo(0.2025, 6);
    expect(d.shadowBrier).toBeCloseTo(0.1225, 6);
    expect(d.delta).toBeLessThan(0);
  });

  it('shadow 가 덜 정확 → delta > 0', () => {
    const d = shadowBrierDelta(0.7, 0.5, true);
    expect(d.delta).toBeGreaterThan(0);
  });

  it('away 승 (outcome=0) 분기', () => {
    const d = shadowBrierDelta(0.3, 0.2, false);
    expect(d.v18Brier).toBeCloseTo(0.09, 6);
    expect(d.shadowBrier).toBeCloseTo(0.04, 6);
    expect(d.delta).toBeLessThan(0);
  });
});

describe('insertShadowRow (M-V2 row pair insert)', () => {
  it('test 1 — shadow row insert pair (production + shadow scoring_rule)', async () => {
    const { db, calls } = mockInsert({ data: [{ id: 42 }], error: null });
    const result = await insertShadowRow(db, {
      gameId: 100,
      predictedWinnerId: 1,
      factors: FACTORS_HOME_FAVORED,
      baseRowMeta: baseMeta(),
    });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('inserted');
    expect(result.shadowProb).not.toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('predictions');
    // payload 안 scoring_rule + model_version = shadow 라벨
    const payload = calls[0].payload as Record<string, unknown>;
    expect(payload.scoring_rule).toBe(SHADOW_SCORING_RULE);
    expect(payload.model_version).toBe(SHADOW_SCORING_RULE);
    expect(payload.game_id).toBe(100);
    expect(payload.prediction_type).toBe('pre_game');
    expect(payload.debate_version).toBeNull();
  });

  it('test 3 — shadow insert fail tolerant (db error → throw X, errors[] route 만)', async () => {
    const { db } = mockInsert({
      data: null,
      error: { code: '23502', message: 'NOT NULL violation' },
    });
    const result = await insertShadowRow(db, {
      gameId: 100,
      predictedWinnerId: 1,
      factors: FACTORS_HOME_FAVORED,
      baseRowMeta: baseMeta(),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('db_error');
    expect(result.error).toContain('NOT NULL');
    // shadowProb 은 compute 단계에서 성공했음
    expect(result.shadowProb).not.toBeNull();
  });

  it('test 4 — cohort split (UNIQUE 23505 race → ok silent)', async () => {
    const { db } = mockInsert({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });
    const result = await insertShadowRow(db, {
      gameId: 100,
      predictedWinnerId: 1,
      factors: FACTORS_HOME_FAVORED,
      baseRowMeta: baseMeta(),
    });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe('duplicate');
  });

  it('compute fail 시 (factors null) → reason=compute_failed, ok=false', async () => {
    const { db, calls } = mockInsert({ data: null, error: null });
    const result = await insertShadowRow(db, {
      gameId: 100,
      predictedWinnerId: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      factors: null as any,
      baseRowMeta: baseMeta(),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('compute_failed');
    expect(calls).toHaveLength(0); // DB insert 시도 X
  });
});
