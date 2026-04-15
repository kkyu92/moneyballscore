import { describe, it, expect } from 'vitest';
import {
  KBO_TEAMS,
  DEFAULT_WEIGHTS,
  HOME_ADVANTAGE,
  getConfidenceColor,
  getAccuracyColor,
  toKSTDateString,
  toKSTDisplayString,
} from './index';

describe('KBO_TEAMS', () => {
  it('should have exactly 10 teams', () => {
    expect(Object.keys(KBO_TEAMS)).toHaveLength(10);
  });

  it('should have required fields for each team', () => {
    for (const [code, team] of Object.entries(KBO_TEAMS)) {
      expect(team.name).toBeTruthy();
      expect(team.stadium).toBeTruthy();
      expect(team.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(team.parkPf).toBeGreaterThan(0);
      expect(team.parkPf).toBeLessThan(200);
      expect(team.parkNote).toBeTruthy();
    }
  });

  it('should include all KBO teams', () => {
    const codes = Object.keys(KBO_TEAMS);
    expect(codes).toContain('SK');
    expect(codes).toContain('HT');
    expect(codes).toContain('LG');
    expect(codes).toContain('OB');
    expect(codes).toContain('KT');
    expect(codes).toContain('SS');
    expect(codes).toContain('LT');
    expect(codes).toContain('HH');
    expect(codes).toContain('NC');
    expect(codes).toContain('WO');
  });
});

describe('DEFAULT_WEIGHTS', () => {
  it('should sum to 0.85', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0.85, 2);
  });

  it('should have 10 factors', () => {
    expect(Object.keys(DEFAULT_WEIGHTS)).toHaveLength(10);
  });

  it('should have all values between 0 and 1', () => {
    for (const value of Object.values(DEFAULT_WEIGHTS)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('HOME_ADVANTAGE', () => {
  it('should be 3%', () => {
    expect(HOME_ADVANTAGE).toBe(0.03);
  });
});

describe('getConfidenceColor', () => {
  it('should return green for >= 65', () => {
    expect(getConfidenceColor(65)).toBe('text-green-600');
    expect(getConfidenceColor(80)).toBe('text-green-600');
  });

  it('should return yellow for >= 55 and < 65', () => {
    expect(getConfidenceColor(55)).toBe('text-yellow-600');
    expect(getConfidenceColor(64)).toBe('text-yellow-600');
  });

  it('should return gray for < 55', () => {
    expect(getConfidenceColor(54)).toBe('text-gray-600');
    expect(getConfidenceColor(0)).toBe('text-gray-600');
  });
});

describe('getAccuracyColor', () => {
  it('should return green for >= 65', () => {
    expect(getAccuracyColor(65)).toBe('text-green-600');
  });

  it('should return yellow for >= 55 and < 65', () => {
    expect(getAccuracyColor(55)).toBe('text-yellow-600');
  });

  it('should return red for < 55', () => {
    expect(getAccuracyColor(54)).toBe('text-red-600');
  });
});

describe('toKSTDateString', () => {
  it('should return YYYY-MM-DD format', () => {
    const result = toKSTDateString(new Date('2026-04-14T00:00:00Z'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle KST timezone (UTC+9)', () => {
    // UTC 2026-04-13 20:00 = KST 2026-04-14 05:00
    const result = toKSTDateString(new Date('2026-04-13T20:00:00Z'));
    expect(result).toBe('2026-04-14');
  });

  it('should handle midnight boundary', () => {
    // UTC 2026-04-13 14:59 = KST 2026-04-13 23:59
    const result = toKSTDateString(new Date('2026-04-13T14:59:00Z'));
    expect(result).toBe('2026-04-13');

    // UTC 2026-04-13 15:00 = KST 2026-04-14 00:00
    const result2 = toKSTDateString(new Date('2026-04-13T15:00:00Z'));
    expect(result2).toBe('2026-04-14');
  });
});

describe('toKSTDisplayString', () => {
  it('should return Korean date format', () => {
    const result = toKSTDisplayString(new Date('2026-04-14T00:00:00Z'));
    expect(result).toMatch(/^\d{4}년 \d{2}월 \d{2}일$/);
  });

  it('should handle KST timezone', () => {
    const result = toKSTDisplayString(new Date('2026-04-13T20:00:00Z'));
    expect(result).toBe('2026년 04월 14일');
  });
});
