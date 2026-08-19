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
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve({
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

describe('buildMlbMissReport', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('schedule 빈 배열이면 빈 배열 반환', async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { buildMlbMissReport } = await import('../mlb-shared');
    const items = await buildMlbMissReport();
    expect(items).toEqual([]);
  });

  it('schedule select 실패 시 throw (silent drift family 회귀 가드)', async () => {
    supabaseMock = makeSupabaseMock({ scheduleError: { message: 'boom' } });
    const { buildMlbMissReport } = await import('../mlb-shared');
    await expect(buildMlbMissReport()).rejects.toThrow();
  });

  it('predictions select 실패 시 throw', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          external_game_id: 'g1',
          game_date: '2026-08-11',
          status: 'final',
          home_score: 5,
          away_score: 2,
          home_team_code: 'LAD',
          away_team_code: 'SFG',
        },
      ],
      predsError: { message: 'boom' },
    });
    const { buildMlbMissReport } = await import('../mlb-shared');
    await expect(buildMlbMissReport()).rejects.toThrow();
  });

  it('적중 예측은 제외 — is_correct=true 인 경기는 miss report 에 안 나옴', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          external_game_id: 'g1',
          game_date: '2026-08-11',
          status: 'final',
          home_score: 5,
          away_score: 2,
          home_team_code: 'LAD',
          away_team_code: 'SFG',
        },
      ],
      preds: [{ external_game_id: 'g1', home_win_prob: 0.7 }], // 홈 우세 예측, 홈 승 -> 적중
    });
    const { buildMlbMissReport } = await import('../mlb-shared');
    const items = await buildMlbMissReport();
    expect(items).toEqual([]);
  });

  it('tossup(confidence<lean) 은 miss 대상에서 제외', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          external_game_id: 'g1',
          game_date: '2026-08-11',
          status: 'final',
          home_score: 2,
          away_score: 5,
          home_team_code: 'LAD',
          away_team_code: 'SFG',
        },
      ],
      preds: [{ external_game_id: 'g1', home_win_prob: 0.52 }], // tossup, 홈 예측 틀림
    });
    const { buildMlbMissReport } = await import('../mlb-shared');
    const items = await buildMlbMissReport();
    expect(items).toEqual([]);
  });

  it('고확신 실패 — winnerProb 내림차순 정렬 + 예측 뒷받침 팩터만 표시(반대 방향 제외)', async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          external_game_id: 'g1',
          game_date: '2026-08-11',
          status: 'final',
          home_score: 2,
          away_score: 5,
          home_team_code: 'LAD',
          away_team_code: 'SFG',
        },
        {
          external_game_id: 'g2',
          game_date: '2026-08-10',
          status: 'final',
          home_score: 1,
          away_score: 6,
          home_team_code: 'NYY',
          away_team_code: 'BOS',
        },
      ],
      preds: [
        {
          external_game_id: 'g1',
          home_win_prob: 0.7, // 홈 우세 예측, 실제 원정 승 -> miss, conf=0.7
          home_sp_fip: 3.0,
          away_sp_fip: 4.0, // lower-is-better: home 유리 -> 예측(홈) 뒷받침
          home_lineup_woba: 0.3,
          away_lineup_woba: 0.35, // home 불리 -> 예측과 반대 방향 (제외 대상)
        },
        {
          external_game_id: 'g2',
          home_win_prob: 0.8, // 홈 우세 예측, 실제 원정 승 -> miss, conf=0.8 (더 높음)
          home_sp_fip: 3.2,
          away_sp_fip: 4.5,
        },
      ],
    });
    const { buildMlbMissReport } = await import('../mlb-shared');
    const items = await buildMlbMissReport();
    expect(items.length).toBe(2);
    // conf 내림차순 — g2(0.8) 가 먼저
    expect(items[0].externalGameId).toBe('g2');
    expect(items[0].winnerProb).toBeCloseTo(0.8);
    expect(items[1].externalGameId).toBe('g1');
    // g1: sp_fip 는 예측(홈) 뒷받침이라 포함, lineup_woba 는 반대 방향이라 제외
    const factors = items[1].topSupportingFactors.map((f) => f.factor);
    expect(factors).toContain('sp_fip');
    expect(factors).not.toContain('lineup_woba');
  });
});
