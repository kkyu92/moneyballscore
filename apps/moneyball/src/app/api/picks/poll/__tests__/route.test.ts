import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

interface PollRow {
  game_id: number;
  pick: string;
}

let pollRows: PollRow[];
let pollError: { message: string } | null;

function makeSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'pick_poll_events') {
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
  const req = new NextRequest(`http://localhost/api/picks/poll?ids=${ids}`);
  return GET(req);
}

describe('GET /api/picks/poll', () => {
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
    const req = new NextRequest('http://localhost/api/picks/poll');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });

  it('home/away pick 집계 → home/away/total 카운트', async () => {
    pollRows = [
      { game_id: 5, pick: 'home' },
      { game_id: 5, pick: 'home' },
      { game_id: 5, pick: 'away' },
    ];
    const res = await callGet('5');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body['5']).toEqual({ home: 2, away: 1, total: 3 });
  });

  it('투표 없는 game_id도 0건 entry 생성', async () => {
    const res = await callGet('5,6');
    const body = await res.json();
    expect(body['5']).toEqual({ home: 0, away: 0, total: 0 });
    expect(body['6']).toEqual({ home: 0, away: 0, total: 0 });
  });

  it('잘못된 pick 값(home/away 외) → 집계 제외, total 불변', async () => {
    pollRows = [{ game_id: 5, pick: 'invalid' }];
    const res = await callGet('5');
    const body = await res.json();
    expect(body['5']).toEqual({ home: 0, away: 0, total: 0 });
  });

  it('non-numeric id 필터링 → 유효 id만 조회', async () => {
    pollRows = [{ game_id: 5, pick: 'home' }];
    const res = await callGet('5,abc,-1,0');
    const body = await res.json();
    expect(Object.keys(body)).toEqual(['5']);
  });

  it('모든 id 무효 → 빈 객체, DB 조회 없음', async () => {
    const res = await callGet('abc,-1,0');
    expect(await res.json()).toEqual({});
  });

  it('select error → 500', async () => {
    pollError = { message: 'boom' };
    const res = await callGet('5');
    expect(res.status).toBe(500);
  });
});
