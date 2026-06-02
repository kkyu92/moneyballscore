import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { created_at: string };

let perModeData: Record<string, Row | null> = {};
let perModeError: { message: string } | null = null;

function makeSupabaseMock() {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  } as Record<string, ReturnType<typeof vi.fn>>;
  let currentMode: string | null = null;
  builder.select.mockImplementation(() => builder);
  builder.eq.mockImplementation((col: string, val: string) => {
    if (col === 'mode') currentMode = val;
    return builder;
  });
  builder.order.mockImplementation(() => builder);
  builder.limit.mockImplementation(() => builder);
  builder.maybeSingle.mockImplementation(() =>
    Promise.resolve({
      data: currentMode ? perModeData[currentMode] ?? null : null,
      error: perModeError,
    }),
  );
  return {
    from: vi.fn((table: string) => {
      if (table === 'pipeline_runs') return builder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => makeSupabaseMock()),
}));

async function callGet() {
  const { GET } = await import('../route');
  return GET();
}

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

describe('GET /api/health/pipelines (cycle 1135 v18 candidate Z)', () => {
  beforeEach(() => {
    perModeData = {};
    perModeError = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('모든 mode fresh → 200 + overall=ok', async () => {
    perModeData = {
      announce: { created_at: isoHoursAgo(2) },
      predict: { created_at: isoHoursAgo(1) },
      predict_final: { created_at: isoHoursAgo(10) },
      verify: { created_at: isoHoursAgo(10) },
    };
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.overall).toBe('ok');
    expect(body.modes.announce.status).toBe('ok');
    expect(body.modes.predict.status).toBe('ok');
    expect(body.modes.predict_final.status).toBe('ok');
    expect(body.modes.verify.status).toBe('ok');
  });

  it('predict stale (16h, threshold 15h) → 200 + overall=degraded', async () => {
    perModeData = {
      announce: { created_at: isoHoursAgo(2) },
      predict: { created_at: isoHoursAgo(16) },
      predict_final: { created_at: isoHoursAgo(10) },
      verify: { created_at: isoHoursAgo(10) },
    };
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.overall).toBe('degraded');
    expect(body.modes.predict.status).toBe('stale');
    expect(body.modes.predict.hours_since).toBeGreaterThan(15);
  });

  it('verify never (no rows) → degraded + never status', async () => {
    perModeData = {
      announce: { created_at: isoHoursAgo(2) },
      predict: { created_at: isoHoursAgo(1) },
      predict_final: { created_at: isoHoursAgo(10) },
      verify: null,
    };
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.overall).toBe('degraded');
    expect(body.modes.verify.status).toBe('never');
    expect(body.modes.verify.last_success_at).toBeNull();
  });

  it('supabase error → 503 + overall=fail', async () => {
    perModeData = {
      announce: { created_at: isoHoursAgo(2) },
    };
    perModeError = { message: 'supabase down' };
    const res = await callGet();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.overall).toBe('fail');
    const errCount = Object.values(body.modes as Record<string, { status: string }>).filter(
      (m) => m.status === 'error',
    ).length;
    expect(errCount).toBeGreaterThan(0);
  });

  it('response 항상 cache-control no-store', async () => {
    perModeData = {
      announce: { created_at: isoHoursAgo(2) },
      predict: { created_at: isoHoursAgo(1) },
      predict_final: { created_at: isoHoursAgo(10) },
      verify: { created_at: isoHoursAgo(10) },
    };
    const res = await callGet();
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('latency_ms + timestamp 필드 박제', async () => {
    perModeData = {
      announce: { created_at: isoHoursAgo(2) },
      predict: { created_at: isoHoursAgo(1) },
      predict_final: { created_at: isoHoursAgo(10) },
      verify: { created_at: isoHoursAgo(10) },
    };
    const res = await callGet();
    const body = await res.json();
    expect(typeof body.latency_ms).toBe('number');
    expect(typeof body.timestamp).toBe('string');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
