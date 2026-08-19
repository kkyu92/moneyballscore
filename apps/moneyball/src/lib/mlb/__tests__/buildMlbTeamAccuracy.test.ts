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

describe('buildMlbMatchupData', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('final 경기 없으면 빈 matchups/homeAway', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { buildMlbMatchupData } = await import('../buildMlbTeamAccuracy');
    const result = await buildMlbMatchupData();
    expect(result).toEqual({ matchups: [], homeAway: [] });
  });

  it('schedule select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ scheduleError: { message: 'boom' } });
    const { buildMlbMatchupData } = await import('../buildMlbTeamAccuracy');
    await expect(buildMlbMatchupData()).rejects.toThrow();
  });

  it('상대전적 양방향 집계 + 홈/원정 split', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 },
        { external_game_id: 'g2', home_team_code: 'BOS', away_team_code: 'NYY', home_score: 1, away_score: 3 },
      ],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.7 }, // 홈(NYY) 예측, 홈 승 → 적중
        { external_game_id: 'g2', home_win_prob: 0.7 }, // 홈(BOS) 예측, 원정 승 → 오답
      ],
    });
    const { buildMlbMatchupData } = await import('../buildMlbTeamAccuracy');
    const { matchups, homeAway } = await buildMlbMatchupData();

    const nyyVsBos = matchups.find((m) => m.teamCode === 'NYY' && m.opponentCode === 'BOS');
    const bosVsNyy = matchups.find((m) => m.teamCode === 'BOS' && m.opponentCode === 'NYY');
    expect(nyyVsBos).toEqual({ teamCode: 'NYY', opponentCode: 'BOS', n: 2, correct: 1, accuracyRate: 0.5 });
    expect(bosVsNyy).toEqual({ teamCode: 'BOS', opponentCode: 'NYY', n: 2, correct: 1, accuracyRate: 0.5 });

    const haByCode = new Map(homeAway.map((h) => [h.teamCode, h]));
    expect(haByCode.get('NYY')).toEqual({
      teamCode: 'NYY', homeN: 1, homeCorrect: 1, homeAccuracy: 1, awayN: 1, awayCorrect: 0, awayAccuracy: 0,
    });
    expect(haByCode.get('BOS')).toEqual({
      teamCode: 'BOS', homeN: 1, homeCorrect: 0, homeAccuracy: 0, awayN: 1, awayCorrect: 1, awayAccuracy: 1,
    });
  });

  it('예측 없는 경기는 skip', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 }],
      preds: [],
    });
    const { buildMlbMatchupData } = await import('../buildMlbTeamAccuracy');
    const result = await buildMlbMatchupData();
    expect(result).toEqual({ matchups: [], homeAway: [] });
  });
});

describe('buildMlbTeamBiasAnalysis', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('final 경기 없으면 빈 배열', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { buildMlbTeamBiasAnalysis } = await import('../buildMlbTeamAccuracy');
    const result = await buildMlbTeamBiasAnalysis();
    expect(result).toEqual([]);
  });

  it('schedule select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ scheduleError: { message: 'boom' } });
    const { buildMlbTeamBiasAnalysis } = await import('../buildMlbTeamAccuracy');
    await expect(buildMlbTeamBiasAnalysis()).rejects.toThrow();
  });

  it('biasGap = predictedWinRate - actualWinPct, 실제 승패는 mlb_schedule final 스코어로 직접 derive (외부 standings 불필요)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        // NYY 홈 5경기 모두 실제 승리, 예측은 3승만 (predictedWinRate=0.6, actualWinPct=1.0 → biasGap=-0.4)
        { external_game_id: 'g1', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 },
        { external_game_id: 'g2', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 },
        { external_game_id: 'g3', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 },
        { external_game_id: 'g4', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 },
        { external_game_id: 'g5', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 },
      ],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.7 }, // 홈(NYY) 예측승 → 실제도 승 → 적중
        { external_game_id: 'g2', home_win_prob: 0.7 },
        { external_game_id: 'g3', home_win_prob: 0.7 },
        { external_game_id: 'g4', home_win_prob: 0.3 }, // 원정(BOS) 예측승 → 실제는 홈 승 → 오답
        { external_game_id: 'g5', home_win_prob: 0.3 },
      ],
    });
    const { buildMlbTeamBiasAnalysis } = await import('../buildMlbTeamAccuracy');
    const result = await buildMlbTeamBiasAnalysis();
    const nyy = result.find((r) => r.teamCode === 'NYY');
    expect(nyy).toBeDefined();
    expect(nyy!.predictedWinRate).toBeCloseTo(0.6);
    expect(nyy!.actualWinPct).toBeCloseTo(1.0);
    expect(nyy!.biasGap).toBeCloseTo(-0.4);
    // 결과는 |biasGap| 내림차순
    for (let i = 0; i < result.length - 1; i++) {
      expect(Math.abs(result[i].biasGap ?? 0)).toBeGreaterThanOrEqual(Math.abs(result[i + 1].biasGap ?? 0));
    }
  });

  it('totalN < SMALL_SAMPLE_N(5) → 필터 제거', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: 'g1', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 },
      ],
      preds: [{ external_game_id: 'g1', home_win_prob: 0.7 }],
    });
    const { buildMlbTeamBiasAnalysis } = await import('../buildMlbTeamAccuracy');
    const result = await buildMlbTeamBiasAnalysis();
    expect(result).toEqual([]);
  });

  it('예측 없는 경기는 skip', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2 }],
      preds: [],
    });
    const { buildMlbTeamBiasAnalysis } = await import('../buildMlbTeamAccuracy');
    const result = await buildMlbTeamBiasAnalysis();
    expect(result).toEqual([]);
  });
});
