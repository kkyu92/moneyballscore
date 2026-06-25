import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 159 — CONTACT_EMAIL registry (contact + privacy)', () => {
  it('contact/page.tsx: CONTACT_EMAIL import + literal email 차단', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/contact/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(/from\s+["']@moneyball\/shared["']/);
    expect(src).toMatch(/CONTACT_EMAIL/);
    expect(src).not.toMatch(/["']moneyballscore777@gmail\.com["']/);
  });

  it('privacy/page.tsx: CONTACT_EMAIL import + literal email 차단', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/privacy/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(/from\s+["']@moneyball\/shared["']/);
    expect(src).toMatch(/CONTACT_EMAIL/);
    expect(src).not.toMatch(/["']moneyballscore777@gmail\.com["']/);
    expect(src).not.toMatch(/mailto:moneyballscore777/);
  });

  it('packages/shared exports CONTACT_EMAIL = moneyballscore777@gmail.com', () => {
    const src = readFileSync(
      join(ROOT, '../../packages/shared/src/index.ts'),
      'utf8',
    );
    expect(src).toMatch(/export const CONTACT_EMAIL = ['"]moneyballscore777@gmail\.com['"]/);
  });
});
