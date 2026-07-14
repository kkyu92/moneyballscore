import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CE_DETECT_THRESHOLD, CE_MIN_SAMPLES } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 307 — CE detection constants (cycle 1638)', () => {
  it('CE_DETECT_THRESHOLD is 0.32', () => {
    expect(CE_DETECT_THRESHOLD).toBe(0.32);
  });

  it('CE_MIN_SAMPLES is 3', () => {
    expect(CE_MIN_SAMPLES).toBe(3);
  });

  it('analysis/page.tsx imports CE_DETECT_THRESHOLD/CE_MIN_SAMPLES from shared (no hardcoded 0.32)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/analysis/page.tsx'),
      'utf8',
    );
    expect(src).toContain('CE_DETECT_THRESHOLD');
    expect(src).toContain('CE_MIN_SAMPLES');
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/<=\s*0\.32/);
    expect(src).not.toMatch(/>=\s*3\s*&&\s*\n.*reduce.*confidence/s);
  });

  it('predictions/page.tsx imports CE_DETECT_THRESHOLD/CE_MIN_SAMPLES from shared (no hardcoded 0.32)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/predictions/page.tsx'),
      'utf8',
    );
    expect(src).toContain('CE_DETECT_THRESHOLD');
    expect(src).toContain('CE_MIN_SAMPLES');
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/<=\s*0\.32/);
  });

  it('predictions/[date]/page.tsx imports CE_DETECT_THRESHOLD/CE_MIN_SAMPLES from shared (no hardcoded 0.32)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/predictions/[date]/page.tsx'),
      'utf8',
    );
    expect(src).toContain('CE_DETECT_THRESHOLD');
    expect(src).toContain('CE_MIN_SAMPLES');
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/<=\s*0\.32/);
  });
});
