import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

const TARGET_FILES = [
  'src/app/insights/series/[topic]/opengraph-image.tsx',
  'src/app/methodology/opengraph-image.tsx',
  'src/app/opengraph-image.tsx',
] as const;

describe('silent drift wave 287 — OG image "10 Factors" hardcoded → KBO_FACTOR_COUNT', () => {
  it.each(TARGET_FILES)(
    '%s: no hardcoded "10 Factors" literal',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/"10 Factors"/);
    },
  );

  it.each(TARGET_FILES)(
    '%s: imports KBO_FACTOR_COUNT from @moneyball/shared',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/KBO_FACTOR_COUNT/);
    },
  );
});
