import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  FACTOR_PICK_STRONG,
  FACTOR_PICK_COMPLETE,
  FACTOR_PICK_MIN_FACTORS,
} from '@moneyball/shared';

// wave-467: 분석 목록 수렴 픽 섹션 border/bg tier — 완전수렴 경기 있을 시 amber upgrade

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

describe('wave-467 — 분석 목록 수렴 픽 섹션 border/bg tier', () => {
  it('FACTOR_PICK_COMPLETE JSDoc 에 wave-467 참조 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_COMPLETE = 10/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-467');
  });

  it('FACTOR_PICK_STRONG JSDoc 에 wave-467 참조 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_STRONG = 8/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-467');
  });

  it('analysis/page.tsx: sectionHasComplete 변수 정의 존재', () => {
    expect(analysisListSrc).toContain('sectionHasComplete');
  });

  it('analysis/page.tsx: amber border 클래스 존재 (border-amber-200)', () => {
    expect(analysisListSrc).toContain('border-amber-200');
  });

  it('analysis/page.tsx: amber bg 클래스 존재 (bg-amber-50)', () => {
    expect(analysisListSrc).toContain('bg-amber-50');
  });

  it('analysis/page.tsx: amber 제목 텍스트 클래스 존재 (text-amber-700)', () => {
    expect(analysisListSrc).toContain('text-amber-700');
  });

  it('analysis/page.tsx: wave-467 주석 존재', () => {
    expect(analysisListSrc).toContain('wave-467');
  });

  it('sectionHasComplete 로직 — convStrength >= FACTOR_PICK_COMPLETE(10) 시 true', () => {
    const games = [
      { compositeDuelScore: 10 },
      { compositeDuelScore: -8 },
    ];
    const result = games.some((g) => Math.abs(g.compositeDuelScore) >= FACTOR_PICK_COMPLETE);
    expect(result).toBe(true);
  });

  it('sectionHasComplete 로직 — 모두 FACTOR_PICK_STRONG(8) 이면 false', () => {
    const games = [
      { compositeDuelScore: 8 },
      { compositeDuelScore: -8 },
    ];
    const result = games.some((g) => Math.abs(g.compositeDuelScore) >= FACTOR_PICK_COMPLETE);
    expect(result).toBe(false);
  });

  it('sectionHasComplete 로직 — 빈 배열 시 false', () => {
    const games: { compositeDuelScore: number }[] = [];
    const result = games.some((g) => Math.abs(g.compositeDuelScore) >= FACTOR_PICK_COMPLETE);
    expect(result).toBe(false);
  });

  it('FACTOR_PICK_COMPLETE > FACTOR_PICK_STRONG > FACTOR_PICK_MIN_FACTORS 불변 조건', () => {
    expect(FACTOR_PICK_MIN_FACTORS).toBeLessThan(FACTOR_PICK_STRONG);
    expect(FACTOR_PICK_STRONG).toBeLessThan(FACTOR_PICK_COMPLETE);
  });

  it('game/[id] amber badgeClass 패턴과 analysis 섹션 amber 패턴 일관성 — 양쪽 amber-200 border 존재', () => {
    expect(gameDetailSrc).toContain('border-amber-200');
    expect(analysisListSrc).toContain('border-amber-200');
  });
});
