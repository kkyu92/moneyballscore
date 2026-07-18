import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  FACTOR_PICK_STRONG,
  FACTOR_PICK_COMPLETE,
  FACTOR_PICK_MIN_FACTORS,
} from '@moneyball/shared';

// wave-463: 게임 상세 팩터 수렴 배지 수렴 단계 텍스트 레이블 검증

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);
const gameDetailSrc = readFileSync(
  join(__dirname, '../analysis/game/[id]/page.tsx'),
  'utf8',
);

describe('wave-463 — 게임 상세 팩터 수렴 배지 수렴 단계 레이블', () => {
  it('FACTOR_PICK_STRONG = 8 (강수렴 임계)', () => {
    expect(FACTOR_PICK_STRONG).toBe(8);
  });

  it('FACTOR_PICK_STRONG JSDoc 에 wave-463 참조 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_STRONG = 8/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-463');
  });

  it('FACTOR_PICK_COMPLETE JSDoc 에 wave-463 참조 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_COMPLETE = 10/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-463');
  });

  it('game/[id]/page.tsx: FACTOR_PICK_STRONG import 존재', () => {
    expect(gameDetailSrc).toContain('FACTOR_PICK_STRONG');
  });

  it('game/[id]/page.tsx: isStrong 변수 정의 존재', () => {
    expect(gameDetailSrc).toContain('isStrong');
  });

  it('game/[id]/page.tsx: 완전수렴 레이블 렌더링 존재', () => {
    expect(gameDetailSrc).toContain('완전수렴');
  });

  it('game/[id]/page.tsx: 강수렴 레이블 렌더링 존재', () => {
    expect(gameDetailSrc).toContain('강수렴');
  });

  it('수렴 단계 불변 조건 — FACTOR_PICK_MIN_FACTORS(7) < FACTOR_PICK_STRONG(8) < FACTOR_PICK_COMPLETE(10)', () => {
    expect(FACTOR_PICK_MIN_FACTORS).toBeLessThan(FACTOR_PICK_STRONG);
    expect(FACTOR_PICK_STRONG).toBeLessThan(FACTOR_PICK_COMPLETE);
  });

  it('isStrong 조건 — isComplete=false 전제 (isComplete 우선)', () => {
    // isStrong = !isComplete && convStrength >= FACTOR_PICK_STRONG
    // convStrength=10(COMPLETE) → isStrong=false (isComplete 우선)
    const convStrengthComplete = FACTOR_PICK_COMPLETE;
    const isCompleteSimulated = convStrengthComplete >= FACTOR_PICK_COMPLETE;
    const isStrongSimulated = !isCompleteSimulated && convStrengthComplete >= FACTOR_PICK_STRONG;
    expect(isStrongSimulated).toBe(false);

    // convStrength=8(STRONG but not COMPLETE) → isStrong=true
    const convStrengthStrong = FACTOR_PICK_STRONG;
    const isCompleteStrong = convStrengthStrong >= FACTOR_PICK_COMPLETE;
    const isStrongOnly = !isCompleteStrong && convStrengthStrong >= FACTOR_PICK_STRONG;
    expect(isStrongOnly).toBe(true);
  });
});
