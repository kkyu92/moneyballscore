import { describe, it, expect } from 'vitest';
import { CURRENT_SCORING_RULE } from '@moneyball/shared';
import {
  isFallbackReasoning,
  presentJudgeReasoning,
  presentJudgeReasoningWithFallback,
  FALLBACK_USER_TEXT,
} from '../judgeReasoning';

// cycle 483 review-code (heavy) — fixture 의 'v1.8' 하드코딩 제거 +
// debate.ts:84 런타임 source (`${CURRENT_SCORING_RULE}`) 와 단일 source 정렬.
// silent drift family streak 26 cycle 째 (테스트 fixture vs 런타임 literal mismatch).
const PREGAME_FALLBACK = `에이전트 토론 불가. 정량 모델 ${CURRENT_SCORING_RULE} 결과 사용.`;
const POSTVIEW_FALLBACK = '사후 분석 LLM 실패. factor 편향 기반 자동 fallback.';

describe('isFallbackReasoning', () => {
  it('null / undefined / empty → false', () => {
    expect(isFallbackReasoning(null)).toBe(false);
    expect(isFallbackReasoning(undefined)).toBe(false);
    expect(isFallbackReasoning('')).toBe(false);
    expect(isFallbackReasoning('   ')).toBe(false);
  });

  it('debate.ts pre_game fallback prefix 감지', () => {
    expect(isFallbackReasoning(PREGAME_FALLBACK)).toBe(true);
    expect(isFallbackReasoning('에이전트 토론 불가')).toBe(true);
  });

  it('postview.ts fallback prefix 감지', () => {
    expect(isFallbackReasoning(POSTVIEW_FALLBACK)).toBe(true);
  });

  it('정상 reasoning → false', () => {
    expect(
      isFallbackReasoning('한화의 불펜 안정성과 홈 어드밴티지가 결합되어 우세.'),
    ).toBe(false);
  });

  it('whitespace prefix trim 후 감지', () => {
    expect(isFallbackReasoning('  에이전트 토론 불가  ')).toBe(true);
  });
});

describe('presentJudgeReasoning', () => {
  it('null / undefined → undefined', () => {
    expect(presentJudgeReasoning(null)).toBeUndefined();
    expect(presentJudgeReasoning(undefined)).toBeUndefined();
  });

  it('empty / whitespace only → undefined', () => {
    expect(presentJudgeReasoning('')).toBeUndefined();
    expect(presentJudgeReasoning('   ')).toBeUndefined();
  });

  it('fallback reasoning → 사용자 문구 swap (dev 용어 scoring_rule leak 차단)', () => {
    expect(presentJudgeReasoning(PREGAME_FALLBACK)).toBe(FALLBACK_USER_TEXT);
    expect(presentJudgeReasoning(POSTVIEW_FALLBACK)).toBe(FALLBACK_USER_TEXT);
  });

  it('정상 reasoning → 원본 그대로', () => {
    const text = '한화의 불펜 안정성과 홈 어드밴티지가 결합되어 우세.';
    expect(presentJudgeReasoning(text)).toBe(text);
  });

  it('maxLength 적용 — 정상 reasoning 만 truncate', () => {
    const long = 'a'.repeat(150);
    expect(presentJudgeReasoning(long, { maxLength: 100 })).toBe(
      'a'.repeat(100) + '...',
    );
  });

  it('maxLength 무시 — fallback 은 swap 우선 (truncate X)', () => {
    expect(
      presentJudgeReasoning(PREGAME_FALLBACK, { maxLength: 10 }),
    ).toBe(FALLBACK_USER_TEXT);
  });

  it('사용자 문구에 scoring_rule / "에이전트 토론" / "factor 편향" dev 용어 부재', () => {
    expect(FALLBACK_USER_TEXT).not.toMatch(/v1\.\d/);
    expect(FALLBACK_USER_TEXT).not.toMatch(/v2\.\d/);
    expect(FALLBACK_USER_TEXT).not.toMatch(/에이전트 토론/);
    expect(FALLBACK_USER_TEXT).not.toMatch(/factor 편향/);
    expect(FALLBACK_USER_TEXT).not.toMatch(/fallback/i);
  });
});

describe('presentJudgeReasoningWithFallback', () => {
  it('null / undefined / empty → undefined', () => {
    expect(presentJudgeReasoningWithFallback(null)).toBeUndefined();
    expect(presentJudgeReasoningWithFallback(undefined)).toBeUndefined();
    expect(presentJudgeReasoningWithFallback('')).toBeUndefined();
    expect(presentJudgeReasoningWithFallback('   ')).toBeUndefined();
  });

  it('fallback reasoning → { text: FALLBACK_USER_TEXT, isFallback: true }', () => {
    expect(
      presentJudgeReasoningWithFallback(PREGAME_FALLBACK),
    ).toEqual({ text: FALLBACK_USER_TEXT, isFallback: true });
    expect(
      presentJudgeReasoningWithFallback(POSTVIEW_FALLBACK),
    ).toEqual({ text: FALLBACK_USER_TEXT, isFallback: true });
  });

  it('정상 reasoning → { text: 원본, isFallback: false }', () => {
    const text = '한화의 불펜 안정성과 홈 어드밴티지가 결합되어 우세.';
    expect(presentJudgeReasoningWithFallback(text)).toEqual({
      text,
      isFallback: false,
    });
  });

  it('정상 reasoning + maxLength → truncate + isFallback false', () => {
    const long = 'a'.repeat(150);
    expect(presentJudgeReasoningWithFallback(long, { maxLength: 100 })).toEqual({
      text: 'a'.repeat(100) + '...',
      isFallback: false,
    });
  });

  it('fallback + maxLength → swap 우선 (truncate X) + isFallback true', () => {
    expect(
      presentJudgeReasoningWithFallback(PREGAME_FALLBACK, { maxLength: 10 }),
    ).toEqual({ text: FALLBACK_USER_TEXT, isFallback: true });
  });
});
