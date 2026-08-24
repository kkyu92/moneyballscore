import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 670 — dashboard 시즌/확신구간/적중예측 적중률 소표본 게이트 부재 (review-code heavy, cycle 2550)', () => {
  describe('components/dashboard/AccuracySummary.tsx', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/dashboard/AccuracySummary.tsx'),
      'utf8',
    );

    it('imports SMALL_SAMPLE_N from shared', () => {
      expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
    });

    it('gates the 시즌 적중률 total stat with SMALL_SAMPLE_N', () => {
      expect(src).toMatch(/total\s*<\s*SMALL_SAMPLE_N/);
    });

    it('gates each confidence tier row with SMALL_SAMPLE_N', () => {
      expect(src).toMatch(/stat\.total\s*<\s*SMALL_SAMPLE_N/);
    });

    it('surfaces an inline small-sample note near the stats', () => {
      expect(src).toMatch(/소표본\(n<\$\{SMALL_SAMPLE_N\}\)/);
    });
  });

  describe('app/dashboard/page.tsx', () => {
    const src = readFileSync(join(ROOT, 'src/app/dashboard/page.tsx'), 'utf8');

    it('imports SMALL_SAMPLE_N from shared', () => {
      expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
    });

    it('gates the 적중 예측 적중률 card with SMALL_SAMPLE_N', () => {
      expect(src).toMatch(/confidentStat\.total\s*<\s*SMALL_SAMPLE_N/);
    });

    it('surfaces an inline small-sample note near the stat', () => {
      expect(src).toMatch(/소표본\(n&lt;\{SMALL_SAMPLE_N\}\)/);
    });
  });
});
