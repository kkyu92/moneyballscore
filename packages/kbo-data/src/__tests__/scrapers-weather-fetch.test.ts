import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchOpenMeteoHourly,
  fetchArchiveWeather,
  fetchForecastWeather,
} from '../scrapers/weather';

const originalFetch = global.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERR',
    json: async () => body,
  } as unknown as Response;
}

const ARCHIVE_HOURLY_KEYS = {
  time: ['2026-05-06T18:00', '2026-05-06T19:00'],
  temperature_2m: [21.4, 22.1],
  precipitation: [0, 0.2],
  weather_code: [0, 3],
  wind_speed_10m: [3.2, 4.1],
  wind_direction_10m: [180, 200],
};

const FORECAST_HOURLY_KEYS = {
  time: ['2026-05-06T18:00', '2026-05-06T19:00'],
  temperature_2m: [21.4, 22.1],
  precipitation_probability: [10, 30],
  weather_code: [0, 3],
  wind_speed_10m: [3.2, 4.1],
  wind_direction_10m: [180, 200],
};

describe('fetchOpenMeteoHourly silent drift family scrapers 차원 19번째 진입', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('정상 응답 → ok=true + hourly + idx', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ hourly: ARCHIVE_HOURLY_KEYS }),
    ) as unknown as typeof fetch;

    const result = await fetchOpenMeteoHourly<typeof ARCHIVE_HOURLY_KEYS>(
      'https://archive-api.open-meteo.com/v1/archive?x=1',
      '2026-05-06',
      18,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idx).toBe(0);
      expect(result.hourly.temperature_2m[0]).toBe(21.4);
    }
  });

  it('http_error — res.ok=false → reason=http_error + status 박제', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({}, 503),
    ) as unknown as typeof fetch;

    const result = await fetchOpenMeteoHourly(
      'https://archive-api.open-meteo.com/v1/archive?x=1',
      '2026-05-06',
      18,
    );

    expect(result).toEqual({ ok: false, reason: 'http_error', status: 503 });
  });

  it('no_hourly — json.hourly 부재 → reason=no_hourly', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ hourly: undefined }),
    ) as unknown as typeof fetch;

    const result = await fetchOpenMeteoHourly(
      'https://archive-api.open-meteo.com/v1/archive?x=1',
      '2026-05-06',
      18,
    );

    expect(result).toEqual({ ok: false, reason: 'no_hourly' });
  });

  it('no_hourly — hourly.time 부재 → reason=no_hourly', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ hourly: { time: undefined } }),
    ) as unknown as typeof fetch;

    const result = await fetchOpenMeteoHourly(
      'https://archive-api.open-meteo.com/v1/archive?x=1',
      '2026-05-06',
      18,
    );

    expect(result).toEqual({ ok: false, reason: 'no_hourly' });
  });

  it('idx_not_found — 매칭 시각 없으면 reason=idx_not_found', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ hourly: { ...ARCHIVE_HOURLY_KEYS, time: ['2026-05-06T20:00'] } }),
    ) as unknown as typeof fetch;

    const result = await fetchOpenMeteoHourly(
      'https://archive-api.open-meteo.com/v1/archive?x=1',
      '2026-05-06',
      18,
    );

    expect(result).toEqual({ ok: false, reason: 'idx_not_found' });
  });

  it('fetch_error — fetch 자체 throw → reason=fetch_error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('network fail')) as unknown as typeof fetch;

    const result = await fetchOpenMeteoHourly(
      'https://archive-api.open-meteo.com/v1/archive?x=1',
      '2026-05-06',
      18,
    );

    expect(result).toEqual({ ok: false, reason: 'fetch_error' });
  });
});

describe('fetchArchiveWeather + fetchForecastWeather console.warn silent drift 가시화', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('archive 정상 → snapshot 리턴 + warn 없음', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ hourly: ARCHIVE_HOURLY_KEYS }),
    ) as unknown as typeof fetch;

    const snap = await fetchArchiveWeather(37.5, 127.0, '2026-05-06', 18);

    expect(snap).not.toBeNull();
    expect(snap?.source).toBe('open-meteo-archive');
    expect(snap?.tempC).toBe(21.4);
    expect(snap?.precipMm).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('archive http_error → null + warn 박제 (status 포함)', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({}, 500),
    ) as unknown as typeof fetch;

    const snap = await fetchArchiveWeather(37.5, 127.0, '2026-05-06', 18);

    expect(snap).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('[weather] archive fetch failed: http_error (HTTP 500)');
  });

  it('archive idx_not_found → null + warn 박제', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ hourly: { ...ARCHIVE_HOURLY_KEYS, time: ['2026-05-06T20:00'] } }),
    ) as unknown as typeof fetch;

    const snap = await fetchArchiveWeather(37.5, 127.0, '2026-05-06', 18);

    expect(snap).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('[weather] archive fetch failed: idx_not_found');
  });

  it('archive fetch_error → null + warn 박제', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;

    const snap = await fetchArchiveWeather(37.5, 127.0, '2026-05-06', 18);

    expect(snap).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('[weather] archive fetch failed: fetch_error');
  });

  it('forecast 정상 → snapshot 리턴 + precipPct 박제', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ hourly: FORECAST_HOURLY_KEYS }),
    ) as unknown as typeof fetch;

    const snap = await fetchForecastWeather(37.5, 127.0, '2026-05-06', 18);

    expect(snap).not.toBeNull();
    expect(snap?.source).toBe('open-meteo-forecast');
    expect(snap?.precipPct).toBe(10);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('forecast no_hourly → null + warn 박제', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({}),
    ) as unknown as typeof fetch;

    const snap = await fetchForecastWeather(37.5, 127.0, '2026-05-06', 18);

    expect(snap).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('[weather] forecast fetch failed: no_hourly');
  });
});
