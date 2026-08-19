import { afterEach, describe, expect, it, vi } from 'vitest';

// buildMlbWeeklyReview.test.ts(Phase 1a) 의 월간 대응 (plan #26 Phase 2) — 동일
// fetchMlbPredictionRowsInRange 를 소비하므로 supabase mock 구조는 그대로, 단
// buildMlbMonthlyReview 는 verifiedGames >= 5 일 때 전월 비교를 위해 두 번째 range
// 조회를 추가로 날리므로 mock 이 순차 응답(queue)을 지원해야 함.

interface QueueResponse {
  data: unknown[] | null;
  error?: { message: string } | null;
}

interface SupabaseMockOptions {
  scheduleQueue?: QueueResponse[];
  predsQueue?: QueueResponse[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const scheduleQueue = [...(opts.scheduleQueue ?? [])];
  const predsQueue = [...(opts.predsQueue ?? [])];

  const scheduleBuilder = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockImplementation(() => {
      const next = scheduleQueue.shift() ?? { data: [], error: null };
      return Promise.resolve({ data: next.data, error: next.error ?? null });
    }),
  };
  const predsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      const next = predsQueue.shift() ?? { data: [], error: null };
      return resolve({ data: next.data, error: next.error ?? null });
    },
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

const MONTH = {
  monthId: '2026-08',
  year: 2026,
  month: 8,
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  label: '2026년 8월',
};

describe('buildMlbMonthlyReview', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('schedule 빈 배열이면 hasData=false, 빈 review 반환', async () => {
    supabaseMock = makeSupabaseMock({ scheduleQueue: [{ data: [] }] });
    const { buildMlbMonthlyReview } = await import('../buildMlbMonthlyReview');
    const review = await buildMlbMonthlyReview(MONTH);
    expect(review.hasData).toBe(false);
    expect(review.totalGames).toBe(0);
    expect(review.previousAccuracyRate).toBeNull();
    expect(review.summary).toContain('아직 검증된 MLB 예측이 없습니다');
  });

  it('정상 조인 시 isCorrect/accuracyRate 집계 (전월 비교 없음, verifiedGames < 5)', async () => {
    supabaseMock = makeSupabaseMock({
      scheduleQueue: [
        {
          data: [
            { external_game_id: 'g1', game_date: '2026-08-11', status: 'final', home_score: 5, away_score: 2, home_team_code: 'LAD', away_team_code: 'SF' },
            { external_game_id: 'g2', game_date: '2026-08-12', status: 'final', home_score: 3, away_score: 1, home_team_code: 'NYY', away_team_code: 'BOS' },
          ],
        },
      ],
      predsQueue: [
        {
          data: [
            { external_game_id: 'g1', home_win_prob: 0.62, home_sp_fip: 3.0, away_sp_fip: 4.0, home_lineup_woba: 0.34, away_lineup_woba: 0.30, home_bullpen_fip: 3.5, away_bullpen_fip: 4.2, home_war_total: 15, away_war_total: 10 },
            { external_game_id: 'g2', home_win_prob: 0.35, home_sp_fip: 4.5, away_sp_fip: 3.2, home_lineup_woba: 0.29, away_lineup_woba: 0.33, home_bullpen_fip: 4.8, away_bullpen_fip: 3.6, home_war_total: 8, away_war_total: 14 },
          ],
        },
      ],
    });
    const { buildMlbMonthlyReview } = await import('../buildMlbMonthlyReview');
    const review = await buildMlbMonthlyReview(MONTH);

    expect(review.totalGames).toBe(2);
    expect(review.verifiedGames).toBe(2);
    expect(review.correctGames).toBe(1);
    expect(review.accuracyRate).toBe(0.5);
    // verifiedGames(2) < 5 라 전월 비교 조회 자체를 스킵 — schedule 두 번째 큐 소비 안 됨.
    expect(review.previousAccuracyRate).toBeNull();
  });

  it('verifiedGames >= MIN_VERIFIED_GAMES_HEDGE(10) 면 전월 range 재조회 후 previousAccuracyRate + summary 전월 대비 문구 포함', async () => {
    // MIN_VERIFIED_GAMES_HEDGE(10) 이상이어야 buildSummary 가 "전월 대비" 문구를 붙임
    // (previousAccuracyRate 필드 자체는 verifiedGames >= 5 부터 계산되지만, summary 텍스트
    // hedge 는 더 보수적인 10 기준 — buildMonthlyReview.ts(KBO) 와 동일 threshold).
    const currentSchedule = Array.from({ length: 10 }, (_, i) => ({
      external_game_id: `cur-${i}`,
      game_date: `2026-08-${10 + i}`,
      status: 'final',
      home_score: 5,
      away_score: 2,
      home_team_code: 'LAD',
      away_team_code: 'SF',
    }));
    const currentPreds = currentSchedule.map((s) => ({
      external_game_id: s.external_game_id,
      home_win_prob: 0.62,
      home_sp_fip: 3.0,
      away_sp_fip: 4.0,
    }));
    const prevSchedule = Array.from({ length: 10 }, (_, i) => ({
      external_game_id: `prev-${i}`,
      game_date: `2026-07-${10 + i}`,
      status: 'final',
      home_score: 2,
      away_score: 5,
      home_team_code: 'LAD',
      away_team_code: 'SF',
    }));
    const prevPreds = prevSchedule.map((s) => ({
      external_game_id: s.external_game_id,
      home_win_prob: 0.62, // 홈 우세 예측인데 홈 패 -> 전량 오답
      home_sp_fip: 3.0,
      away_sp_fip: 4.0,
    }));

    supabaseMock = makeSupabaseMock({
      scheduleQueue: [{ data: currentSchedule }, { data: prevSchedule }],
      predsQueue: [{ data: currentPreds }, { data: prevPreds }],
    });
    const { buildMlbMonthlyReview } = await import('../buildMlbMonthlyReview');
    const review = await buildMlbMonthlyReview(MONTH);

    expect(review.verifiedGames).toBe(10);
    expect(review.accuracyRate).toBe(1);
    expect(review.previousAccuracyRate).toBe(0);
    expect(review.summary).toContain('전월 대비');
  });

  it('schedule select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({
      scheduleQueue: [{ data: null, error: { message: 'boom' } }],
    });
    const { buildMlbMonthlyReview } = await import('../buildMlbMonthlyReview');
    await expect(buildMlbMonthlyReview(MONTH)).rejects.toThrow();
  });

  it('schedule 행에 매칭되는 prediction 없으면 skip', async () => {
    supabaseMock = makeSupabaseMock({
      scheduleQueue: [{ data: [{ external_game_id: 'g1', game_date: '2026-08-11', status: 'final', home_score: 5, away_score: 2, home_team_code: 'LAD', away_team_code: 'SF' }] }],
      predsQueue: [{ data: [] }],
    });
    const { buildMlbMonthlyReview } = await import('../buildMlbMonthlyReview');
    const review = await buildMlbMonthlyReview(MONTH);
    expect(review.totalGames).toBe(0);
    expect(review.hasData).toBe(false);
  });
});
