import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MIN_POLL_TOTAL,
  CALIBRATION_BUCKET_WIDTH,
  CALIBRATION_BUCKET_START,
  CALIBRATION_BUCKET_COUNT,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 305 — picks/calibration constants (cycle 1634)', () => {
  it('MIN_POLL_TOTAL is 3', () => {
    expect(MIN_POLL_TOTAL).toBe(3);
  });

  it('CALIBRATION_BUCKET_WIDTH is 0.05', () => {
    expect(CALIBRATION_BUCKET_WIDTH).toBe(0.05);
  });

  it('CALIBRATION_BUCKET_START is 0.5', () => {
    expect(CALIBRATION_BUCKET_START).toBe(0.5);
  });

  it('CALIBRATION_BUCKET_COUNT is 10', () => {
    expect(CALIBRATION_BUCKET_COUNT).toBe(10);
  });

  it('PickButton.tsx imports MIN_POLL_TOTAL from shared (no local def)', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/picks/PickButton.tsx'),
      'utf8',
    );
    expect(src).toContain('MIN_POLL_TOTAL');
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/const MIN_POLL_TOTAL\s*=/);
  });

  it('buildCommunityAccuracy.ts imports MIN_POLL_TOTAL from shared (no local def)', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/picks/buildCommunityAccuracy.ts'),
      'utf8',
    );
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/^export const MIN_POLL_TOTAL\s*=/m);
  });

  it('buildAccuracyData.ts imports CALIBRATION_BUCKET_* from shared (no local def)', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/accuracy/buildAccuracyData.ts'),
      'utf8',
    );
    expect(src).toContain('CALIBRATION_BUCKET_WIDTH');
    expect(src).toContain('CALIBRATION_BUCKET_START');
    expect(src).toContain('CALIBRATION_BUCKET_COUNT');
    expect(src).not.toMatch(/^const BUCKET_WIDTH\s*=\s*0\.05/m);
    expect(src).not.toMatch(/^const BUCKET_START\s*=\s*0\.5/m);
    expect(src).not.toMatch(/^const BUCKET_COUNT\s*=\s*10/m);
  });

  it('debug/reliability/page.tsx imports CALIBRATION_BUCKET_* from shared (no local def)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/debug/reliability/page.tsx'),
      'utf8',
    );
    expect(src).toContain('CALIBRATION_BUCKET_WIDTH');
    expect(src).toContain('CALIBRATION_BUCKET_START');
    expect(src).toContain('CALIBRATION_BUCKET_COUNT');
    expect(src).not.toMatch(/^const BUCKET_WIDTH\s*=\s*0\.05/m);
    expect(src).not.toMatch(/^const BUCKET_START\s*=\s*0\.5/m);
    expect(src).not.toMatch(/^const BUCKET_COUNT\s*=\s*10/m);
  });
});
