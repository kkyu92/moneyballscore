import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SHARED_INDEX = join(__dirname, '../../../../../packages/shared/src/index.ts');

// wave-415 JSDoc sync — FACTOR_PICK_MIN_FACTORS / FACTOR_PICK_STRONG / FACTOR_PICK_COMPLETE
// wave-390/392 섹션 표시 임계로 도입된 상수들이 wave-415 오늘 AI 예측 카드 인라인 배지에도 재사용.
// JSDoc wave-415 누락 = silent drift — cycle 1767 review-code (heavy) 수정.
//
// 재사용 매핑:
//   FACTOR_PICK_MIN_FACTORS  → isPickGame 배지 표시 조건 (|compositeDuelScore| >= 7)
//   FACTOR_PICK_STRONG(8)    → 배지 색상 brand(파랑) 임계
//   FACTOR_PICK_COMPLETE(10) → 배지 색상 accent(골드) 임계

describe('wave-415 JSDoc sync — 상수 wave 참조 가드', () => {
  let src: string;

  beforeAll(() => {
    src = readFileSync(SHARED_INDEX, 'utf-8');
  });

  it('FACTOR_PICK_MIN_FACTORS JSDoc 에 wave-415 참조 존재', () => {
    const block = src.match(/\/\*\*[\s\S]*?FACTOR_PICK_MIN_FACTORS = 7/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-415');
  });

  it('FACTOR_PICK_STRONG JSDoc 에 wave-415 참조 존재', () => {
    const block = src.match(/\/\*\*[\s\S]*?FACTOR_PICK_STRONG = 8/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-415');
  });

  it('FACTOR_PICK_COMPLETE JSDoc 에 wave-415 참조 존재', () => {
    const block = src.match(/\/\*\*[\s\S]*?FACTOR_PICK_COMPLETE = 10/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-415');
  });

  it('FACTOR_PICK_MIN_FACTORS JSDoc — 배지 isPickGame 조건 언급', () => {
    const block = src.match(/\/\*\*[\s\S]*?FACTOR_PICK_MIN_FACTORS = 7/);
    expect(block![0]).toContain('isPickGame');
  });

  it('FACTOR_PICK_STRONG 값 단일 소스 가드 — 8', () => {
    const match = src.match(/export const FACTOR_PICK_STRONG = (\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(8);
  });

  it('FACTOR_PICK_COMPLETE 값 단일 소스 가드 — 10', () => {
    const match = src.match(/export const FACTOR_PICK_COMPLETE = (\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(10);
  });
});
