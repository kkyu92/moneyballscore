import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AgentVoteCard } from '../AgentVoteCard';

// Korean team-name wrap bug family lock-in (12th prior recurrence:
// TeamMatchupCards.tsx, commit ddd5db47). AgentVoteCard renders team names
// in two unprotected flex rows: the winnerLabel span (squeezed between a
// fixed icon and an ml-auto pct badge) and the away/home "{name} {pct}%"
// pair in a `flex justify-between text-2xs` row — same shape as the
// already-fixed TeamMatchupCards opponent row.
describe('AgentVoteCard — Korean team-name wrap guard', () => {
  it('winnerLabel span 은 whitespace-nowrap (아이콘 + ml-auto 배지 사이 압축 방지)', () => {
    const { container } = render(
      <AgentVoteCard
        role="quant"
        homeTeam="LG"
        awayTeam="HT"
        homeWinProb={0.62}
        predictedWinner="LG"
      />,
    );
    const winnerLabel = container.querySelector('.text-sm.font-semibold');
    expect(winnerLabel?.className).toContain('whitespace-nowrap');
  });

  it('away/home "{팀명} {%}" span 2곳 모두 whitespace-nowrap (flex justify-between text-2xs 압축 방지)', () => {
    const { container } = render(
      <AgentVoteCard
        role="home"
        homeTeam="LG"
        awayTeam="HT"
        homeWinProb={0.55}
        predictedWinner="LG"
      />,
    );
    const row = container.querySelector('.flex.justify-between.text-2xs');
    const spans = row?.querySelectorAll('span') ?? [];
    expect(spans.length).toBe(2);
    spans.forEach((span) => {
      expect(span.className).toContain('whitespace-nowrap');
    });
  });
});
