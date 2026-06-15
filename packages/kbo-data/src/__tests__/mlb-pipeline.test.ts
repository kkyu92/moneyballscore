// Plan C Task 2 — mlb-pipeline.ts 테스트
// 각 mode 호출 시 throw 없음, unknown mode throw, result shape 검증

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { MlbPipelineResult } from '../pipeline/mlb-pipeline';

// ── mock 외부 의존성 ──────────────────────────────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    })),
  })),
}));

vi.mock('../scrapers/statsapi-mlb', () => ({
  fetchMlbSchedule: vi.fn().mockResolvedValue([
    {
      gamePk: 1001,
      gameDateUtc: new Date('2026-06-12T23:00:00Z'),
      homeTeam: 'NYY',
      awayTeam: 'BOS',
      status: 'scheduled',
    },
  ]),
}));

vi.mock('../factors/mlb-base', () => ({
  computeMlbProbability: vi.fn().mockReturnValue(0.55),
}));

vi.mock('../factors/mlb-shadow-c', () => ({
  MILESTONE_TRIGGERS: [27, 60, 150, 300, 1000, 2430],
  trainShadowWeights: vi.fn().mockReturnValue({ weights: {}, loss: 0.25 }),
  computeBrier: vi.fn().mockReturnValue(0.24),
}));

vi.mock('../pipeline/silent-drift-alert', () => ({
  shouldAlertSilentDrift: vi.fn().mockReturnValue(false),
  captureSilentDriftAlert: vi.fn().mockResolvedValue(undefined),
}));

// ── tests ─────────────────────────────────────────────────────────────────────

const DATE = '2026-06-12';
const TRIGGERED_BY = 'test';

function assertResultShape(result: MlbPipelineResult, mode: string): void {
  expect(result).toMatchObject({
    mode,
    date: DATE,
    triggered_by: TRIGGERED_BY,
  });
  expect(typeof result.games_found).toBe('number');
  expect(typeof result.rows_inserted).toBe('number');
  expect(Array.isArray(result.errors)).toBe(true);
}

describe('runMlbPipeline', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    vi.clearAllMocks();
  });

  it('mlb_statsapi_scrape — throw 없음, result shape 정상', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_statsapi_scrape', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_statsapi_scrape');
  });

  it('mlb_fancy_scrape — stub, throw 없음, rows_inserted=0', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_fancy_scrape', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_fancy_scrape');
    expect(result.rows_inserted).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('mlb_savant_scrape — stub, throw 없음, rows_inserted=0', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_savant_scrape', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_savant_scrape');
    expect(result.rows_inserted).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('mlb_predict_final — throw 없음, result shape 정상', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_predict_final', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_predict_final');
  });

  it('mlb_combined_notify — stub, throw 없음, result shape 정상', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_combined_notify', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_combined_notify');
    expect(result.rows_inserted).toBe(0);
  });

  it('mlb_shadow_train — throw 없음, result shape 정상', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_shadow_train', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_shadow_train');
  });

  it('mlb_walk_forward_measure — throw 없음, result shape 정상', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_walk_forward_measure', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_walk_forward_measure');
  });

  it('unknown mode → throw Error', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    // @ts-expect-error intentional invalid mode
    await expect(runMlbPipeline('invalid_mode', DATE, TRIGGERED_BY)).rejects.toThrow(
      'unknown mode: invalid_mode',
    );
  });

  it('captureSilentDriftAlert 가 각 mode 완료 후 호출됨', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const { captureSilentDriftAlert } = await import('../pipeline/silent-drift-alert');
    vi.clearAllMocks();

    await runMlbPipeline('mlb_statsapi_scrape', DATE, TRIGGERED_BY);
    expect(captureSilentDriftAlert).toHaveBeenCalledOnce();
    expect(captureSilentDriftAlert).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'mlb_statsapi_scrape', date: DATE }),
    );
  });
});
