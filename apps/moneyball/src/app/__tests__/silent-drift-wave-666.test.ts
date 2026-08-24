import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

const TARGETS = [
  'src/app/matchup/[teamA]/[teamB]/page.tsx',
  'src/app/mlb/matchup/[teamA]/[teamB]/page.tsx',
  'src/app/en/mlb/matchup/[teamA]/[teamB]/page.tsx',
];

describe('silent drift wave 666 — matchup 페이지 3종 "AI 예측 성과(이 매치업 한정)" 소표본 게이트 부재 (review-code heavy, cycle 2545)', () => {
  for (const target of TARGETS) {
    const src = readFileSync(join(ROOT, target), 'utf8');

    it(`${target} imports SMALL_SAMPLE_N from shared`, () => {
      expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
    });

    it(`${target} gates predictionAccuracy display color with SMALL_SAMPLE_N`, () => {
      expect(src).toMatch(/predictionAccuracy\.verified\s*<\s*SMALL_SAMPLE_N/);
    });

    it(`${target} surfaces an inline small-sample note`, () => {
      expect(src).toMatch(/경기 수 적음|small sample/);
    });
  }
});
