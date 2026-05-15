import { describe, it, expect } from 'vitest';
import {
  isFallbackReasoning,
  presentJudgeReasoning,
  FALLBACK_USER_TEXT,
} from '../judgeReasoning';

describe('isFallbackReasoning', () => {
  it('null / undefined / empty → false', () => {
    expect(isFallbackReasoning(null)).toBe(false);
    expect(isFallbackReasoning(undefined)).toBe(false);
    expect(isFallbackReasoning('')).toBe(false);
    expect(isFallbackReasoning('   ')).toBe(false);
  });

  it('debate.ts pre_game fallback prefix 감지', () => {
    expect(
      isFallbackReasoning('에이전트 토론 불가. 정량 모델 v1.8 결과 사용.'),
    ).toBe(true);
    expect(isFallbackReasoning('에이전트 토론 불가')).toBe(true);
  });

  it('postview.ts fallback prefix 감지', () => {
    expect(
      isFallbackReasoning('사후 분석 LLM 실패. factor 편향 기반 자동 fallback.'),
    ).toBe(true);
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

  it('fallback reasoning → 사용자 문구 swap (dev 용어 v1.8 leak 차단)', () => {
    expect(
      presentJudgeReasoning('에이전트 토론 불가. 정량 모델 v1.8 결과 사용.'),
    ).toBe(FALLBACK_USER_TEXT);
    expect(
      presentJudgeReasoning('사후 분석 LLM 실패. factor 편향 기반 자동 fallback.'),
    ).toBe(FALLBACK_USER_TEXT);
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
      presentJudgeReasoning('에이전트 토론 불가. 정량 모델 v1.8 결과 사용.', {
        maxLength: 10,
      }),
    ).toBe(FALLBACK_USER_TEXT);
  });

  it('사용자 문구에 "v1.8" / "에이전트 토론" / "factor 편향" dev 용어 부재', () => {
    expect(FALLBACK_USER_TEXT).not.toMatch(/v1\.\d/);
    expect(FALLBACK_USER_TEXT).not.toMatch(/에이전트 토론/);
    expect(FALLBACK_USER_TEXT).not.toMatch(/factor 편향/);
    expect(FALLBACK_USER_TEXT).not.toMatch(/fallback/i);
  });
});
