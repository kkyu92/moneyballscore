/**
 * /accuracy/shadow pair prob 추출 silent drift regression — cycle 1013.
 *
 * silent drift family: shadow row 의 reasoning 이 `[v2.1-B-shadow quant only] ${v1.8 reasoning}`
 * 형식이라 NN% regex 가 v1.8 prob 매칭 → shadowProb === v18Prob 으로 silent.
 * 본 test 가 shadow 는 factors 가중합 path 강제 (regex 패턴 무시) 확인.
 */

import { describe, it, expect } from 'vitest';
import { pairProbForRow, extractProbText } from '../shadow-pair-prob';
import { SHADOW_SCORING_RULE, CURRENT_SCORING_RULE } from '@moneyball/shared';

describe('pairProbForRow — shadow vs v1.8 path 분기', () => {
  // shadow row 의 reasoning 에 v1.8 의 prob 텍스트 (62%) 가 prefix 됨.
  // 직전 buggy path: regex 가 "62%" 매칭 → shadowProb=0.62. shadow factors 무시.
  // fix: scoring_rule === SHADOW_SCORING_RULE 시 factors 가중합 → 다른 prob.
  const shadowReasoningWithV18Prefix = '[v2.1-B-shadow quant only] 두산 승리 예측 (62%). 주요 근거: ...';

  const factorsBalanced: Record<string, number> = {
    sp_fip: 0.55,
    sp_xfip: 0.52,
    lineup_woba: 0.6,
    bullpen_fip: 0.5,
    recent_form: 0.55,
    war: 0.5,
    head_to_head: 0.5,
    park_factor: 0.5,
    elo: 0.55,
    sfr: 0.5,
    park_weather: 0.5,
    umpire_sz: 0.5,
  };

  it('shadow row → factors 가중합 path (reasoning regex 무시)', () => {
    const prob = pairProbForRow(SHADOW_SCORING_RULE, shadowReasoningWithV18Prefix, factorsBalanced);
    expect(prob).not.toBeNull();
    // SHADOW_WEIGHTS 가중합 + HOME_ADVANTAGE 0.015 결과. regex 가 매칭한 0.62 와 달라야 함.
    expect(prob).not.toBe(0.62);
    // 0.15~0.85 clamp 안.
    expect(prob).toBeGreaterThanOrEqual(0.15);
    expect(prob).toBeLessThanOrEqual(0.85);
  });

  it('v1.8 row → reasoning regex path 유지', () => {
    const v18Reasoning = 'LG 승리 예측 (58%). 주요 근거: 선발투수 FIP(LG 유리), ...';
    const prob = pairProbForRow(CURRENT_SCORING_RULE, v18Reasoning, factorsBalanced);
    expect(prob).toBe(0.58);
  });

  it('v1.8 row JSONB reasoning → debate.verdict.homeWinProb path', () => {
    const v18Json = {
      debate: { verdict: { homeWinProb: 0.65, reasoning: 'verdict text' } },
    };
    const prob = pairProbForRow(CURRENT_SCORING_RULE, v18Json, factorsBalanced);
    expect(prob).toBe(0.65);
  });

  it('shadow row 의 factors null → null 반환 (regex fallback 차단)', () => {
    const prob = pairProbForRow(SHADOW_SCORING_RULE, shadowReasoningWithV18Prefix, null);
    expect(prob).toBeNull();
  });

  it('shadow row + factors 부재 key → SHADOW_WEIGHTS neutral fallback', () => {
    // factors 안 park_weather / umpire_sz 부재 → 0.5 neutral → 가중합 영향 0.
    const factorsNoShadow: Record<string, number> = {
      sp_fip: 0.5,
      lineup_woba: 0.5,
      elo: 0.5,
      // 나머지 key 부재
    };
    const prob = pairProbForRow(SHADOW_SCORING_RULE, '', factorsNoShadow);
    expect(prob).not.toBeNull();
    expect(prob).toBeGreaterThanOrEqual(0.15);
    expect(prob).toBeLessThanOrEqual(0.85);
  });
});

describe('extractProbText — reasoning 형식별 텍스트 추출', () => {
  it('string reasoning 그대로 반환', () => {
    expect(extractProbText('text 62%')).toBe('text 62%');
  });

  it('JSONB { reasoning: "..." } 형식 안 reasoning 필드 추출', () => {
    expect(extractProbText({ reasoning: 'nested 58%' })).toBe('nested 58%');
  });

  it('JSONB debate.verdict.homeWinProb 형식 → NN% 텍스트 합성', () => {
    expect(extractProbText({ debate: { verdict: { homeWinProb: 0.7 } } })).toBe('70%');
  });

  it('JSONB debate.verdict.reasoning 형식 추출', () => {
    expect(
      extractProbText({ debate: { verdict: { reasoning: 'verdict reason 55%' } } }),
    ).toBe('verdict reason 55%');
  });

  it('null/undefined → 빈 문자열', () => {
    expect(extractProbText(null)).toBe('');
    expect(extractProbText(undefined)).toBe('');
  });
});
