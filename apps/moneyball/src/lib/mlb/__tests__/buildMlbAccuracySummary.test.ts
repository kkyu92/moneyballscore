import { afterEach, describe, expect, it, vi } from 'vitest';

interface SupabaseMockOptions {
  scheduleError?: { message: string } | null;
  predsError?: { message: string } | null;
  schedule?: unknown[];
  preds?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const scheduleBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: opts.scheduleError ? null : (opts.schedule ?? []),
      error: opts.scheduleError ?? null,
    }),
  };
  const predsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve({
        data: opts.predsError ? null : (opts.preds ?? []),
        error: opts.predsError ?? null,
      }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === 'mlb_schedule') return scheduleBuilder;
      if (table === 'predictions') return predsBuilder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

describe('buildMlbAccuracySummary', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('final 경기 없으면 빈 summary', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { buildMlbAccuracySummary } = await import('../buildMlbAccuracySummary');
    const result = await buildMlbAccuracySummary();
    expect(result.verifiedN).toBe(0);
    expect(result.accuracyRate).toBeNull();
    expect(result.brier).toBeNull();
  });

  it('schedule select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ scheduleError: { message: 'boom' } });
    const { buildMlbAccuracySummary } = await import('../buildMlbAccuracySummary');
    await expect(buildMlbAccuracySummary()).rejects.toThrow();
  });

  it('home_win_prob + 실제 스코어로 정확도/Brier 를 derive', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', game_date: '2026-08-01', home_score: 5, away_score: 2 },
        { external_game_id: 'g2', game_date: '2026-08-02', home_score: 1, away_score: 3 },
      ],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.7 }, // 홈 예측, 홈 승 → 적중
        { external_game_id: 'g2', home_win_prob: 0.7 }, // 홈 예측, 원정 승 → 오답
      ],
    });
    const { buildMlbAccuracySummary } = await import('../buildMlbAccuracySummary');
    const result = await buildMlbAccuracySummary();
    expect(result.verifiedN).toBe(2);
    expect(result.correctN).toBe(1);
    expect(result.accuracyRate).toBe(0.5);
    expect(result.brier).toBeCloseTo(((0.7 - 1) ** 2 + (0.7 - 0) ** 2) / 2, 5);
    expect(result.confidenceTiers.length).toBe(3);
    // avgConf(0.7) - acc(0.5) = 0.2 (/mlb/accuracy 보정 오차 카드 정합, wave-626)
    expect(result.gap).toBeCloseTo(0.2, 5);
    // 둘 다 home_win_prob=0.7 → winnerProb=0.7 → 70-80% bucket 에 2건 모두 (WinnerProbBucketChart parity, cycle 2180)
    const bucket7080 = result.winnerProbBuckets.find((b) => b.label === '70-80%');
    expect(bucket7080?.n).toBe(2);
    expect(bucket7080?.hits).toBe(1);
  });

  it('rollingAccuracy — 오늘 기준 windowDays 안 n>=3 누적 시 non-null (RollingAccuracyChart parity, cycle 2181)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', game_date: today, home_score: 5, away_score: 2 },
        { external_game_id: 'g2', game_date: today, home_score: 1, away_score: 3 },
        { external_game_id: 'g3', game_date: today, home_score: 4, away_score: 0 },
      ],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.7 },
        { external_game_id: 'g2', home_win_prob: 0.7 },
        { external_game_id: 'g3', home_win_prob: 0.6 },
      ],
    });
    const { buildMlbAccuracySummary } = await import('../buildMlbAccuracySummary');
    const result = await buildMlbAccuracySummary();
    const todayPoint = result.rollingAccuracy[result.rollingAccuracy.length - 1];
    expect(todayPoint?.windowN).toBe(3);
    expect(todayPoint?.windowAccuracy).toBeCloseTo(2 / 3, 5);
  });

  it('brierTrend — 3주+ 데이터 있으면 주차별 Brier point 산출 (BrierTrendChart parity, cycle 2186)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', game_date: '2026-07-01', home_score: 5, away_score: 2 },
        { external_game_id: 'g2', game_date: '2026-07-08', home_score: 1, away_score: 3 },
        { external_game_id: 'g3', game_date: '2026-07-15', home_score: 4, away_score: 0 },
      ],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.7 },
        { external_game_id: 'g2', home_win_prob: 0.7 },
        { external_game_id: 'g3', home_win_prob: 0.6 },
      ],
    });
    const { buildMlbAccuracySummary } = await import('../buildMlbAccuracySummary');
    const result = await buildMlbAccuracySummary();
    expect(result.brierTrend.length).toBeGreaterThanOrEqual(3);
    expect(result.brierTrend.every((p) => p.scoringRule === 'all' || p.n > 0)).toBe(true);
  });

  it('scoringRuleDayHeatmap — MLB rows 는 scoring_rule 없어 all aggregate 만 채워짐 (ScoringRuleDayHeatmap parity, cycle 2189)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', game_date: '2026-08-01', home_score: 5, away_score: 2 },
        { external_game_id: 'g2', game_date: '2026-08-02', home_score: 1, away_score: 3 },
        { external_game_id: 'g3', game_date: '2026-08-03', home_score: 4, away_score: 0 },
      ],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.7 },
        { external_game_id: 'g2', home_win_prob: 0.7 },
        { external_game_id: 'g3', home_win_prob: 0.6 },
      ],
    });
    const { buildMlbAccuracySummary } = await import('../buildMlbAccuracySummary');
    const result = await buildMlbAccuracySummary();
    expect(result.scoringRuleDayHeatmap.length).toBeGreaterThan(0);
    const allCellsN = result.scoringRuleDayHeatmap
      .filter((c) => c.scoringRule === 'all')
      .reduce((sum, c) => sum + c.n, 0);
    expect(allCellsN).toBe(3);
    const nonAllCellsN = result.scoringRuleDayHeatmap
      .filter((c) => c.scoringRule !== 'all')
      .reduce((sum, c) => sum + c.n, 0);
    expect(nonAllCellsN).toBe(0);
  });

  it('cohortWeekHeatmap — MLB rows 는 scoring_rule 없어 all aggregate 만 채워짐 (CohortComparisonHeatmap parity, cycle 2193)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', game_date: '2026-08-01', home_score: 5, away_score: 2 },
        { external_game_id: 'g2', game_date: '2026-08-02', home_score: 1, away_score: 3 },
        { external_game_id: 'g3', game_date: '2026-08-03', home_score: 4, away_score: 0 },
      ],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.7 },
        { external_game_id: 'g2', home_win_prob: 0.7 },
        { external_game_id: 'g3', home_win_prob: 0.6 },
      ],
    });
    const { buildMlbAccuracySummary } = await import('../buildMlbAccuracySummary');
    const result = await buildMlbAccuracySummary();
    expect(result.cohortWeekHeatmap.length).toBeGreaterThan(0);
    const allCellsN = result.cohortWeekHeatmap
      .filter((c) => c.scoringRule === 'all')
      .reduce((sum, c) => sum + c.n, 0);
    expect(allCellsN).toBe(3);
    const nonAllCellsN = result.cohortWeekHeatmap
      .filter((c) => c.scoringRule !== 'all')
      .reduce((sum, c) => sum + c.n, 0);
    expect(nonAllCellsN).toBe(0);
  });

  it('예측 없는 경기는 skip (external_game_id 매칭 없음)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', game_date: '2026-08-01', home_score: 5, away_score: 2 }],
      preds: [],
    });
    const { buildMlbAccuracySummary } = await import('../buildMlbAccuracySummary');
    const result = await buildMlbAccuracySummary();
    expect(result.verifiedN).toBe(0);
  });

  it("locale='en' 이면 confidenceTiers label 이 영문 (EN 허브 parity)", async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', game_date: '2026-08-01', home_score: 5, away_score: 2 }],
      preds: [{ external_game_id: 'g1', home_win_prob: 0.7 }],
    });
    const { buildMlbAccuracySummary } = await import('../buildMlbAccuracySummary');
    const result = await buildMlbAccuracySummary('en');
    expect(result.confidenceTiers.map((t) => t.label)).toEqual([
      'Low confidence',
      'Medium confidence',
      'High confidence',
    ]);
  });
});
