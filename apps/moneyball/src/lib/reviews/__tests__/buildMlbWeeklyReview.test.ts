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
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockResolvedValue({
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

const WEEK = {
  weekId: '2026-W33',
  year: 2026,
  week: 33,
  startDate: '2026-08-10',
  endDate: '2026-08-16',
  label: '2026년 8월 10일 ~ 16일',
};

describe('fetchMlbPredictionRowsInRange / buildMlbWeeklyReview', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('schedule 빈 배열이면 hasData=false, 빈 review 반환', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { buildMlbWeeklyReview } = await import('../buildMlbWeeklyReview');
    const review = await buildMlbWeeklyReview(WEEK);
    expect(review.hasData).toBe(false);
    expect(review.totalGames).toBe(0);
    expect(review.summary).toContain('아직 검증된 MLB 예측이 없습니다');
  });

  it('schedule select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ scheduleError: { message: 'boom' } });
    const { fetchMlbPredictionRowsInRange } = await import('../mlb-shared');
    await expect(
      fetchMlbPredictionRowsInRange('2026-08-10', '2026-08-16', 'test'),
    ).rejects.toThrow();
  });

  it('predictions select 실패 시 throw', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', game_date: '2026-08-11', status: 'final', home_score: 5, away_score: 2, home_team_code: 'LAD', away_team_code: 'SF' }],
      predsError: { message: 'boom' },
    });
    const { fetchMlbPredictionRowsInRange } = await import('../mlb-shared');
    await expect(
      fetchMlbPredictionRowsInRange('2026-08-10', '2026-08-16', 'test'),
    ).rejects.toThrow();
  });

  it('schedule 행에 매칭되는 prediction 없으면 skip', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', game_date: '2026-08-11', status: 'final', home_score: 5, away_score: 2, home_team_code: 'LAD', away_team_code: 'SF' }],
      preds: [],
    });
    const { fetchMlbPredictionRowsInRange } = await import('../mlb-shared');
    const rows = await fetchMlbPredictionRowsInRange('2026-08-10', '2026-08-16', 'test');
    expect(rows).toEqual([]);
  });

  it('정상 조인 시 isCorrect/predictedHomeWin derive + 정확도 집계', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        // 홈 승, 홈 우세 예측 -> 적중
        { external_game_id: 'g1', game_date: '2026-08-11', status: 'final', home_score: 5, away_score: 2, home_team_code: 'LAD', away_team_code: 'SF' },
        // 홈 승, 원정 우세 예측 -> 오답
        { external_game_id: 'g2', game_date: '2026-08-12', status: 'final', home_score: 3, away_score: 1, home_team_code: 'NYY', away_team_code: 'BOS' },
      ],
      preds: [
        { external_game_id: 'g1', home_win_prob: 0.62, home_sp_fip: 3.0, away_sp_fip: 4.0, home_lineup_woba: 0.34, away_lineup_woba: 0.30, home_bullpen_fip: 3.5, away_bullpen_fip: 4.2, home_war_total: 15, away_war_total: 10 },
        { external_game_id: 'g2', home_win_prob: 0.35, home_sp_fip: 4.5, away_sp_fip: 3.2, home_lineup_woba: 0.29, away_lineup_woba: 0.33, home_bullpen_fip: 4.8, away_bullpen_fip: 3.6, home_war_total: 8, away_war_total: 14 },
      ],
    });
    const { buildMlbWeeklyReview } = await import('../buildMlbWeeklyReview');
    const review = await buildMlbWeeklyReview(WEEK);

    expect(review.totalGames).toBe(2);
    expect(review.verifiedGames).toBe(2);
    expect(review.correctGames).toBe(1);
    expect(review.accuracyRate).toBe(0.5);
    expect(review.games[0].isCorrect).toBe(true);
    expect(review.games[1].isCorrect).toBe(false);
  });

  it('final 스코어 없는 경기는 isCorrect=null (미검증)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', game_date: '2026-08-11', status: 'scheduled', home_score: null, away_score: null, home_team_code: 'LAD', away_team_code: 'SF' }],
      preds: [{ external_game_id: 'g1', home_win_prob: 0.62, home_sp_fip: 3.0, away_sp_fip: 4.0 }],
    });
    const { buildMlbWeeklyReview } = await import('../buildMlbWeeklyReview');
    const review = await buildMlbWeeklyReview(WEEK);
    expect(review.totalGames).toBe(1);
    expect(review.verifiedGames).toBe(0);
    expect(review.games[0].isCorrect).toBeNull();
  });

  it('팀 코드는 normalizeMlbTeamCode 로 canonical 변환', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: 'g1', game_date: '2026-08-11', status: 'final', home_score: 5, away_score: 2, home_team_code: 'LAD', away_team_code: 'SF' }],
      preds: [{ external_game_id: 'g1', home_win_prob: 0.6, home_sp_fip: 3.0, away_sp_fip: 4.0 }],
    });
    const { buildMlbWeeklyReview } = await import('../buildMlbWeeklyReview');
    const review = await buildMlbWeeklyReview(WEEK);
    expect(review.games[0].homeCode).toBe('LAD');
    expect(review.games[0].awayCode).toBe('SFG');
  });
});
