import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BigMatchDebateCard } from '../BigMatchDebateCard';

// Korean team-name wrap bug family lock-in (12th prior recurrence:
// TeamMatchupCards.tsx, commit ddd5db47). The away/home name paragraphs
// under each team logo sit in an un-wrapped 3-item
// `flex items-center justify-center gap-4 md:gap-8` row (away box / "VS" /
// home box) rendering the *full* KBO team name — no shrink protection.
describe('BigMatchDebateCard — Korean team-name wrap guard', () => {
  it('away/home 팀명 문단 2곳 모두 whitespace-nowrap (3-item flex 행, 전체 팀명 렌더)', () => {
    const { container } = render(
      <BigMatchDebateCard
        gameId={1}
        homeTeam="LG"
        awayTeam="HT"
        homeWinProb={0.58}
        predictedWinner="LG"
        reasoning="홈팀 선발 투수 우위로 판정."
      />,
    );
    const names = container.querySelectorAll('.text-center > .text-xs.md\\:text-sm.text-brand-200');
    expect(names.length).toBe(2);
    names.forEach((el) => {
      expect(el.className).toContain('whitespace-nowrap');
    });
  });
});
