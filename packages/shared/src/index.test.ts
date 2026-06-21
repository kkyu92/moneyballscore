import { describe, it, expect } from 'vitest';
import {
  KBO_TEAMS,
  KBO_TEAM_COUNT,
  KBO_HEAD_TO_HEAD_PAIRS,
  KBO_FACTOR_COUNT,
  KBO_TEAM_SHORT_NAME,
  DEFAULT_WEIGHTS,
  ACTIVE_FACTOR_KEYS,
  HOME_ADVANTAGE,
  HOME_ADVANTAGE_PCT,
  HOME_WIN_RATE_PCT,
  HOME_WIN_RATE_SAMPLE_N,
  HOME_WIN_RATE_CI_PP,
  getConfidenceColor,
  getAccuracyColor,
  shortTeamName,
  toKSTDateString,
  toKSTDisplayString,
  getKSTWeekRange,
  getKSTMondayUtcIso,
  getKSTMonthStartUtcIso,
  winnerProbOf,
  classifyWinnerProb,
  WINNER_PROB_CONFIDENT,
  WINNER_PROB_CONFIDENT_PCT,
  WINNER_PROB_LEAN,
  WINNER_PROB_LEAN_PCT,
  WINNER_PROB_CLAMP_MIN,
  WINNER_PROB_CLAMP_MAX,
  clampWinnerProb,
  SMALL_SAMPLE_N,
  WINNER_TIER_LABEL,
  WINNER_TIER_EMOJI_POOL,
  pickTierEmoji,
  ACCURACY_BASELINE,
  BRIER_BASELINE,
} from './index';

describe('KBO_TEAMS', () => {
  it('should have exactly 10 teams', () => {
    expect(Object.keys(KBO_TEAMS)).toHaveLength(10);
  });

  it('KBO_TEAM_COUNT should match KBO_TEAMS length (silent drift wave 76 guard)', () => {
    expect(KBO_TEAM_COUNT).toBe(Object.keys(KBO_TEAMS).length);
    expect(KBO_TEAM_COUNT).toBe(10);
  });

  it('KBO_FACTOR_COUNT should match ACTIVE_FACTOR_KEYS length (silent drift wave 83 guard)', () => {
    expect(KBO_FACTOR_COUNT).toBe(ACTIVE_FACTOR_KEYS.length);
    expect(KBO_FACTOR_COUNT).toBe(10);
  });

  it('KBO_HEAD_TO_HEAD_PAIRS should derive from KBO_TEAM_COUNT (silent drift wave 107 guard)', () => {
    expect(KBO_HEAD_TO_HEAD_PAIRS).toBe((KBO_TEAM_COUNT * (KBO_TEAM_COUNT - 1)) / 2);
    expect(KBO_HEAD_TO_HEAD_PAIRS).toBe(45);
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
  it('should sum to 0.85 (production-active 10 factor — shadow factor weight=0 → 합계 무영향)', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce<number>(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBeCloseTo(0.85, 2);
  });

  it('should have production-active 10 factor + shadow factor (park_weather + umpire_sz)', () => {
    // M-F1 / M-F2 cycle 1013 — park_weather + umpire_sz 도입 (production 0).
    expect(Object.keys(DEFAULT_WEIGHTS).length).toBe(12);
    expect(DEFAULT_WEIGHTS.park_weather).toBe(0);
    expect(DEFAULT_WEIGHTS.umpire_sz).toBe(0);
  });

  it('should have all values in [0, 1]', () => {
    for (const value of Object.values(DEFAULT_WEIGHTS)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('v1.8: ACTIVE_FACTOR_KEYS (production 10 factor) 가중치 > 0 + shadow factor (park_weather) = 0', () => {
    const activeKeys = new Set(ACTIVE_FACTOR_KEYS);
    for (const [key, value] of Object.entries(DEFAULT_WEIGHTS)) {
      if (activeKeys.has(key as typeof ACTIVE_FACTOR_KEYS[number])) {
        expect(value, `${key} active factor must be > 0`).toBeGreaterThan(0);
      } else {
        expect(value, `${key} shadow factor must be 0`).toBe(0);
      }
    }
  });
});

describe('HOME_ADVANTAGE', () => {
  it('should be 1.5% (data-measured from 2023+2024+2025+2026 N=2180)', () => {
    expect(HOME_ADVANTAGE).toBe(0.015);
  });
  it('HOME_ADVANTAGE_PCT derive = HOME_ADVANTAGE * 100', () => {
    expect(HOME_ADVANTAGE_PCT).toBe(1.5);
    expect(HOME_ADVANTAGE_PCT).toBeCloseTo(HOME_ADVANTAGE * 100, 10);
  });
});

describe('HOME_WIN_RATE (silent drift wave 105)', () => {
  it('HOME_WIN_RATE_PCT = 51.93 (2023~2026 N=2180 measured)', () => {
    expect(HOME_WIN_RATE_PCT).toBe(51.93);
  });
  it('HOME_WIN_RATE_SAMPLE_N = 2180', () => {
    expect(HOME_WIN_RATE_SAMPLE_N).toBe(2180);
  });
  it('HOME_WIN_RATE_CI_PP = 2.10', () => {
    expect(HOME_WIN_RATE_CI_PP).toBe(2.10);
  });
  it('HOME_ADVANTAGE 보수적 박제 vs raw 실측 (51.93 - 50 = 1.93pp, HOME_ADVANTAGE = 1.5pp ≈ noise 흡수)', () => {
    const rawAdvantagePp = HOME_WIN_RATE_PCT - 50;
    expect(rawAdvantagePp).toBeCloseTo(1.93, 10);
    expect(HOME_ADVANTAGE_PCT).toBeLessThan(rawAdvantagePp);
  });
});

describe('BRIER_BASELINE (silent drift wave 106)', () => {
  it('BRIER_BASELINE = 0.25 (coin-flip baseline)', () => {
    expect(BRIER_BASELINE).toBe(0.25);
  });
  it('BRIER_BASELINE === ACCURACY_BASELINE ** 2 (수학적 정합: Brier = (p-y)² @ p=0.5)', () => {
    expect(BRIER_BASELINE).toBeCloseTo(ACCURACY_BASELINE ** 2, 10);
  });
  it('toFixed(5) representation = "0.25000" (debug model-comparison footer 보장)', () => {
    expect(BRIER_BASELINE.toFixed(5)).toBe('0.25000');
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

// cycle 457 — picks/leaderboard silent drift family. KST 월요일 boundary 단일 source.
describe('getKSTWeekRange', () => {
  it('수요일 입력 → 그 주 월~일 ISO date string', () => {
    // 2026-05-13 (수) UTC 06:00 = KST 15:00 — 그 주 월=2026-05-11, 일=2026-05-17
    const result = getKSTWeekRange(new Date('2026-05-13T06:00:00Z'));
    expect(result.start).toBe('2026-05-11');
    expect(result.end).toBe('2026-05-17');
  });

  it('월요일 입력 → 그 주 월요일 자체', () => {
    const result = getKSTWeekRange(new Date('2026-05-11T03:00:00Z'));
    expect(result.start).toBe('2026-05-11');
    expect(result.end).toBe('2026-05-17');
  });

  it('일요일 입력 → 그 주 월요일 (직전 월요일)', () => {
    // 2026-05-17 (일) UTC 12:00 = KST 21:00 — 그 주 월=2026-05-11
    const result = getKSTWeekRange(new Date('2026-05-17T12:00:00Z'));
    expect(result.start).toBe('2026-05-11');
    expect(result.end).toBe('2026-05-17');
  });

  it('KST 자정 직후 boundary — UTC 일요일 15:00 = KST 월요일 00:00', () => {
    const result = getKSTWeekRange(new Date('2026-05-10T15:00:00Z'));
    expect(result.start).toBe('2026-05-11');
    expect(result.end).toBe('2026-05-17');
  });
});

describe('getKSTMondayUtcIso', () => {
  it('수요일 KST 입력 → 그 주 월요일 00:00 KST 의 UTC ISO', () => {
    // 2026-05-13 (수) UTC 06:00 = KST 15:00 — 월요일 00:00 KST = 일요일 15:00 UTC
    const result = getKSTMondayUtcIso(new Date('2026-05-13T06:00:00Z'));
    expect(result).toBe('2026-05-10T15:00:00.000Z');
  });

  it('월요일 KST 직후 → 같은 월요일 00:00 KST', () => {
    // 2026-05-11 (월) UTC 03:00 = KST 12:00 — 그 주 월요일 00:00 KST
    const result = getKSTMondayUtcIso(new Date('2026-05-11T03:00:00Z'));
    expect(result).toBe('2026-05-10T15:00:00.000Z');
  });

  it('일요일 KST → 직전 월요일 00:00 KST', () => {
    // 2026-05-17 (일) UTC 12:00 = KST 21:00 — 그 주 월요일 = 2026-05-11
    const result = getKSTMondayUtcIso(new Date('2026-05-17T12:00:00Z'));
    expect(result).toBe('2026-05-10T15:00:00.000Z');
  });
});

describe('getKSTMonthStartUtcIso', () => {
  it('5월 중순 KST → 5월 1일 00:00 KST = 4월 30일 15:00 UTC', () => {
    // 2026-05-13 (수) UTC 06:00 = KST 15:00 — 그 달 1일 00:00 KST = 2026-04-30 15:00 UTC
    const result = getKSTMonthStartUtcIso(new Date('2026-05-13T06:00:00Z'));
    expect(result).toBe('2026-04-30T15:00:00.000Z');
  });

  it('5월 1일 직후 KST → 같은 5월 1일 00:00 KST', () => {
    // 2026-05-01 UTC 00:00 = KST 09:00 (이미 5월 1일 KST) → 그 달 1일 = 2026-05-01 00:00 KST = 2026-04-30 15:00 UTC
    const result = getKSTMonthStartUtcIso(new Date('2026-05-01T00:00:00Z'));
    expect(result).toBe('2026-04-30T15:00:00.000Z');
  });

  it('UTC 가 4월 30일 23:00 이지만 KST 가 5월 1일 08:00 → 5월 1일 00:00 KST 반환', () => {
    // 2026-04-30 UTC 23:00 = KST 2026-05-01 08:00 → KST 월초 = 2026-05-01 00:00 KST
    const result = getKSTMonthStartUtcIso(new Date('2026-04-30T23:00:00Z'));
    expect(result).toBe('2026-04-30T15:00:00.000Z');
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

  it('WINNER_PROB_*_PCT = *100 derive (silent drift family wave 108 guard)', () => {
    expect(WINNER_PROB_LEAN_PCT).toBe(55);
    expect(WINNER_PROB_CONFIDENT_PCT).toBe(65);
    expect(WINNER_PROB_LEAN_PCT).toBe(Math.round(WINNER_PROB_LEAN * 100));
    expect(WINNER_PROB_CONFIDENT_PCT).toBe(Math.round(WINNER_PROB_CONFIDENT * 100));
  });

  it('SMALL_SAMPLE_N = 5 (sweep 51 source-of-truth)', () => {
    expect(SMALL_SAMPLE_N).toBe(5);
  });

  it('WINNER_PROB_CLAMP_MIN/MAX = 0.15 / 0.85 (silent drift family wave 93 guard)', () => {
    expect(WINNER_PROB_CLAMP_MIN).toBe(0.15);
    expect(WINNER_PROB_CLAMP_MAX).toBe(0.85);
  });

  it('clampWinnerProb — 범위 안 / 미만 / 초과 / 경계', () => {
    expect(clampWinnerProb(0.5)).toBe(0.5);
    expect(clampWinnerProb(0.1)).toBe(WINNER_PROB_CLAMP_MIN);
    expect(clampWinnerProb(0.9)).toBe(WINNER_PROB_CLAMP_MAX);
    expect(clampWinnerProb(WINNER_PROB_CLAMP_MIN)).toBe(WINNER_PROB_CLAMP_MIN);
    expect(clampWinnerProb(WINNER_PROB_CLAMP_MAX)).toBe(WINNER_PROB_CLAMP_MAX);
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
