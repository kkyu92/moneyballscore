import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// cycle 2244 fix-incident — MLB 픽('mlb-{external_game_id}') 이 예전엔 KBO 전용
// parseInt 필터에 걸려 조용히 사라졌음 (실측: parseInt('mlb-123') === NaN).
// 두 소스(games / mlb_schedule+predictions)를 각각 mock.

interface GamesRow {
  id: number;
  game_date: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  home_team: { id: number; name_ko: string; code: string };
  away_team: { id: number; name_ko: string; code: string };
  predictions: unknown[];
}

interface MlbScheduleRow {
  external_game_id: string;
  game_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team_code: string;
  away_team_code: string;
}

interface MlbPredRow {
  external_game_id: string;
  home_win_prob: number | null;
}

let gamesRows: GamesRow[];
let mlbScheduleRows: MlbScheduleRow[];
let mlbPredRows: MlbPredRow[];
let gamesError: { message: string } | null;
let mlbScheduleError: { message: string } | null;

function makeSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'games') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: gamesRows, error: gamesError })),
          })),
        };
      }
      if (table === 'mlb_schedule') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: mlbScheduleRows, error: mlbScheduleError })),
          })),
        };
      }
      if (table === 'predictions') {
        // eq/eq/in/in 4단 체이닝 — 마지막 호출에서만 resolve 하지 않고, thenable 로
        // 만들어 어느 체인 길이든 await 시 동일 결과를 반환하게 함.
        const builder: Record<string, unknown> = {
          eq: vi.fn(() => builder),
          in: vi.fn(() => builder),
          then: (resolve: (v: { data: MlbPredRow[]; error: null }) => void) =>
            resolve({ data: mlbPredRows, error: null }),
        };
        return { select: vi.fn(() => builder) };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => makeSupabaseMock()),
}));

async function callGet(ids: string) {
  const { GET } = await import('../route');
  const req = new NextRequest(`http://localhost/api/picks/results?ids=${ids}`);
  return GET(req);
}

describe('GET /api/picks/results', () => {
  beforeEach(() => {
    gamesRows = [];
    mlbScheduleRows = [];
    mlbPredRows = [];
    gamesError = null;
    mlbScheduleError = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('KBO numeric id → 기존과 동일하게 games 조회', async () => {
    gamesRows = [
      {
        id: 5,
        game_date: '2026-08-10',
        home_score: 5,
        away_score: 2,
        status: 'final',
        home_team: { id: 1, name_ko: 'LG', code: 'LG' },
        away_team: { id: 2, name_ko: '두산', code: 'OB' },
        predictions: [],
      },
    ];
    const res = await callGet('5');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(5);
  });

  it('mlb-{external_game_id} → mlb_schedule/predictions 조회, id는 문자열 그대로 유지', async () => {
    mlbScheduleRows = [
      {
        external_game_id: '745444',
        game_date: '2026-08-11',
        status: 'final',
        home_score: 5,
        away_score: 2,
        home_team_code: 'LAD',
        away_team_code: 'SFG',
      },
    ];
    mlbPredRows = [{ external_game_id: '745444', home_win_prob: 0.62 }];

    const res = await callGet('mlb-745444');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('mlb-745444');
    expect(body[0].ai_predicted_home_win).toBe(true);
    expect(body[0].ai_is_correct).toBe(true); // home won, predicted home
    expect(body[0].home_team.name_ko).toBe('Dodgers');
  });

  it('KBO + MLB 혼합 ids → 양쪽 모두 결과에 포함', async () => {
    gamesRows = [
      {
        id: 5,
        game_date: '2026-08-10',
        home_score: 5,
        away_score: 2,
        status: 'final',
        home_team: { id: 1, name_ko: 'LG', code: 'LG' },
        away_team: { id: 2, name_ko: '두산', code: 'OB' },
        predictions: [],
      },
    ];
    mlbScheduleRows = [
      {
        external_game_id: '745444',
        game_date: '2026-08-11',
        status: 'final',
        home_score: 5,
        away_score: 2,
        home_team_code: 'LAD',
        away_team_code: 'SFG',
      },
    ];
    mlbPredRows = [{ external_game_id: '745444', home_win_prob: 0.62 }];

    const res = await callGet('5,mlb-745444');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    const ids = body.map((r: { id: number | string }) => r.id);
    expect(ids).toContain(5);
    expect(ids).toContain('mlb-745444');
  });

  it('mlb_schedule 조회 error → 500', async () => {
    mlbScheduleError = { message: 'boom' };
    const res = await callGet('mlb-745444');
    expect(res.status).toBe(500);
  });

  it('ids 파라미터 없음 → 빈 배열', async () => {
    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost/api/picks/results');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('mlb- 이지만 존재하지 않는 external_game_id → 빈 배열 (schedule 0건)', async () => {
    mlbScheduleRows = [];
    const res = await callGet('mlb-999999');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
