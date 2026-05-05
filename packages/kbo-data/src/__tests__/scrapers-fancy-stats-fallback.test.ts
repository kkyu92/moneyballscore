import { describe, it, expect } from 'vitest';
import {
  detectFancyStatsFallbacks,
  hasAnyFallback,
} from '../scrapers/fancy-stats';

describe('detectFancyStatsFallbacks', () => {
  it('정상 값은 모두 false', () => {
    const flags = detectFancyStatsFallbacks({
      elo: 1500,
      woba: 0.320,
      fip: 4.0,
      sfr: 0.05,
    });
    expect(flags).toEqual({ elo: false, woba: false, fip: false, sfr: false });
  });

  it('모든 값 0 일 때 모두 true (페이지 구조 변경 시나리오)', () => {
    const flags = detectFancyStatsFallbacks({
      elo: 0,
      woba: 0,
      fip: 0,
      sfr: 0,
    });
    expect(flags).toEqual({ elo: true, woba: true, fip: true, sfr: true });
  });

  it('SFR 만 0 일 때 sfr 만 true (수비력 평균 팀 위양성 케이스)', () => {
    const flags = detectFancyStatsFallbacks({
      elo: 1480,
      woba: 0.310,
      fip: 4.2,
      sfr: 0,
    });
    expect(flags.sfr).toBe(true);
    expect(flags.elo).toBe(false);
    expect(flags.woba).toBe(false);
    expect(flags.fip).toBe(false);
  });

  it('NaN 도 falsy 처리', () => {
    const flags = detectFancyStatsFallbacks({
      elo: NaN,
      woba: 0.320,
      fip: NaN,
      sfr: 0.05,
    });
    expect(flags.elo).toBe(true);
    expect(flags.fip).toBe(true);
    expect(flags.woba).toBe(false);
    expect(flags.sfr).toBe(false);
  });
});

describe('hasAnyFallback', () => {
  it('모두 false 면 false', () => {
    expect(hasAnyFallback({ elo: false, woba: false, fip: false, sfr: false })).toBe(false);
  });

  it('하나라도 true 면 true', () => {
    expect(hasAnyFallback({ elo: false, woba: false, fip: false, sfr: true })).toBe(true);
    expect(hasAnyFallback({ elo: true, woba: false, fip: false, sfr: false })).toBe(true);
  });

  it('모두 true 면 true', () => {
    expect(hasAnyFallback({ elo: true, woba: true, fip: true, sfr: true })).toBe(true);
  });
});
