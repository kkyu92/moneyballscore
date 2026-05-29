import { afterEach, describe, expect, it, vi } from 'vitest';

// Plan B Tier C+D Task 3 — buildMlbPlayerProfile.ts silent drift family 회귀 가드.

interface SupabaseMockOptions {
  playerError?: { message: string } | null;
  playerRow?: unknown;
  batterError?: { message: string } | null;
  batterRows?: unknown[];
  pitcherError?: { message: string } | null;
  pitcherRows?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const playersBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.playerError ? null : (opts.playerRow ?? null),
      error: opts.playerError ?? null,
    }),
  };
  const batterBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: opts.batterError ? null : (opts.batterRows ?? []),
      error: opts.batterError ?? null,
    }),
  };
  const pitcherBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: opts.pitcherError ? null : (opts.pitcherRows ?? []),
      error: opts.pitcherError ?? null,
    }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === 'players') return playersBuilder;
      if (table === 'batter_stats') return batterBuilder;
      if (table === 'pitcher_stats') return pitcherBuilder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

describe('buildMlbPlayerProfile — silent drift family `.error` 미체크 회귀 가드', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('players select error → assertSelectOk throw', async () => {
    supabaseMock = makeSupabaseMock({
      playerError: { message: 'connection refused' },
    });
    const { buildMlbPlayerProfile } = await import('../buildMlbPlayerProfile');
    await expect(buildMlbPlayerProfile(1)).rejects.toThrow(
      /buildMlbPlayerProfile players select failed: connection refused/,
    );
  });

  it('player row 부재 → null 반환', async () => {
    supabaseMock = makeSupabaseMock({ playerRow: null });
    const { buildMlbPlayerProfile } = await import('../buildMlbPlayerProfile');
    const result = await buildMlbPlayerProfile(9999);
    expect(result).toBeNull();
  });

  it('hitter rows 정합 + team meta hydration', async () => {
    supabaseMock = makeSupabaseMock({
      playerRow: {
        id: 1,
        external_id: '545361',
        name_ko: '오타니 쇼헤이',
        name_en: 'Shohei Ohtani',
        position: 'DH',
        throws: 'R',
        bats: 'L',
        is_active: true,
        team: { code: 'LAD' },
      },
      batterRows: [
        {
          season: 2024,
          games: 159,
          pa: 731,
          hits: 197,
          hr: 54,
          rbi: 130,
          avg: 0.310,
          obp: 0.390,
          slg: 0.646,
          ops: 1.036,
          woba: 0.421,
          iso: 0.336,
          wrc_plus: 188,
          hard_hit_pct: 0.524,
          war: 9.2,
        },
      ],
    });
    const { buildMlbPlayerProfile } = await import('../buildMlbPlayerProfile');
    const profile = await buildMlbPlayerProfile(1);
    expect(profile).toBeTruthy();
    expect(profile?.nameEn).toBe('Shohei Ohtani');
    expect(profile?.teamCode).toBe('LAD');
    expect(profile?.teamName).toBe('Dodgers');
    expect(profile?.hitterStats).toHaveLength(1);
    expect(profile?.hitterStats[0].hr).toBe(54);
    expect(profile?.hitterStats[0].wrcPlus).toBe(188);
    expect(profile?.pitcherStats).toEqual([]);
  });

  it('batter_stats select error → assertSelectOk throw', async () => {
    supabaseMock = makeSupabaseMock({
      playerRow: {
        id: 1,
        external_id: null,
        name_ko: 'test',
        name_en: null,
        position: 'P',
        throws: null,
        bats: null,
        is_active: true,
        team: { code: 'LAD' },
      },
      batterError: { message: 'permission denied' },
    });
    const { buildMlbPlayerProfile } = await import('../buildMlbPlayerProfile');
    await expect(buildMlbPlayerProfile(1)).rejects.toThrow(
      /buildMlbPlayerProfile batter_stats select failed: permission denied/,
    );
  });

  it('pitcher_stats select error → assertSelectOk throw', async () => {
    supabaseMock = makeSupabaseMock({
      playerRow: {
        id: 1,
        external_id: null,
        name_ko: 'test',
        name_en: null,
        position: 'P',
        throws: null,
        bats: null,
        is_active: true,
        team: { code: 'LAD' },
      },
      batterRows: [],
      pitcherError: { message: 'syntax error' },
    });
    const { buildMlbPlayerProfile } = await import('../buildMlbPlayerProfile');
    await expect(buildMlbPlayerProfile(1)).rejects.toThrow(
      /buildMlbPlayerProfile pitcher_stats select failed: syntax error/,
    );
  });
});
