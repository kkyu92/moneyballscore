/**
 * wave-243 regression guard — stale PLAN_v5 + cycle-ref annotations removed.
 * Files: debug/pipeline, predictions/page, reviews/page,
 *        predictions/[date]/page, config/model
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP = join(__dirname, '../../..');
const read = (rel: string) => readFileSync(join(APP, rel), 'utf8');

describe('wave-243: stale PLAN_v5 + cycle-ref annotations removed', () => {
  describe('debug/pipeline/page.tsx', () => {
    const src = read('src/app/debug/pipeline/page.tsx');
    it('no PLAN_v5 Phase 3 in file comment', () => {
      expect(src).not.toMatch(/PLAN_v5 Phase 3/);
    });
    it('no PLAN_v5 in user-visible subtitle', () => {
      expect(src).not.toMatch(/PLAN_v5/);
    });
    it('pipeline dashboard content preserved', () => {
      expect(src).toMatch(/Pipeline Dashboard/);
      expect(src).toMatch(/최근 30일 pipeline_runs/);
    });
  });

  describe('predictions/page.tsx', () => {
    const src = read('src/app/predictions/page.tsx');
    it('no cycle 869 ref', () => {
      expect(src).not.toMatch(/cycle 869/);
    });
    it('LEFT JOIN comment preserved', () => {
      expect(src).toMatch(/LEFT JOIN/);
    });
  });

  describe('reviews/page.tsx', () => {
    const src = read('src/app/reviews/page.tsx');
    it('no cycle 154 ref in assertSelectOk comment', () => {
      expect(src).not.toMatch(/cycle 154/);
    });
    it('no cycle 148 ref in assertSelectOk comment', () => {
      expect(src).not.toMatch(/cycle 148/);
    });
    it('assertSelectOk preserved', () => {
      expect(src).toMatch(/assertSelectOk/);
    });
  });

  describe('predictions/[date]/page.tsx', () => {
    const src = read('src/app/predictions/[date]/page.tsx');
    it('no cycle 154 ref in assertSelectOk comment', () => {
      expect(src).not.toMatch(/cycle 154/);
    });
    it('no cycle 148 ref in assertSelectOk comment', () => {
      expect(src).not.toMatch(/cycle 148/);
    });
    it('no PLAN_v5 ref in comments or JSX', () => {
      expect(src).not.toMatch(/PLAN_v5/);
    });
    it('assertSelectOk preserved', () => {
      expect(src).toMatch(/assertSelectOk/);
    });
    it('missing game logic preserved', () => {
      expect(src).toMatch(/final 인데 prediction row 없음/);
    });
  });

  describe('config/model.ts', () => {
    const src = read('src/config/model.ts');
    it('no cycle 479 ref', () => {
      expect(src).not.toMatch(/cycle 479/);
    });
    it('CURRENT_DEBATE_VERSION export preserved', () => {
      expect(src).toMatch(/CURRENT_DEBATE_VERSION/);
    });
  });
});
