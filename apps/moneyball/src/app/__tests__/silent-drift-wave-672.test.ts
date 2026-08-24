import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 672 — 커뮤니티 vs AI 대결 / MLB accuracy 히어로 소표본 게이트 부재 (review-code heavy, cycle 2553)', () => {
  describe('app/accuracy/page.tsx (KBO 커뮤니티 vs AI 인라인)', () => {
    const src = readFileSync(join(ROOT, 'src/app/accuracy/page.tsx'), 'utf8');

    it('gates the AI accuracy stat with SMALL_SAMPLE_N (aiGamesWithPoll)', () => {
      expect(src).toMatch(/communityStats\.aiGamesWithPoll\s*<\s*SMALL_SAMPLE_N/);
    });

    it('surfaces an inline small-sample note near the AI stat', () => {
      expect(src).toMatch(/소표본\(n<\$\{SMALL_SAMPLE_N\}\)/);
    });
  });

  describe('components/accuracy/CommunityVsAICard.tsx (MLB 공유 컴포넌트)', () => {
    const src = readFileSync(join(ROOT, 'src/components/accuracy/CommunityVsAICard.tsx'), 'utf8');

    it('imports SMALL_SAMPLE_N from shared', () => {
      expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
    });

    it('gates the AI accuracy stat with SMALL_SAMPLE_N', () => {
      expect(src).toMatch(/stats\.aiGamesWithPoll\s*<\s*SMALL_SAMPLE_N/);
    });

    it('has locale-aware small-sample copy for both ko/en', () => {
      expect(src).toMatch(/smallSample:\s*\(n\)\s*=>/);
      expect(src).toMatch(/smallSampleNote:\s*\(n\)\s*=>/);
    });
  });

  describe('components/accuracy/MlbAccuracyDashboard.tsx (MLB 히어로 전체 적중률)', () => {
    const src = readFileSync(join(ROOT, 'src/components/accuracy/MlbAccuracyDashboard.tsx'), 'utf8');

    it('imports SMALL_SAMPLE_N from shared', () => {
      expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
    });

    it('gates the hero accuracy StatCard sub-label with SMALL_SAMPLE_N', () => {
      expect(src).toMatch(/verifiedN\s*>\s*0\s*&&\s*verifiedN\s*<\s*SMALL_SAMPLE_N/);
    });

    it('does not accent the hero accuracy stat when verifiedN is below SMALL_SAMPLE_N', () => {
      expect(src).toMatch(/accuracyRate >= ACCURACY_BASELINE && verifiedN >= SMALL_SAMPLE_N/);
    });

    it('no longer hardcodes the small-sample threshold as a literal 5', () => {
      expect(src).not.toMatch(/b\.n\s*<\s*5(?!\d)/);
      expect(src).not.toMatch(/verifiedN\s*>=\s*5(?!\d)/);
    });
  });
});
