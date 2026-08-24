import { afterEach, describe, expect, it, vi } from 'vitest';

interface SupabaseMockOptions {
  pollError?: { message: string } | null;
  scheduleError?: { message: string } | null;
  predsError?: { message: string } | null;
  poll?: unknown[];
  schedule?: unknown[];
  preds?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const pollBuilder = {
    select: vi.fn().mockResolvedValue({
      data: opts.pollError ? null : (opts.poll ?? []),
      error: opts.pollError ?? null,
    }),
  };
  const scheduleBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve({
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
      if (table === 'mlb_pick_poll_events') return pollBuilder;
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

describe('buildMlbCommunityVsAI', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('poll 없으면 빈 결과 (조회 자체를 스킵)', async () => {
    supabaseMock = makeSupabaseMock({ poll: [] });
    const { buildMlbCommunityVsAI } = await import('../buildMlbCommunityAccuracy');
    const result = await buildMlbCommunityVsAI();
    expect(result.communityGames).toBe(0);
    expect(result.communityAccuracy).toBeNull();
  });

  it('poll select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ pollError: { message: 'boom' } });
    const { buildMlbCommunityVsAI } = await import('../buildMlbCommunityAccuracy');
    await expect(buildMlbCommunityVsAI()).rejects.toThrow();
  });

  it('final 경기 없으면 빈 결과', async () => {
    supabaseMock = makeSupabaseMock({
      poll: [
        { external_game_id: 'g1', pick: 'home' },
        { external_game_id: 'g1', pick: 'home' },
        { external_game_id: 'g1', pick: 'away' },
      ],
      schedule: [],
    });
    const { buildMlbCommunityVsAI } = await import('../buildMlbCommunityAccuracy');
    const result = await buildMlbCommunityVsAI();
    expect(result.communityGames).toBe(0);
  });

  it('poll + final 경기 + 예측을 합쳐 커뮤니티/AI 정확도를 산출', async () => {
    supabaseMock = makeSupabaseMock({
      poll: [
        { external_game_id: 'g1', pick: 'home' },
        { external_game_id: 'g1', pick: 'home' },
        { external_game_id: 'g1', pick: 'away' },
      ],
      schedule: [{ external_game_id: 'g1', home_score: 5, away_score: 2 }],
      preds: [{ external_game_id: 'g1', home_win_prob: 0.6 }],
    });
    const { buildMlbCommunityVsAI } = await import('../buildMlbCommunityAccuracy');
    const result = await buildMlbCommunityVsAI();
    expect(result.communityGames).toBe(1);
    expect(result.communityCorrect).toBe(1);
    expect(result.aiGamesWithPoll).toBe(1);
    expect(result.aiCorrectWithPoll).toBe(1);
  });
});
