import { describe, it, expect } from 'vitest';
import {
  KBO_TEAMS,
  KBO_TEAM_SHORT_NAME,
  DEFAULT_WEIGHTS,
  HOME_ADVANTAGE,
  getConfidenceColor,
  getAccuracyColor,
  shortTeamName,
  toKSTDateString,
  toKSTDisplayString,
  winnerProbOf,
  classifyWinnerProb,
  WINNER_PROB_CONFIDENT,
  WINNER_PROB_LEAN,
  WINNER_TIER_LABEL,
  WINNER_TIER_EMOJI_POOL,
  pickTierEmoji,
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
    const sum = Object.values(DEFAULT_WEIGHTS).reduce<number>(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBeCloseTo(0.85, 2);
  });

  it('should have 10 factors', () => {
    expect(Object.keys(DEFAULT_WEIGHTS)).toHaveLength(10);
  });

  it('should have all values in [0, 1]', () => {
    for (const value of Object.values(DEFAULT_WEIGHTS)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('v1.7-revert (= v1.5): cycle 17 prod 측정 기반 회귀 — 모든 factor 가중치 > 0', () => {
    for (const [key, value] of Object.entries(DEFAULT_WEIGHTS)) {
      expect(value).toBeGreaterThan(0);
      expect(typeof key).toBe('string');
    }
  });
});

describe('HOME_ADVANTAGE', () => {
  it('should be 1.5% (data-measured from 2025+2026 N=731)', () => {
    expect(HOME_ADVANTAGE).toBe(0.015);
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

describe('winnerProbOf', () => {
  it('return max(hwp, 1-hwp) — 홈 승률 0.70 → 0.70', () => {
    expect(winnerProbOf(0.7)).toBeCloseTo(0.7, 5);
  });

  it('원정 승률 우위 케이스 (홈 0.30) → 0.70 으로 대칭', () => {
    expect(winnerProbOf(0.3)).toBeCloseTo(0.7, 5);
  });

  it('동률 홈 0.5 → 0.5', () => {
    expect(winnerProbOf(0.5)).toBeCloseTo(0.5, 5);
  });

  it('null / undefined 는 0.5 로 폴백', () => {
    expect(winnerProbOf(null)).toBe(0.5);
    expect(winnerProbOf(undefined)).toBe(0.5);
  });
});

describe('classifyWinnerProb (3단계)', () => {
  it('WINNER_PROB_CONFIDENT = 0.65, WINNER_PROB_LEAN = 0.55 (Telegram B2 와 통일)', () => {
    expect(WINNER_PROB_CONFIDENT).toBe(0.65);
    expect(WINNER_PROB_LEAN).toBe(0.55);
  });

  it('winnerProb ≥ 0.65 → confident (🔥 강한 예측)', () => {
    expect(classifyWinnerProb(0.65)).toBe('confident');
    expect(classifyWinnerProb(0.80)).toBe('confident');
    // 홈 0.20 = 원정 0.80 → confident
    expect(classifyWinnerProb(0.20)).toBe('confident');
  });

  it('0.55 ≤ winnerProb < 0.65 → lean (📈 유력)', () => {
    expect(classifyWinnerProb(0.55)).toBe('lean');
    expect(classifyWinnerProb(0.60)).toBe('lean');
    expect(classifyWinnerProb(0.45)).toBe('lean'); // 원정 0.55
  });

  it('winnerProb < 0.55 → tossup (🤔 반반)', () => {
    expect(classifyWinnerProb(0.54)).toBe('tossup');
    expect(classifyWinnerProb(0.50)).toBe('tossup');
    expect(classifyWinnerProb(0.46)).toBe('tossup');
  });

  it('null/undefined 는 tossup 으로 분류 (null-safe)', () => {
    expect(classifyWinnerProb(null)).toBe('tossup');
    expect(classifyWinnerProb(undefined)).toBe('tossup');
  });

  it('tier 라벨 — Telegram + UI 공통 단일 출처 (적중/유력/반반)', () => {
    expect(WINNER_TIER_LABEL.confident).toBe('적중');
    expect(WINNER_TIER_LABEL.lean).toBe('유력');
    expect(WINNER_TIER_LABEL.tossup).toBe('반반');
  });

  it('tier 이모지 — 고정 (적중 🔥 / 유력 📈 / 반반 🤔)', () => {
    expect(WINNER_TIER_EMOJI_POOL.confident).toEqual(['🔥']);
    expect(WINNER_TIER_EMOJI_POOL.lean).toEqual(['📈']);
    expect(WINNER_TIER_EMOJI_POOL.tossup).toEqual(['🤔']);
  });

  it('pickTierEmoji — tier 별 고정 이모지 반환', () => {
    expect(pickTierEmoji('confident')).toBe('🔥');
    expect(pickTierEmoji('lean')).toBe('📈');
    expect(pickTierEmoji('tossup')).toBe('🤔');
  });
});

describe('KBO_TEAM_SHORT_NAME + shortTeamName', () => {
  it('10팀 모두 이미지 기준 단축명 정확히 매핑', () => {
    // 사용자 요구 (2026-04-20 홈 UI 표기 통일):
    // 한화/두산/SSG/KIA/NC (원정 row), LG/롯데/삼성/KT/키움 (홈 row)
    expect(KBO_TEAM_SHORT_NAME.HH).toBe('한화');
    expect(KBO_TEAM_SHORT_NAME.OB).toBe('두산');
    expect(KBO_TEAM_SHORT_NAME.SK).toBe('SSG');
    expect(KBO_TEAM_SHORT_NAME.HT).toBe('KIA');
    expect(KBO_TEAM_SHORT_NAME.NC).toBe('NC');
    expect(KBO_TEAM_SHORT_NAME.LG).toBe('LG');
    expect(KBO_TEAM_SHORT_NAME.LT).toBe('롯데');
    expect(KBO_TEAM_SHORT_NAME.SS).toBe('삼성');
    expect(KBO_TEAM_SHORT_NAME.KT).toBe('KT');
    expect(KBO_TEAM_SHORT_NAME.WO).toBe('키움');
  });

  it('shortTeamName helper — 유효 코드', () => {
    expect(shortTeamName('HT')).toBe('KIA');
    expect(shortTeamName('OB')).toBe('두산');
  });

  it('shortTeamName helper — null/undefined/unknown 은 crash 없이 fallback', () => {
    expect(shortTeamName(null)).toBe('');
    expect(shortTeamName(undefined)).toBe('');
    expect(shortTeamName('')).toBe('');
    expect(shortTeamName('UNKNOWN')).toBe('UNKNOWN');
  });
});
