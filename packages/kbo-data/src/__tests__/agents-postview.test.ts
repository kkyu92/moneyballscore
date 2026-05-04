import { describe, it, expect } from 'vitest';
import {
  deriveFactorErrorsFallback,
  getZeroWeightFactorPromptList,
  isWeightedFactor,
  JUDGE_POSTVIEW_SYSTEM,
  TEAM_POSTVIEW_SYSTEM,
} from '../agents/postview';
import { SYSTEM_PROMPT as JUDGE_PREGAME_SYSTEM } from '../agents/judge-agent';

describe('isWeightedFactor', () => {
  it('v1.7-revert: 모든 active factor (10종 + home_/away_ prefix 포함) 통과', () => {
    expect(isWeightedFactor('sp_fip')).toBe(true);
    expect(isWeightedFactor('home_lineup_woba')).toBe(true);
    expect(isWeightedFactor('away_bullpen_fip')).toBe(true);
    expect(isWeightedFactor('home_recent_form')).toBe(true);
    expect(isWeightedFactor('war')).toBe(true);
    expect(isWeightedFactor('home_sp_xfip')).toBe(true);
    expect(isWeightedFactor('elo')).toBe(true);
    expect(isWeightedFactor('head_to_head')).toBe(true);
    expect(isWeightedFactor('home_park_factor')).toBe(true);
    expect(isWeightedFactor('away_sfr')).toBe(true);
  });

  it('알려지지 않은 factor 차단 (helper 메커니즘 자체 — 가중치 0 또는 미정의 시 차단)', () => {
    expect(isWeightedFactor('unknown')).toBe(false);
    expect(isWeightedFactor('')).toBe(false);
  });
});

describe('deriveFactorErrorsFallback', () => {
  it('홈승인데 가중치 factor 가 away 쪽 편향 → 그 factor 지목 (v1.7-revert: park_factor 도 가중치 > 0)', () => {
    const factors = {
      home_sp_fip: 0.4, // 원정 유리 편향, 홈승 → wrong (weighted)
      home_lineup_woba: 0.6, // 홈 유리, 홈승 → correct
      park_factor: 0.35, // 원정 유리 편향, 홈승 → wrong (v1.5 회귀 후 가중치 4% > 0 → 후보)
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toHaveLength(2);
    const factorNames = errors.map((e) => e.factor);
    expect(factorNames).toContain('home_sp_fip');
    expect(factorNames).toContain('park_factor');
  });

  it('원정승인데 factor가 home 쪽 편향 → 그 factor 지목', () => {
    const factors = {
      home_sp_fip: 0.7, // 홈 편향, 원정승 → wrong
      home_bullpen_fip: 0.5, // 중립
      home_recent_form: 0.55, // 홈 편향, 원정승 → wrong (작음)
    };
    const errors = deriveFactorErrorsFallback(factors, false);
    expect(errors).toHaveLength(2);
    expect(errors[0].factor).toBe('home_sp_fip');
    expect(errors[0].predictedBias).toBeCloseTo(0.2, 2);
  });

  it('모든 factor가 결과와 일치 방향 → 빈 배열', () => {
    const factors = {
      home_sp_fip: 0.7,
      home_lineup_woba: 0.65,
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toEqual([]);
  });

  it('알려지지 않은 factor 만 들어오면 빈 배열 (helper 메커니즘: 미정의 차단)', () => {
    const factors = {
      home_unknown_a: 0.2,
      unknown_b: 0.7,
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toEqual([]);
  });

  it('상위 3개까지만 반환 (가중치 factor 만)', () => {
    const factors = {
      home_sp_fip: 0.2,
      home_sp_xfip: 0.25,
      home_bullpen_fip: 0.3,
      home_recent_form: 0.35,
      home_war: 0.4,
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toHaveLength(3);
    expect(errors.map((e) => e.factor)).toEqual([
      'home_sp_fip',
      'home_sp_xfip',
      'home_bullpen_fip',
    ]);
  });

  it('diagnosis에 편향 수치 포함', () => {
    const factors = { home_sp_fip: 0.3 };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors[0].diagnosis).toContain('-0.20');
    expect(errors[0].diagnosis).toContain('반대 방향');
  });
});

// cycle 15 — prompt-level constraint dynamic injection 검증.
// cycle 12 의 사후 filter (factorErrors 배열) 는 LLM reasoning 본문에서 0% factor 거론을 막지 못함.
// cycle 15 가 3 prompt 에 `getZeroWeightFactorPromptList()` 동적 주입 → DEFAULT_WEIGHTS 변경 시 자동 동기화.
// cycle 17 v1.5 회귀 후엔 모든 factor 가중치 > 0 → helper 빈 문자열 반환 → prompt constraint vacuous.
describe('getZeroWeightFactorPromptList (cycle 15 helper)', () => {
  it('v1.7-revert (= v1.5): 모든 factor 가중치 > 0 — 빈 문자열 반환', () => {
    const list = getZeroWeightFactorPromptList();
    expect(list).toBe('');
  });

  it('어떤 active factor (sp_fip / lineup_woba / elo) 도 미포함', () => {
    const list = getZeroWeightFactorPromptList();
    expect(list).not.toContain('sp_fip');
    expect(list).not.toContain('lineup_woba');
    expect(list).not.toContain('elo');
  });
});

describe('LLM SYSTEM_PROMPT dynamic injection 메커니즘 박제 (cycle 15)', () => {
  it('JUDGE_POSTVIEW_SYSTEM: dynamic injection 자리 + 정량 모델 컨텍스트 박제', () => {
    expect(JUDGE_POSTVIEW_SYSTEM).toContain('가중치 0%');
    expect(JUDGE_POSTVIEW_SYSTEM).toContain('사용 금지');
  });

  it('TEAM_POSTVIEW_SYSTEM: dynamic injection 자리 + keyFactor 지목 금지 박제', () => {
    expect(TEAM_POSTVIEW_SYSTEM).toContain('가중치 0%');
    expect(TEAM_POSTVIEW_SYSTEM).toContain('keyFactor');
    expect(TEAM_POSTVIEW_SYSTEM).toContain('금지');
  });

  it('JUDGE_PREGAME (judge-agent SYSTEM_PROMPT): dynamic injection 자리 + 사용 금지 박제', () => {
    expect(JUDGE_PREGAME_SYSTEM).toContain('가중치 0%');
    expect(JUDGE_PREGAME_SYSTEM).toContain('사용 금지');
  });

  it('3 prompt 모두 정량 모델 가중치 컨텍스트 (왜 금지인지) 박제', () => {
    for (const prompt of [JUDGE_POSTVIEW_SYSTEM, TEAM_POSTVIEW_SYSTEM, JUDGE_PREGAME_SYSTEM]) {
      expect(prompt).toMatch(/정량 모델 가중치|확률.*기여|확률 형성/);
    }
  });
});
