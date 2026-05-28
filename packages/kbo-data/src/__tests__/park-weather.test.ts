import { describe, it, expect } from 'vitest';
import { scoreParkWeather, parkWeatherFactor } from '../factors/park-weather';
import type { WeatherSnapshot } from '../scrapers/weather';

function baseWeather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    tempC: 20,
    precipMm: 0,
    windSpeedKmh: 5,
    windDirDeg: 0,
    code: 0,
    icon: '☀️',
    label: '맑음',
    source: 'open-meteo-archive',
    ...overrides,
  };
}

describe('scoreParkWeather (M-F1 factor 11)', () => {
  it('test 1 — 저온 (<10°C) 양팀 HR 억제 -15%', () => {
    const w = baseWeather({ tempC: 5 });
    const score = scoreParkWeather(w, 1.0, false);
    expect(score.homeAdj).toBeCloseTo(-0.15, 6);
    expect(score.awayAdj).toBeCloseTo(-0.15, 6);
    expect(score.reason).toContain('저온');
    expect(score.reason).toContain('HR 억제');
  });

  it('test 2 — 외야 방향 바람 (90~270° + ≥10km/h) HR +10% boost', () => {
    const w = baseWeather({ windDirDeg: 180, windSpeedKmh: 15 });
    const score = scoreParkWeather(w, 1.0, false);
    expect(score.homeAdj).toBeCloseTo(0.1, 6);
    expect(score.awayAdj).toBeCloseTo(0.1, 6);
    expect(score.reason).toContain('외야 바람');
    expect(score.reason).toContain('HR 부스트');
  });

  it('test 3 — 강수 ≥5mm 양팀 점수 -8%', () => {
    const w = baseWeather({ precipMm: 7.2 });
    const score = scoreParkWeather(w, 1.0, false);
    expect(score.homeAdj).toBeCloseTo(-0.08, 6);
    expect(score.awayAdj).toBeCloseTo(-0.08, 6);
    expect(score.reason).toContain('강수');
    expect(score.reason).toContain('점수 억제');
  });

  it('test 4 — 돔구장 (잠실/창원/대구 — isDome=true) 시 noop', () => {
    // 극단 기상 입력 — 돔이라 무시되어야 함
    const extreme = baseWeather({ tempC: -5, precipMm: 20, windSpeedKmh: 30, windDirDeg: 180 });
    const score = scoreParkWeather(extreme, 1.0, true);
    expect(score.homeAdj).toBe(0);
    expect(score.awayAdj).toBe(0);
    expect(score.reason).toContain('돔구장');
  });

  it('test 5 — weather null 시 0 return + 결측 reason', () => {
    const score = scoreParkWeather(null, 1.0, false);
    expect(score.homeAdj).toBe(0);
    expect(score.awayAdj).toBe(0);
    expect(score.reason).toContain('결측');
  });
});

describe('scoreParkWeather edge cases (kill criteria guard)', () => {
  it('약풍 (<10km/h) — 외야 방향이어도 boost 미적용', () => {
    const w = baseWeather({ windDirDeg: 180, windSpeedKmh: 5 });
    const score = scoreParkWeather(w, 1.0, false);
    expect(score.homeAdj).toBe(0);
    expect(score.awayAdj).toBe(0);
    expect(score.reason).toBe('날씨 중립');
  });

  it('내야 방향 바람 (270° 초과 또는 90° 미만) — boost 미적용', () => {
    const w1 = baseWeather({ windDirDeg: 45, windSpeedKmh: 20 });
    const w2 = baseWeather({ windDirDeg: 315, windSpeedKmh: 20 });
    expect(scoreParkWeather(w1, 1.0, false).homeAdj).toBe(0);
    expect(scoreParkWeather(w2, 1.0, false).homeAdj).toBe(0);
  });

  it('극단 기상 누적 — 저온 + 강수 + 외야 바람 동시', () => {
    const w = baseWeather({ tempC: 5, precipMm: 10, windDirDeg: 180, windSpeedKmh: 15 });
    const score = scoreParkWeather(w, 1.0, false);
    // -0.15 (저온) + -0.08 (강수) + 0.10 (바람) = -0.13
    expect(score.homeAdj).toBeCloseTo(-0.13, 6);
    expect(score.awayAdj).toBeCloseTo(-0.13, 6);
    expect(score.reason.split(', ').length).toBe(3);
  });

  it('forecast snapshot (precipPct only, precipMm 없음) — 강수 임계 미적용', () => {
    const w = baseWeather({ source: 'open-meteo-forecast', precipMm: undefined, precipPct: 80 });
    const score = scoreParkWeather(w, 1.0, false);
    // precipPct 는 점수 임계 미사용 (실측 mm 만)
    expect(score.homeAdj).toBe(0);
    expect(score.awayAdj).toBe(0);
  });
});

describe('parkWeatherFactor → predictor [0,1] 변환', () => {
  it('대칭 (homeAdj=awayAdj) → 0.5 neutral', () => {
    const score = { homeAdj: -0.15, awayAdj: -0.15, reason: '저온' };
    expect(parkWeatherFactor(score)).toBe(0.5);
  });

  it('홈 유리 (homeAdj > awayAdj) → 0.5 초과', () => {
    const score = { homeAdj: 0.1, awayAdj: -0.05, reason: '홈 lineup HR 친화' };
    expect(parkWeatherFactor(score)).toBeCloseTo(0.65, 6);
  });

  it('clamp [0, 1]', () => {
    const extremeHigh = { homeAdj: 1, awayAdj: -1, reason: '' };
    const extremeLow = { homeAdj: -1, awayAdj: 1, reason: '' };
    expect(parkWeatherFactor(extremeHigh)).toBe(1);
    expect(parkWeatherFactor(extremeLow)).toBe(0);
  });
});
