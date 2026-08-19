import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface UpsertResult {
  error: { message: string } | null;
}

let upsertResult: UpsertResult;

function makeAdminMock() {
  return {
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve(upsertResult)),
    })),
  };
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => makeAdminMock()),
}));

async function callPost(body: unknown) {
  const { POST } = await import('../route');
  const req = new Request('http://localhost/api/picks/mlb-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as never);
}

describe('POST /api/picks/mlb-submit — 입력 검증', () => {
  beforeEach(() => {
    upsertResult = { error: null };
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('valid payload → 200 { ok: true }', async () => {
    const res = await callPost({ external_game_id: '745444', pick: 'home', device_id: 'abc123' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it('missing fields → 400', async () => {
    const res = await callPost({ external_game_id: '745444', pick: 'home' });
    expect(res.status).toBe(400);
  });

  it('external_game_id empty string → 400', async () => {
    const res = await callPost({ external_game_id: '', pick: 'home', device_id: 'x' });
    expect(res.status).toBe(400);
  });

  it('external_game_id 21자 초과 (VARCHAR(20) 초과) → 400', async () => {
    const res = await callPost({ external_game_id: '1'.repeat(21), pick: 'home', device_id: 'x' });
    expect(res.status).toBe(400);
  });

  it('external_game_id 숫자 타입 (문자열 아님) → 400', async () => {
    const res = await callPost({ external_game_id: 745444, pick: 'home', device_id: 'x' });
    expect(res.status).toBe(400);
  });

  it('pick invalid → 400', async () => {
    const res = await callPost({ external_game_id: '745444', pick: 'draw', device_id: 'x' });
    expect(res.status).toBe(400);
  });

  it('device_id empty string → 400', async () => {
    const res = await callPost({ external_game_id: '745444', pick: 'away', device_id: '' });
    expect(res.status).toBe(400);
  });

  it('device_id 65자 초과 → 400', async () => {
    const res = await callPost({ external_game_id: '745444', pick: 'away', device_id: 'a'.repeat(65) });
    expect(res.status).toBe(400);
  });

  it('DB error → 500', async () => {
    upsertResult = { error: { message: 'connection timeout' } };
    const res = await callPost({ external_game_id: '745444', pick: 'home', device_id: 'x' });
    expect(res.status).toBe(500);
  });

  it('pick=away 정상 처리', async () => {
    const res = await callPost({ external_game_id: '999999', pick: 'away', device_id: 'device-uuid' });
    expect(res.status).toBe(200);
  });
});
