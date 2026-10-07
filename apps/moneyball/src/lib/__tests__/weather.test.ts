import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchStadiumWeather } from '../weather';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function mockResponse(hourly: Record<string, unknown>) {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ hourly }), { status: 200 }),
  );
}

describe('fetchStadiumWeather', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('정상 데이터 — tempC/precipPct 반환', async () => {
    mockResponse({
      time: ['2026-04-21T18:00'],
      temperature_2m: [15.34],
      precipitation_probability: [20],
      weather_code: [0],
    });

    const result = await fetchStadiumWeather(37.5, 127.0, '2026-04-21', 18);

    expect(result).toEqual({
      tempC: 15.3,
      precipPct: 20,
      icon: '☀️',
      label: '맑음',
    });
  });

  it('temperature_2m null (Open-Meteo 결측) — NaN 노출 대신 null 반환', async () => {
    mockResponse({
      time: ['2026-04-21T18:00'],
      temperature_2m: [null],
      precipitation_probability: [20],
      weather_code: [0],
    });

    const result = await fetchStadiumWeather(37.5, 127.0, '2026-04-21', 18);

    expect(result).toBeNull();
  });

  it('precipitation_probability 결측 — 0 fallback 유지', async () => {
    mockResponse({
      time: ['2026-04-21T18:00'],
      temperature_2m: [15.0],
      precipitation_probability: [null],
      weather_code: [0],
    });

    const result = await fetchStadiumWeather(37.5, 127.0, '2026-04-21', 18);

    expect(result?.precipPct).toBe(0);
  });

  it('idx 매칭 실패 → null', async () => {
    mockResponse({
      time: ['2026-04-21T09:00'],
      temperature_2m: [10],
      precipitation_probability: [0],
      weather_code: [0],
    });

    const result = await fetchStadiumWeather(37.5, 127.0, '2026-04-21', 18);

    expect(result).toBeNull();
  });

  it('fetch 실패 → null', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));

    const result = await fetchStadiumWeather(37.5, 127.0, '2026-04-21', 18);

    expect(result).toBeNull();
  });
});
