import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 671 — 리더보드 AI 적중률 베이스라인 소표본 게이트 부재 (review-code heavy, cycle 2552)', () => {
  describe('components/leaderboard/LeaderboardTable.tsx', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/leaderboard/LeaderboardTable.tsx'),
      'utf8',
    );

    it('imports SMALL_SAMPLE_N from shared', () => {
      expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
    });

    it('gates the AI 적중률 베이스라인 with SMALL_SAMPLE_N', () => {
      expect(src).toMatch(/aiBaseline\.total\s*<\s*SMALL_SAMPLE_N/);
    });

    it('surfaces an inline small-sample note near the AI baseline stat', () => {
      expect(src).toMatch(/소표본\(n&lt;\{SMALL_SAMPLE_N\}\)/);
    });
  });
});
