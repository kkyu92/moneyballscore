import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PIPELINE_STALE_HOURS_DEFAULT,
  PIPELINE_PREDICT_STALE_HOURS,
  NICKNAME_MIN_CHARS,
  NICKNAME_MAX_CHARS,
  DEVICE_ID_MAX_LENGTH,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 303 — pipeline/nickname/device constants (cycle 1632)', () => {
  it('PIPELINE_STALE_HOURS_DEFAULT is 28', () => {
    expect(PIPELINE_STALE_HOURS_DEFAULT).toBe(28);
  });

  it('PIPELINE_PREDICT_STALE_HOURS is 15', () => {
    expect(PIPELINE_PREDICT_STALE_HOURS).toBe(15);
  });

  it('NICKNAME_MIN_CHARS is 2', () => {
    expect(NICKNAME_MIN_CHARS).toBe(2);
  });

  it('NICKNAME_MAX_CHARS is 12', () => {
    expect(NICKNAME_MAX_CHARS).toBe(12);
  });

  it('DEVICE_ID_MAX_LENGTH is 64', () => {
    expect(DEVICE_ID_MAX_LENGTH).toBe(64);
  });

  it('health/pipelines/route.ts uses PIPELINE_STALE_HOURS_DEFAULT (no hardcoded 28)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/api/health/pipelines/route.ts'),
      'utf8',
    );
    expect(src).toContain('PIPELINE_STALE_HOURS_DEFAULT');
    expect(src).toContain('PIPELINE_PREDICT_STALE_HOURS');
    expect(src).not.toMatch(/stale_hours:\s*28/);
    expect(src).not.toMatch(/stale_hours:\s*15/);
  });

  it('leaderboard/sync/route.ts uses NICKNAME_MIN_CHARS and NICKNAME_MAX_CHARS (no hardcoded 2/12)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/api/leaderboard/sync/route.ts'),
      'utf8',
    );
    expect(src).toContain('NICKNAME_MIN_CHARS');
    expect(src).toContain('NICKNAME_MAX_CHARS');
    expect(src).not.toMatch(/trimmed\.length\s*<\s*2/);
    expect(src).not.toMatch(/trimmed\.length\s*>\s*12/);
  });

  it('picks/submit/route.ts uses DEVICE_ID_MAX_LENGTH (no hardcoded 64)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/api/picks/submit/route.ts'),
      'utf8',
    );
    expect(src).toContain('DEVICE_ID_MAX_LENGTH');
    expect(src).not.toMatch(/device_id\.length\s*>\s*64/);
  });
});
