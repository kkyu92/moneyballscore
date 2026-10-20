import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// cycle 3417 polish-ui (2-chain lock fallback): LeaderboardJoinModal nickname
// input used the legacy Tailwind ring-based focus style
// (focus:outline-none focus:ring-2 focus:ring-brand-500) while every other
// text input in the site (PredictionsSearchBox, MlbPredictionsSearchBox,
// FavoriteTeamFilter) uses the established
// focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
// focus-visible:outline-brand-500 convention (95 prior instances site-wide).
// The modal's cancel/submit buttons had no focus-visible styling at all.
const TARGET = join(__dirname, '../LeaderboardJoinModal.tsx');

describe('silent-drift cycle 3417: LeaderboardJoinModal focus-visible convention', () => {
  const src = readFileSync(TARGET, 'utf8');

  it('does not use the legacy ring-based focus style', () => {
    expect(src).not.toMatch(/focus:ring-2|focus:ring-brand-500/);
  });

  it('nickname input uses the site-wide focus-visible outline pattern', () => {
    expect(src).toMatch(
      /focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500/,
    );
  });

  it('both modal buttons (취소/참가하기) carry the focus-visible outline pattern', () => {
    const matches = src.match(/focus-visible:outline-brand-500/g) ?? [];
    expect(matches.length).toBe(3); // input + cancel button + submit button
  });
});
