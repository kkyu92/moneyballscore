import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

interface PollRow {
  external_game_id: string;
  pick: string;
}

let pollRows: PollRow[];
let pollError: { message: string } | null;

function makeSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'mlb_pick_poll_events') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: pollRows, error: pollError })),
          })),
        };
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
  const req = new NextRequest(`http://localhost/api/picks/mlb-poll?ids=${ids}`);
  return GET(req);
}

describe('GET /api/picks/mlb-poll', () => {
  beforeEach(() => {
    pollRows = [];
    pollError = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('ids 파라미터 없음 → 빈 객체, DB 조회 없음', async () => {
    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost/api/picks/mlb-poll');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });

  it('home/away pick 집계 → home/away/total 카운트, id는 문자열 유지', async () => {
    pollRows = [
      { external_game_id: '745444', pick: 'home' },
      { external_game_id: '745444', pick: 'away' },
      { external_game_id: '745444', pick: 'away' },
    ];
    const res = await callGet('745444');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body['745444']).toEqual({ home: 1, away: 2, total: 3 });
  });

  it('투표 없는 external_game_id도 0건 entry 생성', async () => {
    const res = await callGet('745444,745555');
    const body = await res.json();
    expect(body['745444']).toEqual({ home: 0, away: 0, total: 0 });
    expect(body['745555']).toEqual({ home: 0, away: 0, total: 0 });
  });

  it('잘못된 pick 값(home/away 외) → 집계 제외, total 불변', async () => {
    pollRows = [{ external_game_id: '745444', pick: 'invalid' }];
    const res = await callGet('745444');
    const body = await res.json();
    expect(body['745444']).toEqual({ home: 0, away: 0, total: 0 });
  });

  it('빈 문자열/20자 초과 id 필터링', async () => {
    pollRows = [{ external_game_id: '745444', pick: 'home' }];
    const tooLong = 'x'.repeat(21);
    const res = await callGet(`745444, ,${tooLong}`);
    const body = await res.json();
    expect(Object.keys(body)).toEqual(['745444']);
  });

  it('모든 id 무효 → 빈 객체, DB 조회 없음', async () => {
    const res = await callGet(' , ');
    expect(await res.json()).toEqual({});
  });

  it('select error → 500', async () => {
    pollError = { message: 'boom' };
    const res = await callGet('745444');
    expect(res.status).toBe(500);
  });
});
