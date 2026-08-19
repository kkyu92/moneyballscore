import { afterEach, describe, expect, it, vi } from 'vitest';

interface SupabaseMockOptions {
  error?: { message: string } | null;
  schedule?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const scheduleBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve({
        data: opts.error ? null : (opts.schedule ?? []),
        error: opts.error ?? null,
      }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === 'mlb_schedule') return scheduleBuilder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

describe('buildMlbDivisionStandings', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('스케줄 0건이면 전 팀 0-0, gamesBehind 0 (1위만 null)', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { buildMlbDivisionStandings } = await import('../buildMlbStandings');
    const result = await buildMlbDivisionStandings();
    const alEast = result.AL.East;
    expect(alEast).toHaveLength(5);
    expect(alEast[0].gamesBehind).toBeNull();
    expect(alEast.every((r) => r.wins === 0 && r.losses === 0)).toBe(true);
  });

  it('select 실패 시 throw (silent drift 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ error: { message: 'boom' } });
    const { buildMlbDivisionStandings } = await import('../buildMlbStandings');
    await expect(buildMlbDivisionStandings()).rejects.toThrow();
  });

  it('final 경기만 집계 + 승패 정렬 + GB 계산 (BAL/NYY 예시, AL East)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        // NYY 3승 (홈2, 원정1)
        { home_team_code: 'NYY', away_team_code: 'BAL', home_score: 5, away_score: 2 },
        { home_team_code: 'NYY', away_team_code: 'BOS', home_score: 4, away_score: 3 },
        { home_team_code: 'TOR', away_team_code: 'NYY', home_score: 1, away_score: 6 },
        // BAL 1승 1패
        { home_team_code: 'BAL', away_team_code: 'TBR', home_score: 3, away_score: 1 },
      ],
    });
    const { buildMlbDivisionStandings } = await import('../buildMlbStandings');
    const result = await buildMlbDivisionStandings();
    const alEast = result.AL.East;

    const nyy = alEast.find((r) => r.teamCode === 'NYY')!;
    const bal = alEast.find((r) => r.teamCode === 'BAL')!;
    expect(nyy.wins).toBe(3);
    expect(nyy.losses).toBe(0);
    expect(nyy.gamesBehind).toBeNull();
    expect(bal.wins).toBe(1);
    expect(bal.losses).toBe(1);
    expect(bal.gamesBehind).toBeCloseTo(1.5, 5);
    // 정렬: winPct 내림차순 — NYY(1.000) 가 1위
    expect(alEast[0].teamCode).toBe('NYY');
  });

  it('StatsAPI alias 코드(TB/CWS 등) 를 canonical 팀에 정합', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ home_team_code: 'TB', away_team_code: 'NYY', home_score: 2, away_score: 1 }],
    });
    const { buildMlbDivisionStandings } = await import('../buildMlbStandings');
    const result = await buildMlbDivisionStandings();
    const tbr = result.AL.East.find((r) => r.teamCode === 'TBR')!;
    expect(tbr.wins).toBe(1);
  });

  it('동점(0-0 무효) 은 집계 제외', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ home_team_code: 'NYY', away_team_code: 'BOS', home_score: 3, away_score: 3 }],
    });
    const { buildMlbDivisionStandings } = await import('../buildMlbStandings');
    const result = await buildMlbDivisionStandings();
    const nyy = result.AL.East.find((r) => r.teamCode === 'NYY')!;
    expect(nyy.wins + nyy.losses).toBe(0);
  });
});
