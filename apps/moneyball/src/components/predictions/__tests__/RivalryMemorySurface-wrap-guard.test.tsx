import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RivalryMemorySurface } from '../RivalryMemorySurface';

// Korean team-name wrap bug family lock-in (12th prior recurrence:
// TeamMatchupCards.tsx, commit ddd5db47). The card's teamName span (full
// KBO_TEAMS name, not the abbreviated shortTeamName) sits in a
// `flex items-baseline justify-between gap-2` row inside a `flex-1 min-w-0`
// container sharing space with a "신뢰도 %" badge — min-w-0 removes the
// natural min-content floor.
//
// RivalryMemorySurface is an async Server Component; it accepts a
// `memories` prop override specifically to bypass the Supabase fetch in
// tests, so it's rendered directly here (await'd like any RSC in Vitest).
describe('RivalryMemorySurface — Korean team-name wrap guard', () => {
  it('팀명 span 은 whitespace-nowrap (min-w-0 flex 행에서 신뢰도 배지와 justify-between 압축)', async () => {
    const element = await RivalryMemorySurface({
      homeTeam: 'LG',
      awayTeam: 'HT',
      memories: [
        { teamCode: 'LG', content: '홈에서 강한 편.', confidence: 0.8, validUntil: null },
      ],
    });
    const { container } = render(element as React.ReactElement);
    const row = container.querySelector('.flex.items-baseline.justify-between.gap-2');
    const nameSpan = row?.querySelector('span');
    expect(nameSpan?.className).toContain('whitespace-nowrap');
  });
});
