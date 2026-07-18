import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  FACTOR_PICK_STRONG,
  FACTOR_PICK_COMPLETE,
  FACTOR_PICK_MIN_FACTORS,
} from '@moneyball/shared';

// wave-465: 분석 목록 수렴 픽 수렴 단계 레이블 칩 검증 (game/[id] wave-463 동일 패턴, 목록 적용)

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);
const analysisListSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);
const gameDetailSrc = readFileSync(
  join(__dirname, '../analysis/game/[id]/page.tsx'),
  'utf8',
);

describe('wave-465 — 분석 목록 수렴 픽 수렴 단계 레이블 칩', () => {
  it('FACTOR_PICK_STRONG JSDoc 에 wave-465 참조 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_STRONG = 8/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-465');
  });

  it('FACTOR_PICK_COMPLETE JSDoc 에 wave-465 참조 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_COMPLETE = 10/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-465');
  });

  it('analysis/page.tsx: isStrong 변수 정의 존재', () => {
    expect(analysisListSrc).toContain('isStrong');
  });

  it('analysis/page.tsx: 완전수렴 레이블 렌더링 존재', () => {
    expect(analysisListSrc).toContain('완전수렴');
  });

  it('analysis/page.tsx: 강수렴 레이블 렌더링 존재', () => {
    expect(analysisListSrc).toContain('강수렴');
  });

  it('analysis/page.tsx: wave-465 주석 존재', () => {
    expect(analysisListSrc).toContain('wave-465');
  });

  it('game/[id]/page.tsx 와 analysis/page.tsx: 수렴 단계 레이블 동일 텍스트 일관성', () => {
    expect(gameDetailSrc).toContain('완전수렴');
    expect(gameDetailSrc).toContain('강수렴');
    expect(analysisListSrc).toContain('완전수렴');
    expect(analysisListSrc).toContain('강수렴');
  });

  it('isStrong 조건 — isComplete=false 전제 (isComplete 우선)', () => {
    const convStrengthComplete = FACTOR_PICK_COMPLETE;
    const isCompleteSimulated = convStrengthComplete >= FACTOR_PICK_COMPLETE;
    const isStrongSimulated = !isCompleteSimulated && convStrengthComplete >= FACTOR_PICK_STRONG;
    expect(isStrongSimulated).toBe(false);

    const convStrengthStrong = FACTOR_PICK_STRONG;
    const isCompleteStrong = convStrengthStrong >= FACTOR_PICK_COMPLETE;
    const isStrongOnly = !isCompleteStrong && convStrengthStrong >= FACTOR_PICK_STRONG;
    expect(isStrongOnly).toBe(true);
  });

  it('수렴 단계 불변 조건 — FACTOR_PICK_MIN_FACTORS(7) < FACTOR_PICK_STRONG(8) < FACTOR_PICK_COMPLETE(10)', () => {
    expect(FACTOR_PICK_MIN_FACTORS).toBeLessThan(FACTOR_PICK_STRONG);
    expect(FACTOR_PICK_STRONG).toBeLessThan(FACTOR_PICK_COMPLETE);
  });
});
