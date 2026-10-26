import { afterEach, describe, expect, it, vi } from 'vitest';

interface SupabaseMockOptions {
  preError?: { message: string } | null;
  postError?: { message: string } | null;
  preRows?: unknown[];
  postRows?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const preBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: opts.preError ? null : (opts.preRows ?? []),
      error: opts.preError ?? null,
    }),
  };
  const postBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: opts.postError ? null : (opts.postRows ?? []),
      error: opts.postError ?? null,
    }),
  };
  let callCount = 0;
  return {
    from: vi.fn((table: string) => {
      if (table !== 'predictions') throw new Error(`unexpected table: ${table}`);
      callCount += 1;
      return callCount === 1 ? preBuilder : postBuilder;
    }),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

function preRow(overrides: Record<string, unknown> = {}) {
  return {
    game_id: 1,
    reasoning: { homeWinProb: 0.7 },
    predicted_winner_team: { code: 'LG' },
    game: {
      id: 1,
      game_date: '2026-08-11',
      status: 'final',
      home_score: 2,
      away_score: 5,
      home_team: { code: 'LG' },
      away_team: { code: 'OB' },
      winner: { code: 'OB' },
    },
    ...overrides,
  };
}

describe('buildMissReport', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('pre_game rows 없으면 빈 배열, post_game select 자체를 skip', async () => {
    supabaseMock = makeSupabaseMock({ preRows: [] });
    const { buildMissReport } = await import('../buildMissReport');
    const items = await buildMissReport();
    expect(items).toEqual([]);
  });

  it('pre_game select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ preError: { message: 'boom' } });
    const { buildMissReport } = await import('../buildMissReport');
    await expect(buildMissReport()).rejects.toThrow();
  });

  it('post_game select 실패 시 throw', async () => {
    supabaseMock = makeSupabaseMock({
      preRows: [preRow()],
      postError: { message: 'boom' },
    });
    const { buildMissReport } = await import('../buildMissReport');
    await expect(buildMissReport()).rejects.toThrow();
  });

  it('tossup(winnerProb < lean) 은 제외', async () => {
    supabaseMock = makeSupabaseMock({
      preRows: [preRow({ reasoning: { homeWinProb: 0.52 } })],
    });
    const { buildMissReport } = await import('../buildMissReport');
    const items = await buildMissReport();
    expect(items).toEqual([]);
  });

  it('status != final 인 경기는 제외', async () => {
    supabaseMock = makeSupabaseMock({
      preRows: [preRow({ game: { ...preRow().game, status: 'scheduled' } })],
    });
    const { buildMissReport } = await import('../buildMissReport');
    const items = await buildMissReport();
    expect(items).toEqual([]);
  });

  it('winnerProb 내림차순 정렬 + post_game reasoning 병합 (factorErrors/judgePostview/missedBy)', async () => {
    supabaseMock = makeSupabaseMock({
      preRows: [
        preRow({ game_id: 1, reasoning: { homeWinProb: 0.7 } }),
        preRow({
          game_id: 2,
          reasoning: { homeWinProb: 0.85 },
          game: { ...preRow().game, id: 2, game_date: '2026-08-10' },
        }),
      ],
      postRows: [
        {
          game_id: 1,
          reasoning: {
            judgeReasoning: '불펜 붕괴',
            factorErrors: [{ factor: 'bullpen_fip', predictedBias: 0.1, diagnosis: 'overweight' }],
            homePostview: { missedBy: '불펜' },
          },
        },
      ],
    });
    const { buildMissReport } = await import('../buildMissReport');
    const items = await buildMissReport();
    expect(items.length).toBe(2);
    // winnerProb 내림차순 -> game_id=2(0.85) 먼저
    expect(items[0].gameId).toBe(2);
    expect(items[1].gameId).toBe(1);
    expect(items[1].judgePostview).toBe('불펜 붕괴');
    expect(items[1].factorErrors[0].factor).toBe('bullpen_fip');
    expect(items[1].missedBy.home).toBe('불펜');
    // post_game row 없는 game_id=2 는 기본값(빈 factorErrors, null judgePostview)
    expect(items[0].judgePostview).toBeNull();
    expect(items[0].factorErrors).toEqual([]);
  });

  it('limit 옵션 — pre_game limit*6 fetch 후 클라이언트 측 limit 적용', async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      preRow({
        game_id: i,
        reasoning: { homeWinProb: 0.6 + i * 0.01 },
        game: { ...preRow().game, id: i, game_date: `2026-08-0${i + 1}` },
      }),
    );
    supabaseMock = makeSupabaseMock({ preRows: rows });
    const { buildMissReport } = await import('../buildMissReport');
    const items = await buildMissReport({ limit: 2 });
    expect(items.length).toBe(2);
    // 내림차순 정렬 — 가장 높은 winnerProb(0.64, i=4) 먼저
    expect(items[0].gameId).toBe(4);
  });
});
