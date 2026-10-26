import { afterEach, describe, expect, it, vi } from 'vitest';

interface SupabaseMockOptions {
  error?: { message: string } | null;
  data?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockResolvedValue({
      data: opts.error ? null : (opts.data ?? []),
      error: opts.error ?? null,
    }),
  };
  return { from: vi.fn(() => builder) };
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

function predRow(overrides: Record<string, unknown> = {}) {
  return {
    confidence: 0.6,
    is_correct: true,
    factors: null,
    reasoning: { homeWinProb: 0.6 },
    predicted_winner_team: { code: 'LG' },
    game: {
      id: 1,
      game_date: '2026-08-11',
      home_score: 5,
      away_score: 2,
      status: 'final',
      home_team_id: 1,
      winner_team_id: 1,
      home_team: { code: 'LG' },
      away_team: { code: 'OB' },
    },
    ...overrides,
  };
}

describe('buildWeeklyReview', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('데이터 없으면 hasData=false + 안내 summary', async () => {
    supabaseMock = makeSupabaseMock({ data: [] });
    const { buildWeeklyReview } = await import('../buildWeeklyReview');
    const review = await buildWeeklyReview(WEEK);
    expect(review.hasData).toBe(false);
    expect(review.totalGames).toBe(0);
    expect(review.summary).toContain('아직 검증된 예측이 없습니다');
  });

  it('select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ error: { message: 'boom' } });
    const { buildWeeklyReview } = await import('../buildWeeklyReview');
    await expect(buildWeeklyReview(WEEK)).rejects.toThrow();
  });

  it('정확도 집계 + games 는 gameDate 오름차순', async () => {
    supabaseMock = makeSupabaseMock({
      data: [
        predRow({
          game: { ...predRow().game, id: 2, game_date: '2026-08-12' },
          is_correct: false,
        }),
        predRow({
          game: { ...predRow().game, id: 1, game_date: '2026-08-11' },
          is_correct: true,
        }),
      ],
    });
    const { buildWeeklyReview } = await import('../buildWeeklyReview');
    const review = await buildWeeklyReview(WEEK);
    expect(review.totalGames).toBe(2);
    expect(review.verifiedGames).toBe(2);
    expect(review.correctGames).toBe(1);
    expect(review.accuracyRate).toBe(0.5);
    expect(review.games[0].gameId).toBe(1);
    expect(review.games[1].gameId).toBe(2);
  });

  it('박빙 적중(tossup) 은 close-hit 배지, 고확신 적중은 high-confidence 배지', async () => {
    supabaseMock = makeSupabaseMock({
      data: [
        predRow({
          game: { ...predRow().game, id: 1 },
          reasoning: { homeWinProb: 0.52 }, // tossup, 적중
          is_correct: true,
        }),
        predRow({
          game: { ...predRow().game, id: 2 },
          reasoning: { homeWinProb: 0.8 }, // confident, 적중
          is_correct: true,
        }),
      ],
    });
    const { buildWeeklyReview } = await import('../buildWeeklyReview');
    const review = await buildWeeklyReview(WEEK);
    const badges = review.highlights.map((h) => h.badge);
    expect(badges).toContain('박빙 적중');
    expect(badges).toContain('고확신 적중');
  });

  it('고확신 실패는 대역전 실패 배지', async () => {
    supabaseMock = makeSupabaseMock({
      data: [
        predRow({
          reasoning: { homeWinProb: 0.8 },
          is_correct: false,
        }),
      ],
    });
    const { buildWeeklyReview } = await import('../buildWeeklyReview');
    const review = await buildWeeklyReview(WEEK);
    expect(review.highlights[0]?.badge).toBe('대역전 실패');
  });
});
