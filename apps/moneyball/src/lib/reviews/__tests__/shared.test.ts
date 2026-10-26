import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PredictionRow } from '../shared';

function row(overrides: Partial<PredictionRow> = {}): PredictionRow {
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

describe('mapRowsToHighlightCandidates', () => {
  it('is_correct=null 또는 game.status != final 인 행 제외', async () => {
    const { mapRowsToHighlightCandidates } = await import('../shared');
    const rows = [
      row({ is_correct: true }),
      row({ is_correct: null }),
      row({ is_correct: true, game: { ...row().game!, status: 'scheduled' } }),
    ];
    const highlights = mapRowsToHighlightCandidates(rows);
    expect(highlights.length).toBe(1);
  });

  it('game=null 인 행 제외', async () => {
    const { mapRowsToHighlightCandidates } = await import('../shared');
    const rows = [row({ game: null })];
    expect(mapRowsToHighlightCandidates(rows)).toEqual([]);
  });

  it('winnerProb = winnerProbOf(reasoning.homeWinProb), badge 는 null 초기값', async () => {
    const { mapRowsToHighlightCandidates } = await import('../shared');
    const rows = [row({ reasoning: { homeWinProb: 0.3 } })];
    const highlights = mapRowsToHighlightCandidates(rows);
    expect(highlights[0].winnerProb).toBeCloseTo(0.7); // max(0.3, 1-0.3)
    expect(highlights[0].badge).toBeNull();
  });
});

describe('buildTeamStats', () => {
  it('is_correct=null 또는 predicted_winner_team 없는 행 제외', async () => {
    const { buildTeamStats } = await import('../shared');
    const rows = [
      row({ is_correct: true, predicted_winner_team: { code: 'LG' } }),
      row({ is_correct: null, predicted_winner_team: { code: 'OB' } }),
      row({ is_correct: true, predicted_winner_team: null }),
    ];
    const stats = buildTeamStats(rows);
    expect(stats.length).toBe(1);
    expect(stats[0].teamCode).toBe('LG');
  });

  it('기본 정렬 = predicted 내림차순', async () => {
    const { buildTeamStats } = await import('../shared');
    const lgRows = Array.from({ length: 3 }, () =>
      row({ predicted_winner_team: { code: 'LG' }, is_correct: true }),
    );
    const obRows = [row({ predicted_winner_team: { code: 'OB' }, is_correct: true })];
    const stats = buildTeamStats([...obRows, ...lgRows]);
    expect(stats[0].teamCode).toBe('LG');
    expect(stats[0].predicted).toBe(3);
  });

  it('sortBy="accuracy" 지정 시 정확도 내림차순 (predicted 더 적어도 우선)', async () => {
    const { buildTeamStats } = await import('../shared');
    // LG: predicted=3, correct=1 (acc 0.33)
    const lgRows = Array.from({ length: 3 }, (_, i) =>
      row({ predicted_winner_team: { code: 'LG' }, is_correct: i === 0 }),
    );
    // OB: predicted=1, correct=1 (acc 1.0)
    const obRows = [row({ predicted_winner_team: { code: 'OB' }, is_correct: true })];
    const rows = [...lgRows, ...obRows];

    const byPredicted = buildTeamStats(rows);
    expect(byPredicted[0].teamCode).toBe('LG');

    const byAccuracy = buildTeamStats(rows, { sortBy: 'accuracy' });
    expect(byAccuracy[0].teamCode).toBe('OB');
    expect(byAccuracy[0].accuracy).toBe(1);
  });
});

describe('buildFactorInsights', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('final 이 아니거나 factors=null 인 행은 표본에서 제외 -> 표본 부족 시 null', async () => {
    const { buildFactorInsights } = await import('../shared');
    const rows = [
      row({ factors: { sp_fip: 0.1 } }),
      row({ factors: null }),
      row({ factors: { sp_fip: 0.1 }, game: { ...row().game!, status: 'scheduled' } }),
    ];
    const insights = buildFactorInsights(rows, { minSamples: 2 });
    expect(insights.best).toBeNull();
    expect(insights.worst).toBeNull();
  });

  it('home_team_id 또는 winner_team_id 가 null 인 행 제외', async () => {
    const { buildFactorInsights } = await import('../shared');
    const rows = [
      row({ factors: { sp_fip: 0.1 }, game: { ...row().game!, winner_team_id: null } }),
      row({ factors: { sp_fip: 0.2 }, game: { ...row().game!, home_team_id: null } }),
    ];
    const insights = buildFactorInsights(rows, { minSamples: 1 });
    expect(insights.best).toBeNull();
    expect(insights.worst).toBeNull();
  });

  it('충분한 표본이면 best/worst 산출 (analyzeFactorAccuracy 위임)', async () => {
    const rows: PredictionRow[] = Array.from({ length: 6 }, (_, i) => {
      const homeWin = i % 2 === 0;
      return row({
        factors: { sp_fip: homeWin ? 0.3 : -0.3, bullpen_fip: 0 },
        game: {
          ...row().game!,
          id: i,
          home_team_id: 1,
          winner_team_id: homeWin ? 1 : 2,
        },
      });
    });
    const { buildFactorInsights } = await import('../shared');
    const insights = buildFactorInsights(rows, { minSamples: 5 });
    expect(insights.best).not.toBeNull();
    expect(insights.best!.factor).toBe('sp_fip');
    expect(insights.best!.correlation).toBeGreaterThan(0);
  });
});

describe('fetchPredictionRowsInRange', () => {
  function makeSupabaseMock(opts: { error?: { message: string } | null; data?: unknown[] } = {}) {
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

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => Promise.resolve(makeSupabaseMock({ error: { message: 'boom' } })),
    }));
    const { fetchPredictionRowsInRange } = await import('../shared');
    await expect(
      fetchPredictionRowsInRange('2026-08-01', '2026-08-31', 'test'),
    ).rejects.toThrow();
  });

  it('game=null 인 행은 필터링', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve(
          makeSupabaseMock({
            data: [row({ game: null }), row()],
          }),
        ),
    }));
    const { fetchPredictionRowsInRange } = await import('../shared');
    const rows = await fetchPredictionRowsInRange('2026-08-01', '2026-08-31', 'test');
    expect(rows.length).toBe(1);
  });
});
