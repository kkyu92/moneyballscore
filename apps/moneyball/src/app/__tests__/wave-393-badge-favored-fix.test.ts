import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMPOSITE_DUEL_THRESHOLD } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-393 — 종합 우세 배지 우세 팀 오결정 fix (cycle 1737)', () => {
  it('COMPOSITE_DUEL_THRESHOLD = 3', () => {
    expect(COMPOSITE_DUEL_THRESHOLD).toBe(3);
  });

  it('analysis page 배지 로직에 compositeDuelScore 기준 우세 팀 결정 박제', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('const score = g.compositeDuelScore!;');
  });

  it('analysis page 배지 로직에 score === 0 null-return 박제', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('if (score === 0) return null;');
  });

  it('analysis page 배지 로직에 count < COMPOSITE_DUEL_THRESHOLD null-return 박제', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('if (count < COMPOSITE_DUEL_THRESHOLD) return null;');
  });

  it('analysis page 배지 로직에 hw >= COMPOSITE_DUEL_THRESHOLD 단독 우세 판별 제거 확인', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).not.toContain('const favoredAway = aw >= COMPOSITE_DUEL_THRESHOLD;');
  });

  it('wave-393 comment 박제 확인', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('wave-393');
  });
});

describe('wave-393 badge logic — 우세 팀 결정 시뮬레이션', () => {
  function badgeFavored(hw: number, aw: number, score: number): { favoredHome: boolean; count: number } | null {
    if (score === 0) return null;
    const favoredHome = score > 0;
    const count = favoredHome ? hw : aw;
    if (count < COMPOSITE_DUEL_THRESHOLD) return null;
    return { favoredHome, count };
  }

  it('hw=4, aw=6, score=-2 → away 우세 (fix 전 home 오결정)', () => {
    const result = badgeFavored(4, 6, -2);
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(false);
    expect(result!.count).toBe(6);
  });

  it('hw=3, aw=7, score=-4 → away 우세', () => {
    const result = badgeFavored(3, 7, -4);
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(false);
    expect(result!.count).toBe(7);
  });

  it('hw=6, aw=4, score=2 → home 우세', () => {
    const result = badgeFavored(6, 4, 2);
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(true);
    expect(result!.count).toBe(6);
  });

  it('hw=5, aw=5, score=0 → null (동점)', () => {
    expect(badgeFavored(5, 5, 0)).toBeNull();
  });

  it('hw=2, aw=0, score=2 → count 2 < threshold → null', () => {
    expect(badgeFavored(2, 0, 2)).toBeNull();
  });

  it('hw=0, aw=3, score=-3 → away 우세, count 3 >= threshold', () => {
    const result = badgeFavored(0, 3, -3);
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(false);
    expect(result!.count).toBe(3);
  });

  it('hw=7, aw=3, score=4 → home 우세, count 7', () => {
    const result = badgeFavored(7, 3, 4);
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(true);
    expect(result!.count).toBe(7);
  });
});
