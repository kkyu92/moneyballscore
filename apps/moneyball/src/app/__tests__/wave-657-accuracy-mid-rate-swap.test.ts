import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ACCURACY_MID_RATE } from '@moneyball/shared';

// silent drift family wave 657 (cycle 2337): 3단계(brand/yellow/red) 적중률 색상
// 배지 중 "yellow" 하한이 7 callsite 모두 `>= 0.5` 로 하드코딩 — 단일 source 부재.

const TARGET_FILES = [
  'teams/[code]/page.tsx',
  'mlb/team/[code]/page.tsx',
  'en/mlb/team/[code]/page.tsx',
  'mlb/reviews/monthly/[month]/page.tsx',
  'mlb/reviews/weekly/[week]/page.tsx',
  'reviews/monthly/[month]/page.tsx',
  'reviews/weekly/[week]/page.tsx',
];

describe('wave-657 — accuracy 3단계 색상 yellow 하한 ACCURACY_MID_RATE 단일 source', () => {
  it('ACCURACY_MID_RATE = 0.5', () => {
    expect(ACCURACY_MID_RATE).toBe(0.5);
  });

  it.each(TARGET_FILES)('%s: ACCURACY_MID_RATE 임포트 + 하드코딩 0.5 부재', (rel) => {
    const src = readFileSync(join(__dirname, '..', rel), 'utf-8');
    expect(src).toContain('ACCURACY_MID_RATE');
    expect(src).not.toMatch(/>=\s*0\.5(?!\d)/);
  });
});
