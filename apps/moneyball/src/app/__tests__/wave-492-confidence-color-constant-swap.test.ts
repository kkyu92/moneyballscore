import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  getConfidenceColor,
  getConfidenceTierLabel,
  WINNER_PROB_CONFIDENT_PCT,
  WINNER_PROB_LEAN_PCT,
} from '@moneyball/shared';

// wave-492: getConfidenceColor + getConfidenceTierLabel magic number 상수 swap
// review-code (heavy) — cycle 1858
// Feature-Drift Cycle: explore-idea (wave-491) → review-code (wave-492)
// silent drift family: JSDoc "WINNER_PROB_CONFIDENT_PCT 동일 임계 사용" 주장 vs 실제 65/55 magic

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

// 함수 본문 추출 helper
function extractFnBody(src: string, fnName: string): string {
  const start = src.indexOf(`function ${fnName}`);
  if (start === -1) return '';
  const open = src.indexOf('{', start);
  let depth = 0;
  let i = open;
  while (i < src.length) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') depth--;
    if (depth === 0) break;
    i++;
  }
  return src.slice(open, i + 1);
}

describe('wave-492 — confidence 상수 swap (magic 65/55 제거)', () => {
  it('getConfidenceColor — 본문에 magic 65 없음', () => {
    const body = extractFnBody(sharedSrc, 'getConfidenceColor');
    expect(body).not.toContain('>= 65');
    expect(body).not.toContain('>= 55');
  });

  it('getConfidenceTierLabel — 본문에 magic 65 없음', () => {
    const body = extractFnBody(sharedSrc, 'getConfidenceTierLabel');
    expect(body).not.toContain('>= 65');
    expect(body).not.toContain('>= 55');
  });

  it('getConfidenceColor — WINNER_PROB_CONFIDENT_PCT 상수 참조', () => {
    const body = extractFnBody(sharedSrc, 'getConfidenceColor');
    expect(body).toContain('WINNER_PROB_CONFIDENT_PCT');
    expect(body).toContain('WINNER_PROB_LEAN_PCT');
  });

  it('getConfidenceTierLabel — WINNER_PROB_CONFIDENT_PCT 상수 참조', () => {
    const body = extractFnBody(sharedSrc, 'getConfidenceTierLabel');
    expect(body).toContain('WINNER_PROB_CONFIDENT_PCT');
    expect(body).toContain('WINNER_PROB_LEAN_PCT');
  });

  it('wave-492 JSDoc 존재 (silent drift family 박제)', () => {
    expect(sharedSrc).toContain('wave 492');
  });

  // 런타임 동작 — 상수 값이 65/55 이므로 기존 동작 동일 보장
  it('getConfidenceColor — CONFIDENT_PCT 경계 green', () => {
    expect(getConfidenceColor(WINNER_PROB_CONFIDENT_PCT)).toBe('text-green-600');
    expect(getConfidenceColor(WINNER_PROB_CONFIDENT_PCT + 10)).toBe('text-green-600');
  });

  it('getConfidenceColor — LEAN_PCT 경계 yellow', () => {
    expect(getConfidenceColor(WINNER_PROB_LEAN_PCT)).toBe('text-yellow-600');
    expect(getConfidenceColor(WINNER_PROB_CONFIDENT_PCT - 1)).toBe('text-yellow-600');
  });

  it('getConfidenceColor — LEAN_PCT 미만 gray', () => {
    expect(getConfidenceColor(WINNER_PROB_LEAN_PCT - 1)).toBe('text-gray-600');
    expect(getConfidenceColor(0)).toBe('text-gray-600');
  });

  it('getConfidenceTierLabel — CONFIDENT_PCT 경계 강한 예측', () => {
    expect(getConfidenceTierLabel(WINNER_PROB_CONFIDENT_PCT)).toBe('강한 예측');
    expect(getConfidenceTierLabel(WINNER_PROB_CONFIDENT_PCT + 10)).toBe('강한 예측');
  });

  it('getConfidenceTierLabel — LEAN_PCT 경계 보통', () => {
    expect(getConfidenceTierLabel(WINNER_PROB_LEAN_PCT)).toBe('보통');
    expect(getConfidenceTierLabel(WINNER_PROB_CONFIDENT_PCT - 1)).toBe('보통');
  });

  it('getConfidenceTierLabel — LEAN_PCT 미만 박빙', () => {
    expect(getConfidenceTierLabel(WINNER_PROB_LEAN_PCT - 1)).toBe('박빙');
    expect(getConfidenceTierLabel(0)).toBe('박빙');
  });
});
