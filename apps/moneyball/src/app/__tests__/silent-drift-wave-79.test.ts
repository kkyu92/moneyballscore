import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 79 — methodology glossary count + seasons OG team count', () => {
  it('methodology page: no hardcoded "25개 지표" literal — uses GLOSSARY_TERM_COUNT registry', () => {
    const src = readFileSync(join(ROOT, 'src/app/methodology/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\b25개 지표\b/);
    expect(src).toMatch(/GLOSSARY_TERM_COUNT/);
  });

  it('seasons opengraph-image: no hardcoded "10 Teams" literal — uses KBO_TEAM_COUNT registry', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/seasons/[year]/opengraph-image.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/>10 Teams\b/);
    expect(src).not.toMatch(/"10 Teams /);
    expect(src).not.toMatch(/'10 Teams /);
    expect(src).toMatch(/KBO_TEAM_COUNT/);
  });

  it('glossary data module: exports GLOSSARY_TERM_COUNT as derived constant', () => {
    const src = readFileSync(join(ROOT, 'src/app/glossary/data.ts'), 'utf8');
    expect(src).toMatch(/export const GLOSSARY_TERM_COUNT = CATEGORIES\.flatMap/);
  });
});
