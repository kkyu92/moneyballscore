import { describe, it, expect } from 'vitest';
import {
  SFR_STRONG,
  SFR_WEAK,
  H2H_DOMINANT_RATE,
  H2H_WEAK_RATE,
  PARK_FACTOR_HITTER_MIN,
  PARK_FACTOR_PITCHER_MAX,
} from '@moneyball/shared';

// wave-414: 수비SFR + 상대전적 + 구장 대결 표시 — 팩터 수렴 픽 섹션
// sfr: ≥SFR_STRONG(10) = brand / ≤SFR_WEAK(-10) = orange
// h2h win rate: ≥H2H_DOMINANT_RATE(0.6) = brand / ≤H2H_WEAK_RATE(0.4) = orange
// parkPf: ≥PARK_FACTOR_HITTER_MIN(105) = brand / ≤PARK_FACTOR_PITCHER_MAX(95) = orange

function sfrColor(sfr: number): 'brand' | 'orange' | 'neutral' {
  if (sfr >= SFR_STRONG) return 'brand';
  if (sfr <= SFR_WEAK) return 'orange';
  return 'neutral';
}

function h2hWinRateColor(wins: number, total: number): 'brand' | 'orange' | 'neutral' {
  if (total === 0) return 'neutral';
  const rate = wins / total;
  if (rate >= H2H_DOMINANT_RATE) return 'brand';
  if (rate <= H2H_WEAK_RATE) return 'orange';
  return 'neutral';
}

function parkColor(parkPf: number): 'brand' | 'orange' | 'neutral' {
  if (parkPf >= PARK_FACTOR_HITTER_MIN) return 'brand';
  if (parkPf <= PARK_FACTOR_PITCHER_MAX) return 'orange';
  return 'neutral';
}

describe('wave-414 수비 SFR 색상 분류', () => {
  it('SFR_STRONG(10.0) 이상 = brand(강세)', () => {
    expect(sfrColor(10.0)).toBe('brand');
    expect(sfrColor(15.0)).toBe('brand');
  });

  it('SFR_WEAK(-10.0) 이하 = orange(약세)', () => {
    expect(sfrColor(-10.0)).toBe('orange');
    expect(sfrColor(-15.0)).toBe('orange');
  });

  it('중간 구간 = neutral', () => {
    expect(sfrColor(0.0)).toBe('neutral');
    expect(sfrColor(9.9)).toBe('neutral');
    expect(sfrColor(-9.9)).toBe('neutral');
  });

  it('SFR_STRONG 임계 — 10.0', () => {
    expect(SFR_STRONG).toBe(10.0);
  });

  it('SFR_WEAK 임계 — -10.0', () => {
    expect(SFR_WEAK).toBe(-10.0);
  });
});

describe('wave-414 상대전적 승률 색상 분류 (홈/원정 양팀)', () => {
  it('승률 60% 이상 = brand(우세) — 원정팀', () => {
    expect(h2hWinRateColor(6, 10)).toBe('brand');
    expect(h2hWinRateColor(8, 10)).toBe('brand');
  });

  it('승률 40% 이하 = orange(열세) — 원정팀', () => {
    expect(h2hWinRateColor(4, 10)).toBe('orange');
    expect(h2hWinRateColor(2, 10)).toBe('orange');
  });

  it('중간 구간(41~59%) = neutral', () => {
    expect(h2hWinRateColor(5, 10)).toBe('neutral');
    expect(h2hWinRateColor(4.1, 10)).toBe('neutral'); // 41%
  });

  it('홈팀 우세 = 원정팀 열세 (보수 관계)', () => {
    const awayWins = 3;
    const homeWins = 7;
    const total = awayWins + homeWins;
    expect(h2hWinRateColor(awayWins, total)).toBe('orange'); // 원정 30% 열세
    expect(h2hWinRateColor(homeWins, total)).toBe('brand'); // 홈 70% 우세
  });

  it('H2H_DOMINANT_RATE 임계 — 0.6', () => {
    expect(H2H_DOMINANT_RATE).toBe(0.6);
  });

  it('H2H_WEAK_RATE 임계 — 0.4', () => {
    expect(H2H_WEAK_RATE).toBe(0.4);
  });
});

describe('wave-414 구장 특성 색상 분류', () => {
  it('parkPf >= 105 = brand(타자친화)', () => {
    expect(parkColor(105)).toBe('brand');
    expect(parkColor(108)).toBe('brand'); // SS잠실
  });

  it('parkPf <= 95 = orange(투수친화)', () => {
    expect(parkColor(95)).toBe('orange');
    expect(parkColor(92)).toBe('orange'); // WO
  });

  it('중간 구간(96~104) = neutral', () => {
    expect(parkColor(100)).toBe('neutral');
    expect(parkColor(96)).toBe('neutral');
    expect(parkColor(104)).toBe('neutral');
  });

  it('PARK_FACTOR_HITTER_MIN 임계 — 105', () => {
    expect(PARK_FACTOR_HITTER_MIN).toBe(105);
  });

  it('PARK_FACTOR_PITCHER_MAX 임계 — 95', () => {
    expect(PARK_FACTOR_PITCHER_MAX).toBe(95);
  });
});
