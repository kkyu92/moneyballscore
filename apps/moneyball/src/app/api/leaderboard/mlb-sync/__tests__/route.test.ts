import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface UpsertResult {
  error: { message: string } | null;
}

let upsertResult: UpsertResult;
let fromSpy: ReturnType<typeof vi.fn>;
let upsertSpy: ReturnType<typeof vi.fn>;

function makeAdminMock() {
  upsertSpy = vi.fn(() => Promise.resolve(upsertResult));
  fromSpy = vi.fn(() => ({ upsert: upsertSpy }));
  return { from: fromSpy };
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => makeAdminMock()),
}));

const ORIGIN = 'https://moneyballscore.vercel.app';

async function callPost(body: unknown, opts: { origin?: string | null } = {}) {
  const { POST } = await import('../route');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.origin !== null) {
    headers['Origin'] = opts.origin ?? ORIGIN;
  }
  const req = new Request('http://localhost/api/leaderboard/mlb-sync', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return POST(req as never);
}

const VALID_DEVICE_ID = '00000000-0000-0000-0000-000000000001';

describe('POST /api/leaderboard/mlb-sync', () => {
  beforeEach(() => {
    upsertResult = { error: null };
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('valid payload → mlb_user_picks upsert, synced count 반환', async () => {
    const res = await callPost({
      device_id: VALID_DEVICE_ID,
      nickname: 'Tester',
      picks: [{ external_game_id: '745444', pick: 'home', picked_at: new Date().toISOString() }],
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ synced: 1 });
    expect(fromSpy).toHaveBeenCalledWith('mlb_user_picks');
  });

  it('invalid device_id (UUID 형식 아님) → 400', async () => {
    const res = await callPost({ device_id: 'not-a-uuid', nickname: 'Tester', picks: [] });
    expect(res.status).toBe(400);
  });

  it('nickname 1자 (NICKNAME_MIN_CHARS 미만) → 400', async () => {
    const res = await callPost({ device_id: VALID_DEVICE_ID, nickname: 'a', picks: [] });
    expect(res.status).toBe(400);
  });

  it('nickname XSS 문자 포함 → 400', async () => {
    const res = await callPost({ device_id: VALID_DEVICE_ID, nickname: '<script>', picks: [] });
    expect(res.status).toBe(400);
  });

  it('picks 빈 배열 → synced: 0 (DB 호출 없음)', async () => {
    const res = await callPost({ device_id: VALID_DEVICE_ID, nickname: 'Tester', picks: [] });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ synced: 0 });
  });

  it('external_game_id 21자 초과 항목은 필터링 → synced: 0', async () => {
    const res = await callPost({
      device_id: VALID_DEVICE_ID,
      nickname: 'Tester',
      picks: [{ external_game_id: '1'.repeat(21), pick: 'home', picked_at: new Date().toISOString() }],
    });
    const json = await res.json();
    expect(json).toEqual({ synced: 0 });
  });

  it('DB error → 500', async () => {
    upsertResult = { error: { message: 'connection timeout' } };
    const res = await callPost({
      device_id: VALID_DEVICE_ID,
      nickname: 'Tester',
      picks: [{ external_game_id: '745444', pick: 'away', picked_at: new Date().toISOString() }],
    });
    expect(res.status).toBe(500);
  });

  it('invalid json body → 400', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/leaderboard/mlb-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: '{not json',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('Origin missing → 403 forbidden', async () => {
    const res = await callPost(
      { device_id: VALID_DEVICE_ID, nickname: 'Tester', picks: [] },
      { origin: null },
    );
    expect(res.status).toBe(403);
  });

  it('Origin mismatched (외부 도메인) → 403 forbidden', async () => {
    const res = await callPost(
      { device_id: VALID_DEVICE_ID, nickname: 'Tester', picks: [] },
      { origin: 'https://evil.example.com' },
    );
    expect(res.status).toBe(403);
  });
});
