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
    in: vi.fn().mockResolvedValue({
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
