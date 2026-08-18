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

describe('buildMlbFactorAccuracy', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('final 경기 없으면 빈 배열', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { buildMlbFactorAccuracy } = await import('../buildMlbFactorAccuracy');
    const result = await buildMlbFactorAccuracy();
    expect(result).toEqual([]);
  });

  it('schedule select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ scheduleError: { message: 'boom' } });
    const { buildMlbFactorAccuracy } = await import('../buildMlbFactorAccuracy');
    await expect(buildMlbFactorAccuracy()).rejects.toThrow();
  });

  it('lower-is-better(FIP) 팩터는 낮은 쪽 팀을 우세로 판정', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', home_score: 5, away_score: 2 }, // 홈 승
        { external_game_id: 'g2', home_score: 1, away_score: 3 }, // 원정 승
      ],
      preds: [
        // g1: 홈 sp_fip 낮음(3.0 < 4.0) → 팩터가 홈 우세 예측, 실제 홈 승 → 적중
        { external_game_id: 'g1', home_win_prob: 0.6, home_sp_fip: 3.0, away_sp_fip: 4.0 },
        // g2: 홈 sp_fip 낮음(3.5 < 4.5) → 팩터가 홈 우세 예측, 실제 원정 승 → 오답
        { external_game_id: 'g2', home_win_prob: 0.55, home_sp_fip: 3.5, away_sp_fip: 4.5 },
      ],
    });
    const { buildMlbFactorAccuracy } = await import('../buildMlbFactorAccuracy');
    const result = await buildMlbFactorAccuracy();
    const spFip = result.find((r) => r.key === 'sp_fip');
    expect(spFip).toBeDefined();
    expect(spFip!.n).toBe(2);
    expect(spFip!.accuracy).toBe(0.5);
    expect(spFip!.homeN).toBe(2);
    expect(spFip!.awayN).toBe(0);
  });

  it('higher-is-better(wOBA) 팩터는 높은 쪽 팀을 우세로 판정', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', home_score: 5, away_score: 2 }],
      preds: [
        // 홈 woba 높음(.330 > .300) → 팩터가 홈 우세 예측, 실제 홈 승 → 적중
        { external_game_id: 'g1', home_win_prob: 0.6, home_lineup_woba: 0.33, away_lineup_woba: 0.3 },
      ],
    });
    const { buildMlbFactorAccuracy } = await import('../buildMlbFactorAccuracy');
    const result = await buildMlbFactorAccuracy();
    const woba = result.find((r) => r.key === 'lineup_woba');
    expect(woba!.n).toBe(1);
    expect(woba!.accuracy).toBe(1);
    expect(woba!.homeN).toBe(1);
  });

  it('home===away 이거나 null 인 팩터 값은 skip (n=0 → filter 로 제외)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', home_score: 5, away_score: 2 }],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.6, home_sp_fip: 3.5, away_sp_fip: 3.5, home_war_total: null, away_war_total: null },
      ],
    });
    const { buildMlbFactorAccuracy } = await import('../buildMlbFactorAccuracy');
    const result = await buildMlbFactorAccuracy();
    expect(result.find((r) => r.key === 'sp_fip')).toBeUndefined();
    expect(result.find((r) => r.key === 'war')).toBeUndefined();
  });

  it('actualHomeWin derive 불가(final 스코어 없음) 시 skip', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', home_score: null, away_score: null }],
      preds: [{ external_game_id: 'g1', home_win_prob: 0.6, home_sp_fip: 3.0, away_sp_fip: 4.0 }],
    });
    const { buildMlbFactorAccuracy } = await import('../buildMlbFactorAccuracy');
    const result = await buildMlbFactorAccuracy();
    expect(result).toEqual([]);
  });

  it('locale=en 이면 영어 라벨 사용', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', home_score: 5, away_score: 2 }],
      preds: [{ external_game_id: 'g1', home_win_prob: 0.6, home_sp_fip: 3.0, away_sp_fip: 4.0 }],
    });
    const { buildMlbFactorAccuracy } = await import('../buildMlbFactorAccuracy');
    const result = await buildMlbFactorAccuracy('en');
    expect(result.find((r) => r.key === 'sp_fip')?.label).toBe('Starter FIP');
  });

  it('결과는 accuracy 내림차순 정렬', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', home_score: 5, away_score: 2 },
        { external_game_id: 'g2', home_score: 5, away_score: 2 },
      ],
      preds: [
        // sp_fip: 적중 (accuracy 1.0)
        { external_game_id: 'g1', home_win_prob: 0.6, home_sp_fip: 3.0, away_sp_fip: 4.0, home_war_total: 1, away_war_total: 5 },
        // war: 오답 (accuracy 0.0, 홈 war 낮은데 실제 홈 승 → war 는 원정 우세 예측했었음)
        { external_game_id: 'g2', home_win_prob: 0.6, home_sp_fip: 3.0, away_sp_fip: 4.0, home_war_total: 1, away_war_total: 5 },
      ],
    });
    const { buildMlbFactorAccuracy } = await import('../buildMlbFactorAccuracy');
    const result = await buildMlbFactorAccuracy();
    const spFipIdx = result.findIndex((r) => r.key === 'sp_fip');
    const warIdx = result.findIndex((r) => r.key === 'war');
    expect(spFipIdx).toBeLessThan(warIdx);
  });
});
