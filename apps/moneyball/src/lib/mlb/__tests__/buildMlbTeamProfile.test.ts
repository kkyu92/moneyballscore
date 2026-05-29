import { afterEach, describe, expect, it, vi } from 'vitest';

// Plan B Tier C+D Task 3 — buildMlbTeamProfile.ts 의 supabase select `.error` 미체크
// silent drift family 회귀 차단. KBO buildTeamProfile.test.ts pattern 정합.

const LAD_ID = 50;

interface SupabaseMockOptions {
  teamsError?: { message: string } | null;
  gamesError?: { message: string } | null;
  teamRow?: { id: number } | null;
  games?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const teamsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.teamsError ? null : (opts.teamRow ?? { id: LAD_ID }),
      error: opts.teamsError ?? null,
    }),
  };
  const gamesBuilder = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(function (this: typeof gamesBuilder) {
      return gamesBuilder;
    }),
  };
  // games chain: .or(...).eq(...).eq(...) → resolve at last .eq
  let eqCount = 0;
  gamesBuilder.eq = vi.fn().mockImplementation(() => {
    eqCount += 1;
    if (eqCount >= 2) {
      return Promise.resolve({
        data: opts.gamesError ? null : (opts.games ?? []),
        error: opts.gamesError ?? null,
      });
    }
    return gamesBuilder;
  });

  return {
    from: vi.fn((table: string) => {
      if (table === 'teams') return teamsBuilder;
      if (table === 'games') return gamesBuilder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

describe('buildMlbTeamProfile — silent drift family `.error` 미체크 회귀 가드', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('알려지지 않은 코드 → null', async () => {
    supabaseMock = makeSupabaseMock();
    const { buildMlbTeamProfile } = await import('../buildMlbTeamProfile');
    // @ts-expect-error 의도적 invalid 코드 테스트
    const result = await buildMlbTeamProfile('XXX');
    expect(result).toBeNull();
  });

  it('teams select error → assertSelectOk throw', async () => {
    supabaseMock = makeSupabaseMock({
      teamsError: { message: 'connection refused' },
    });
    const { buildMlbTeamProfile } = await import('../buildMlbTeamProfile');
    await expect(buildMlbTeamProfile('LAD')).rejects.toThrow(
      /buildMlbTeamProfile teams select failed: connection refused/,
    );
  });

  it('games select error → assertSelectOk throw', async () => {
    supabaseMock = makeSupabaseMock({
      gamesError: { message: 'syntax error at or near and' },
    });
    const { buildMlbTeamProfile } = await import('../buildMlbTeamProfile');
    await expect(buildMlbTeamProfile('LAD')).rejects.toThrow(
      /buildMlbTeamProfile games select failed: syntax error/,
    );
  });

  it('teams row 부재 → 빈 프로필 + meta 보존', async () => {
    supabaseMock = makeSupabaseMock({ teamRow: null });
    const { buildMlbTeamProfile } = await import('../buildMlbTeamProfile');
    const profile = await buildMlbTeamProfile('LAD');
    expect(profile).toBeTruthy();
    expect(profile?.code).toBe('LAD');
    expect(profile?.name).toBe('Los Angeles Dodgers');
    expect(profile?.league).toBe('NL');
    expect(profile?.division).toBe('West');
    expect(profile?.predictedGames).toBe(0);
    expect(profile?.accuracyRate).toBeNull();
    expect(profile?.recentGames).toEqual([]);
  });

  it('games rows → 14 factor 집계 + accuracy 계산', async () => {
    supabaseMock = makeSupabaseMock({
      games: [
        {
          id: 1,
          game_date: '2026-05-20',
          status: 'final',
          home_score: 5,
          away_score: 3,
          home_team_id: LAD_ID,
          away_team_id: 99,
          home_team: { code: 'LAD' },
          away_team: { code: 'SFG' },
          predictions: [
            {
              confidence: 0.62,
              is_correct: true,
              predicted_winner: LAD_ID,
              home_sp_fip: 3.5,
              away_sp_fip: 4.0,
              home_lineup_woba: 0.330,
              away_lineup_woba: 0.310,
              home_bullpen_fip: 3.2,
              away_bullpen_fip: 3.8,
              home_recent_form: 0.6,
              away_recent_form: 0.4,
              home_elo: 1550,
              away_elo: 1490,
              home_lineup_xwoba: 0.340,
              away_lineup_xwoba: 0.320,
              home_lineup_barrel_pct: 9.5,
              away_lineup_barrel_pct: 8.0,
            },
          ],
        },
        {
          id: 2,
          game_date: '2026-05-22',
          status: 'final',
          home_score: 2,
          away_score: 4,
          home_team_id: 99,
          away_team_id: LAD_ID,
          home_team: { code: 'SFG' },
          away_team: { code: 'LAD' },
          predictions: [
            {
              confidence: 0.55,
              is_correct: true,
              predicted_winner: LAD_ID,
              home_sp_fip: 4.2,
              away_sp_fip: 3.3,
              home_lineup_woba: 0.305,
              away_lineup_woba: 0.335,
              home_bullpen_fip: 4.0,
              away_bullpen_fip: 3.1,
              home_recent_form: 0.45,
              away_recent_form: 0.65,
              home_elo: 1485,
              away_elo: 1560,
              home_lineup_xwoba: 0.315,
              away_lineup_xwoba: 0.345,
              home_lineup_barrel_pct: 7.8,
              away_lineup_barrel_pct: 10.0,
            },
          ],
        },
      ],
    });
    const { buildMlbTeamProfile } = await import('../buildMlbTeamProfile');
    const profile = await buildMlbTeamProfile('LAD');
    expect(profile).toBeTruthy();
    expect(profile?.predictedGames).toBe(2);
    expect(profile?.predictedWins).toBe(2);
    expect(profile?.predictedWinRate).toBe(1);
    expect(profile?.verifiedN).toBe(2);
    expect(profile?.correctN).toBe(2);
    expect(profile?.accuracyRate).toBe(1);

    // factor averages — LAD's home_sp_fip(3.5) + away_sp_fip(3.3) avg = 3.4
    expect(profile?.factorAverages.spFip).toBeCloseTo(3.4, 3);
    expect(profile?.factorAverages.lineupWoba).toBeCloseTo(0.3325, 3);
    expect(profile?.factorAverages.elo).toBeCloseTo(1555, 0);
    expect(profile?.factorAverages.lineupXwoba).toBeCloseTo(0.3425, 3);
    expect(profile?.factorAverages.lineupBarrelPct).toBeCloseTo(9.75, 2);

    // recent games sorted desc by date
    expect(profile?.recentGames[0].gameDate).toBe('2026-05-22');
    expect(profile?.recentGames[0].opponentCode).toBe('SFG');
    expect(profile?.recentGames[0].isHome).toBe(false);
  });
});
