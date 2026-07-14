import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CALIBRATION_AXIS_MIN, CALIBRATION_AXIS_MAX } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 306 — calibration chart axis constants (cycle 1637)', () => {
  it('CALIBRATION_AXIS_MIN is 0.4', () => {
    expect(CALIBRATION_AXIS_MIN).toBe(0.4);
  });

  it('CALIBRATION_AXIS_MAX is 1.0', () => {
    expect(CALIBRATION_AXIS_MAX).toBe(1.0);
  });

  it('accuracy/page.tsx imports CALIBRATION_AXIS_MIN/MAX from shared (no local def)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/accuracy/page.tsx'),
      'utf8',
    );
    expect(src).toContain('CALIBRATION_AXIS_MIN');
    expect(src).toContain('CALIBRATION_AXIS_MAX');
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/^const AXIS_MIN\s*=\s*0\.4/m);
    expect(src).not.toMatch(/^const AXIS_MAX\s*=\s*1\.0/m);
  });

  it('debug/reliability/page.tsx imports CALIBRATION_AXIS_MIN/MAX from shared (no local def)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/debug/reliability/page.tsx'),
      'utf8',
    );
    expect(src).toContain('CALIBRATION_AXIS_MIN');
    expect(src).toContain('CALIBRATION_AXIS_MAX');
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/^const AXIS_MIN\s*=\s*0\.4/m);
    expect(src).not.toMatch(/^const AXIS_MAX\s*=\s*1\.0/m);
  });
});
