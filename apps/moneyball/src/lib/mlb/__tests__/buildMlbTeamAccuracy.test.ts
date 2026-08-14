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

describe('buildAllMlbTeamAccuracy', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('final 경기 없으면 빈 배열', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { buildAllMlbTeamAccuracy } = await import('../buildMlbTeamAccuracy');
    const result = await buildAllMlbTeamAccuracy();
    expect(result).toEqual([]);
  });

  it('schedule select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ scheduleError: { message: 'boom' } });
    const { buildAllMlbTeamAccuracy } = await import('../buildMlbTeamAccuracy');
    await expect(buildAllMlbTeamAccuracy()).rejects.toThrow();
  });

  it('홈/원정 양팀에 동일 판정을 집계 (경기 관련 팀 기준, KBO 정합)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 },
        { external_game_id: 'g2', home_team_code: 'BOS', away_team_code: 'NYM', home_score: 1, away_score: 3 },
      ],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.7 }, // 홈 예측, 홈 승 → 적중
        { external_game_id: 'g2', home_win_prob: 0.7 }, // 홈 예측, 원정 승 → 오답
      ],
    });
    const { buildAllMlbTeamAccuracy } = await import('../buildMlbTeamAccuracy');
    const result = await buildAllMlbTeamAccuracy();
    const byCode = new Map(result.map((r) => [r.teamCode, r]));

    expect(byCode.get('NYY')).toEqual({ teamCode: 'NYY', verifiedN: 1, correctN: 1, accuracyRate: 1 });
    expect(byCode.get('BOS')).toEqual({ teamCode: 'BOS', verifiedN: 2, correctN: 1, accuracyRate: 0.5 });
    expect(byCode.get('NYM')).toEqual({ teamCode: 'NYM', verifiedN: 1, correctN: 0, accuracyRate: 0 });
  });

  it('예측 없는 경기는 skip (external_game_id 매칭 없음)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 }],
      preds: [],
    });
    const { buildAllMlbTeamAccuracy } = await import('../buildMlbTeamAccuracy');
    const result = await buildAllMlbTeamAccuracy();
    expect(result).toEqual([]);
  });
});
