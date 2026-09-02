import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Korean team-name wrap bug family lock-in — HistoricalAnalogMatchup is an
// async Server Component that fetches from Supabase directly (no mock-data
// escape hatch like RivalryMemorySurface), so it's covered here via a static
// source assertion instead of a rendered-DOM test.
//
// "{away} @ {home}" span sits in an un-wrapped `flex items-center gap-3`
// row next to a fixed `w-20` date span and a score span — same shape as the
// 12 previously-fixed instances (e.g. TeamMatchupCards.tsx, ddd5db47).

const src = readFileSync(join(__dirname, '../HistoricalAnalogMatchup.tsx'), 'utf8');

describe('Korean team-name wrap sweep — HistoricalAnalogMatchup 매치업 span', () => {
  it('"{away} @ {home}" span 은 whitespace-nowrap (w-20 날짜 span 옆 압축 방지)', () => {
    expect(src).toMatch(
      /text-sm font-semibold text-brand-700 dark:text-brand-200 whitespace-nowrap/,
    );
  });
});
