import { afterEach, describe, expect, it, vi } from 'vitest';

// Plan B Tier C+D Task 3 — buildMlbTeamProfile.ts 의 supabase select `.error` 미체크
// silent drift family 회귀 차단. KBO buildTeamProfile.test.ts pattern 정합.
//
// cycle 2066 fix (사례 22 후속) — `teams`/`games` FK 는 MLB row 가 0건이라 이 빌더가
// 항상 빈 프로필만 반환하던 버그를 `mlb_schedule`+`predictions`(external_game_id) 직접
// 조회로 교체. 본 테스트도 새 쿼리 shape 에 맞춰 재작성.

interface SupabaseMockOptions {
  scheduleError?: { message: string } | null;
  predsError?: { message: string } | null;
  statsError?: { message: string } | null;
  schedule?: unknown[];
  preds?: unknown[];
  stats?: unknown | null;
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const scheduleBuilder = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockResolvedValue({
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
  // battedBallProfile — mlb_team_stats(migration 044) 단건 조회 (.maybeSingle())
  const statsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.statsError ? null : (opts.stats ?? null),
      error: opts.statsError ?? null,
    }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === 'mlb_schedule') return scheduleBuilder;
      if (table === 'predictions') return predsBuilder;
      if (table === 'mlb_team_stats') return statsBuilder;
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

  it('mlb_schedule select error → assertSelectOk throw', async () => {
    supabaseMock = makeSupabaseMock({
      scheduleError: { message: 'connection refused' },
    });
    const { buildMlbTeamProfile } = await import('../buildMlbTeamProfile');
    await expect(buildMlbTeamProfile('LAD')).rejects.toThrow(
      /buildMlbTeamProfile mlb_schedule select failed: connection refused/,
    );
  });

  it('predictions select error → assertSelectOk throw', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          id: 1,
          external_game_id: '700001',
          game_date: '2026-05-20',
          status: 'final',
          home_score: 5,
          away_score: 3,
          home_team_code: 'LAD',
          away_team_code: 'SFG',
        },
      ],
      predsError: { message: 'syntax error at or near and' },
    });
    const { buildMlbTeamProfile } = await import('../buildMlbTeamProfile');
    await expect(buildMlbTeamProfile('LAD')).rejects.toThrow(
      /buildMlbTeamProfile predictions select failed: syntax error/,
    );
  });

  it('mlb_schedule 빈 rows → 빈 프로필 + meta 보존', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
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
    expect(profile?.streak).toBeNull();
    expect(profile?.avgMargin).toBeNull();
    expect(profile?.blowout).toBeNull();
    expect(profile?.closeGame).toBeNull();
    expect(profile?.homeAwayEdge).toBeNull();
    expect(profile?.recentRecord).toBeNull();
    expect(profile?.battedBallProfile).toBeNull();
  });

  it('schedule + predictions rows → 14 factor 집계 + accuracy 계산', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          id: 1,
          external_game_id: '700001',
          game_date: '2026-05-20',
          status: 'final',
          home_score: 5,
          away_score: 3,
          home_team_code: 'LAD',
          away_team_code: 'SFG',
        },
        {
          id: 2,
          external_game_id: '700002',
          game_date: '2026-05-22',
          status: 'final',
          home_score: 2,
          away_score: 4,
          home_team_code: 'SFG',
          away_team_code: 'LAD',
        },
      ],
      preds: [
        {
          // LAD 홈, home_win_prob=0.62 → LAD 예측 승 (실제도 승 → is_correct)
          external_game_id: '700001',
          home_win_prob: 0.62,
          home_sp_fip: 3.5,
          away_sp_fip: 4.0,
          home_lineup_woba: 0.33,
          away_lineup_woba: 0.31,
          home_bullpen_fip: 3.2,
          away_bullpen_fip: 3.8,
          home_recent_form: 0.6,
          away_recent_form: 0.4,
          home_elo: 1550,
          away_elo: 1490,
          home_lineup_xwoba: 0.34,
          away_lineup_xwoba: 0.32,
          home_lineup_barrel_pct: 9.5,
          away_lineup_barrel_pct: 8.0,
          prediction_type: 'pre_game',
        },
        {
          // LAD 원정, home_win_prob=0.45 → away(LAD) 예측 승 (실제도 승 → is_correct)
          external_game_id: '700002',
          home_win_prob: 0.45,
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
          prediction_type: 'pre_game',
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
    expect(profile?.recentGames[0].isCorrect).toBe(true);
    expect(profile?.recentGames[0].confidence).toBeCloseTo(0.55, 5);

    // streak — KBO buildTeamProfile.computeTeamStreak 재사용 (LAD 두 경기 모두 승)
    expect(profile?.streak).toEqual({ result: 'win', length: 2 });

    // avgMargin — KBO computeTeamAvgMargin 재사용 (LAD 두 경기 모두 마진 2점, MIN_GAMES=2 충족)
    expect(profile?.avgMargin).toEqual({ avgMargin: 2, sampleSize: 2 });

    // blowout/closeGame — MIN_GAMES=3 미충족 (샘플 2경기) → null
    expect(profile?.blowout).toBeNull();
    expect(profile?.closeGame).toBeNull();

    // homeAwayEdge — VENUE_SPLIT_MIN_GAMES_PER_VENUE=2 미충족 (LAD 홈 1경기/원정 1경기) → null
    expect(profile?.homeAwayEdge).toBeNull();

    // recentRecord — MIN_GAMES=2 충족, LAD 두 경기 모두 승
    expect(profile?.recentRecord).toEqual({ wins: 2, losses: 0, sampleSize: 2 });

    // mlb_team_stats row 미제공 → battedBallProfile null (row 부재 팀 안전 처리)
    expect(profile?.battedBallProfile).toBeNull();
  });

  it('mlb_team_stats select error → assertSelectOk throw', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [],
      statsError: { message: 'connection refused' },
    });
    const { buildMlbTeamProfile } = await import('../buildMlbTeamProfile');
    await expect(buildMlbTeamProfile('LAD')).rejects.toThrow(
      /buildMlbTeamProfile mlb_team_stats select failed: connection refused/,
    );
  });

  it('mlb_team_stats row 존재 → battedBallProfile 매핑 (0~100 raw scale 보존, fmtPct 와 다른 스케일)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [],
      stats: {
        pull_pct: 42.5,
        cent_pct: 33.1,
        oppo_pct: 24.4,
        gb_pct: 45.0,
        fb_pct: 35.0,
        hard_hit_pct: 38.7,
      },
    });
    const { buildMlbTeamProfile } = await import('../buildMlbTeamProfile');
    const profile = await buildMlbTeamProfile('LAD');
    expect(profile?.battedBallProfile).toEqual({
      pullPct: 42.5,
      centPct: 33.1,
      oppoPct: 24.4,
      gbPct: 45.0,
      fbPct: 35.0,
      hardHitPct: 38.7,
    });
  });

  // cycle 2081 fix-incident (heavy) — mlb_schedule 은 StatsAPI 컨벤션(TB/CWS/KC/SD/SF/AZ/WSH)
  // 저장, MLB_TEAMS 키는 Baseball-Reference 표준(TBR/CHW/KCR/SDP/SFG/ARI/WSN). 정규화 없이
  // canonical teamCode('TBR')로 그대로 `.or(home_team_code.eq.TBR,...)` 필터링하면 DB 실측
  // 코드('TB')와 항상 불일치 — 이 7팀 team profile 페이지가 항상 0경기(빈 recentGames)만 반환.
  it('teamCode=TBR(StatsAPI 컨벤션 TB) → DB 쿼리 필터가 TB 사용 + isHome/opponentCode 정상 정규화 (regression: cycle 2081)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          id: 3,
          external_game_id: '700003',
          game_date: '2026-06-01',
          status: 'final',
          home_score: 6,
          away_score: 2,
          // 실제 DB 실측 값 — StatsAPI 컨벤션(TB=TBR, SF=SFG)
          home_team_code: 'TB',
          away_team_code: 'SF',
        },
      ],
      preds: [
        {
          external_game_id: '700003',
          home_win_prob: 0.7,
          home_sp_fip: 3.4,
          away_sp_fip: 4.1,
          home_lineup_woba: 0.32,
          away_lineup_woba: 0.30,
          home_bullpen_fip: 3.0,
          away_bullpen_fip: 3.9,
          home_recent_form: 0.6,
          away_recent_form: 0.4,
          home_elo: 1520,
          away_elo: 1480,
          home_lineup_xwoba: 0.33,
          away_lineup_xwoba: 0.31,
          home_lineup_barrel_pct: 9.0,
          away_lineup_barrel_pct: 8.5,
          prediction_type: 'pre_game',
        },
      ],
    });
    const { buildMlbTeamProfile } = await import('../buildMlbTeamProfile');
    const profile = await buildMlbTeamProfile('TBR');

    // DB 쿼리 필터는 StatsAPI 코드(TB)로 나가야 함 — canonical(TBR) 그대로면 항상 0건 매칭.
    const scheduleFrom = supabaseMock.from('mlb_schedule') as unknown as { or: ReturnType<typeof vi.fn> };
    expect(scheduleFrom.or).toHaveBeenCalledWith('home_team_code.eq.TB,away_team_code.eq.TB');

    expect(profile).toBeTruthy();
    expect(profile?.predictedGames).toBe(1);
    // TB(home) === dbTeamCode(TB) 정상 매칭 → isHome=true, opponentCode 는 SF → SFG 정규화.
    expect(profile?.recentGames).toHaveLength(1);
    expect(profile?.recentGames[0].isHome).toBe(true);
    expect(profile?.recentGames[0].opponentCode).toBe('SFG');
    expect(profile?.recentGames[0].opponentName).toBe('Giants');
  });
});
