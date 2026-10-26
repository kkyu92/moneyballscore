import { afterEach, describe, expect, it, vi } from 'vitest';

interface SupabaseMockOptions {
  error?: { message: string } | null;
  dataByRange?: Record<string, unknown[]>;
}

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

let callRanges: Array<[string, string]> = [];

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  let currentStart = '';
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    gte: vi.fn((_col: string, v: string) => {
      currentStart = v;
      return builder;
    }),
    lte: vi.fn().mockImplementation(() => {
      callRanges.push([currentStart, '']);
      const data = opts.dataByRange?.[currentStart] ?? [];
      return Promise.resolve({
        data: opts.error ? null : data,
        error: opts.error ?? null,
      });
    }),
  };
  return { from: vi.fn(() => builder) };
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

describe('buildMonthlyReview', () => {
  afterEach(() => {
    vi.clearAllMocks();
    callRanges = [];
  });

  it('데이터 없으면 hasData=false + 안내 summary', async () => {
    supabaseMock = makeSupabaseMock({ dataByRange: {} });
    const { buildMonthlyReview } = await import('../buildMonthlyReview');
    const review = await buildMonthlyReview(MONTH);
    expect(review.hasData).toBe(false);
    expect(review.summary).toContain('아직 검증된 예측이 없습니다');
  });

  it('select 실패 시 throw', async () => {
    supabaseMock = makeSupabaseMock({ error: { message: 'boom' } });
    const { buildMonthlyReview } = await import('../buildMonthlyReview');
    await expect(buildMonthlyReview(MONTH)).rejects.toThrow();
  });

  it('검증 표본 < SMALL_SAMPLE_N(5) 이면 전월 비교 조회 자체를 생략', async () => {
    supabaseMock = makeSupabaseMock({
      dataByRange: {
        '2026-08-01': [predRow(), predRow()], // verifiedGames=2 < 5
      },
    });
    const { buildMonthlyReview } = await import('../buildMonthlyReview');
    const review = await buildMonthlyReview(MONTH);
    expect(review.previousAccuracyRate).toBeNull();
    // gte 가 이번 달 범위로만 1회 호출 — 전월 조회 없음.
    expect(callRanges.length).toBe(1);
  });

  it('검증 표본 >= 5 면 전월 비교 조회 수행, 전월도 표본 충분 시 previousAccuracyRate 산출', async () => {
    const thisMonth = Array.from({ length: 5 }, (_, i) =>
      predRow({ game: { ...predRow().game, id: i, game_date: `2026-08-0${i + 1}` }, is_correct: i < 4 }),
    );
    const prevMonth = Array.from({ length: 5 }, (_, i) =>
      predRow({ game: { ...predRow().game, id: 100 + i, game_date: `2026-07-0${i + 1}` }, is_correct: i < 2 }),
    );
    supabaseMock = makeSupabaseMock({
      dataByRange: {
        '2026-08-01': thisMonth,
        '2026-07-01': prevMonth,
      },
    });
    const { buildMonthlyReview } = await import('../buildMonthlyReview');
    const review = await buildMonthlyReview(MONTH);
    expect(review.accuracyRate).toBe(0.8); // 4/5
    expect(review.previousAccuracyRate).toBe(0.4); // 2/5
    expect(callRanges.length).toBe(2);
  });

  it('teamStats 는 sortBy=accuracy (정확도 내림차순)', async () => {
    const rows = [
      predRow({
        game: { ...predRow().game, id: 1 },
        predicted_winner_team: { code: 'LG' },
        is_correct: false,
      }),
      predRow({
        game: { ...predRow().game, id: 2 },
        predicted_winner_team: { code: 'OB' },
        is_correct: true,
      }),
    ];
    supabaseMock = makeSupabaseMock({ dataByRange: { '2026-08-01': rows } });
    const { buildMonthlyReview } = await import('../buildMonthlyReview');
    const review = await buildMonthlyReview(MONTH);
    expect(review.teamStats[0].teamCode).toBe('OB');
    expect(review.teamStats[0].accuracy).toBe(1);
  });
});
