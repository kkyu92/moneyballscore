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
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockResolvedValue({
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

describe('getMlbMonthHeatmap', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('스케줄 0건이면 빈 Map', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { getMlbMonthHeatmap } = await import('../buildMlbCalendarHeatmap');
    const result = await getMlbMonthHeatmap('2026-08-01', '2026-08-31');
    expect(result.size).toBe(0);
  });

  it('스케줄 select 실패 시 throw (silent drift 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ scheduleError: { message: 'boom' } });
    const { getMlbMonthHeatmap } = await import('../buildMlbCalendarHeatmap');
    await expect(getMlbMonthHeatmap('2026-08-01', '2026-08-31')).rejects.toThrow();
  });

  it('final 경기는 verified/correct 집계, 미완료 경기는 total 만 증가', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', game_date: '2026-08-01', status: 'final', home_score: 5, away_score: 2 },
        { external_game_id: 'g2', game_date: '2026-08-01', status: 'final', home_score: 1, away_score: 3 },
        { external_game_id: 'g3', game_date: '2026-08-02', status: 'scheduled', home_score: null, away_score: null },
      ],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.7 }, // 홈 예측, 홈 승 → 적중
        { external_game_id: 'g2', home_win_prob: 0.7 }, // 홈 예측, 원정 승 → 오답
        { external_game_id: 'g3', home_win_prob: 0.6 }, // 아직 결과 없음
      ],
    });
    const { getMlbMonthHeatmap } = await import('../buildMlbCalendarHeatmap');
    const result = await getMlbMonthHeatmap('2026-08-01', '2026-08-31');

    const day1 = result.get('2026-08-01');
    expect(day1).toEqual({ total: 2, verified: 2, correct: 1 });

    const day2 = result.get('2026-08-02');
    expect(day2).toEqual({ total: 1, verified: 0, correct: 0 });
  });

  it('예측 없는 경기는 total 에도 안 잡힘 (external_game_id 매칭 없음)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', game_date: '2026-08-01', status: 'final', home_score: 5, away_score: 2 },
      ],
      preds: [],
    });
    const { getMlbMonthHeatmap } = await import('../buildMlbCalendarHeatmap');
    const result = await getMlbMonthHeatmap('2026-08-01', '2026-08-31');
    expect(result.size).toBe(0);
  });
});
