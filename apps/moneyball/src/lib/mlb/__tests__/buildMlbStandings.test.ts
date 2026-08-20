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

describe('findMlbTeamDivisionRank', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1위 팀은 rank=1, gamesBehind=null', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ home_team_code: 'NYY', away_team_code: 'BAL', home_score: 5, away_score: 2 }],
    });
    const { buildMlbDivisionStandings, findMlbTeamDivisionRank } = await import('../buildMlbStandings');
    const standings = await buildMlbDivisionStandings();
    const rank = findMlbTeamDivisionRank(standings, 'AL', 'East', 'NYY');
    expect(rank).toEqual({ rank: 1, total: 5, gamesBehind: null });
  });

  it('2위 팀은 rank=2 + gamesBehind 실측치', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { home_team_code: 'NYY', away_team_code: 'BAL', home_score: 5, away_score: 2 },
        { home_team_code: 'NYY', away_team_code: 'BAL', home_score: 4, away_score: 3 },
        { home_team_code: 'BAL', away_team_code: 'TBR', home_score: 3, away_score: 1 },
      ],
    });
    const { buildMlbDivisionStandings, findMlbTeamDivisionRank } = await import('../buildMlbStandings');
    const standings = await buildMlbDivisionStandings();
    const rank = findMlbTeamDivisionRank(standings, 'AL', 'East', 'BAL');
    expect(rank?.rank).toBe(2);
    expect(rank?.total).toBe(5);
    expect(rank?.gamesBehind).toBeCloseTo(1.5, 5);
  });

  it('teamCode 가 해당 division 소속 아니면 null', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { buildMlbDivisionStandings, findMlbTeamDivisionRank } = await import('../buildMlbStandings');
    const standings = await buildMlbDivisionStandings();
    const rank = findMlbTeamDivisionRank(standings, 'AL', 'East', 'HOU');
    expect(rank).toBeNull();
  });
});

describe('buildMlbWildcardStandings', () => {
  function row(teamCode: string, wins: number, losses: number) {
    const total = wins + losses;
    return { teamCode, wins, losses, winPct: total > 0 ? wins / total : 0, gamesBehind: null };
  }

  it('division 1위 3팀 제외한 pool 을 승률 내림차순 정렬 + 컷오프/탈락 게이팅 magic number', async () => {
    const { buildMlbWildcardStandings } = await import('../buildMlbStandings');
    const nlZero = { East: [row('ATL', 0, 0)], Central: [row('CHC', 0, 0)], West: [row('LAD', 0, 0)] };
    const standings = {
      AL: {
        East: [row('NYY', 90, 50), row('BAL', 80, 60), row('TOR', 60, 80)],
        Central: [row('CLE', 85, 55), row('DET', 75, 65), row('KCR', 50, 90)],
        West: [row('HOU', 95, 45), row('SEA', 72, 68), row('TEX', 65, 75)],
      },
      NL: nlZero,
    } as never;

    const result = buildMlbWildcardStandings(standings);
    const al = result.AL;
    // pool = [BAL(.5714), DET(.5357), SEA(.5143), TEX(.4643), TOR(.4286), KCR(.3571)]
    expect(al.map((r) => r.teamCode)).toEqual(['BAL', 'DET', 'SEA', 'TEX', 'TOR', 'KCR']);

    // 컷오프(MLB_WILDCARD_COUNT=3번째) = SEA. 자기 자신 wcGamesBehind=0.
    const sea = al.find((r) => r.teamCode === 'SEA')!;
    expect(sea.wcGamesBehind).toBe(0);

    // BAL(컷오프보다 앞선 팀) = 음수(여유)
    const bal = al.find((r) => r.teamCode === 'BAL')!;
    expect(bal.wcGamesBehind).toBeCloseTo(-8, 5);

    // TEX(첫 탈락권) = 양수(추격)
    const tex = al.find((r) => r.teamCode === 'TEX')!;
    expect(tex.wcGamesBehind).toBeCloseTo(7, 5);
  });

  it('pool 이 전부 0-0 이면 magic number 계산 불가(leader<=chaser) → null 아님을 컷오프 게이팅으로 확인', async () => {
    const { buildMlbWildcardStandings } = await import('../buildMlbStandings');
    const zeroDivision = [row('A', 0, 0), row('B', 0, 0)];
    const standings = {
      AL: { East: zeroDivision, Central: zeroDivision, West: zeroDivision },
      NL: { East: zeroDivision, Central: zeroDivision, West: zeroDivision },
    } as never;
    const result = buildMlbWildcardStandings(standings);
    // 전부 0-0 이므로 pool 도 전부 0-0, 컷오프 자신도 wcGamesBehind=0
    expect(result.AL.every((r) => r.wcGamesBehind === 0)).toBe(true);
  });
});
