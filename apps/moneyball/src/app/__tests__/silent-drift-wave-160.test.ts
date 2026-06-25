import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 160 — GA_MEASUREMENT_ID + ADSENSE_CLIENT_ID registry (layout)', () => {
  it('layout.tsx: GA_MEASUREMENT_ID import from @moneyball/shared', () => {
    const src = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8');
    expect(src).toMatch(/GA_MEASUREMENT_ID/);
    expect(src).toMatch(/from\s+["']@moneyball\/shared["']/);
    expect(src).not.toMatch(/['"]G-2886XKWG4Y['"]/);
  });

  it('layout.tsx: ADSENSE_CLIENT_ID import from @moneyball/shared', () => {
    const src = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8');
    expect(src).toMatch(/ADSENSE_CLIENT_ID/);
    expect(src).not.toMatch(/['"]ca-pub-9964930444224182['"]/);
  });

  it('packages/shared exports GA_MEASUREMENT_ID = G-2886XKWG4Y', () => {
    const src = readFileSync(
      join(ROOT, '../../packages/shared/src/index.ts'),
      'utf8',
    );
    expect(src).toMatch(/export const GA_MEASUREMENT_ID = ['"]G-2886XKWG4Y['"]/);
  });

  it('packages/shared exports ADSENSE_CLIENT_ID = ca-pub-9964930444224182', () => {
    const src = readFileSync(
      join(ROOT, '../../packages/shared/src/index.ts'),
      'utf8',
    );
    expect(src).toMatch(/export const ADSENSE_CLIENT_ID = ['"]ca-pub-9964930444224182['"]/);
  });
});
