import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PredictionCard } from '../PredictionCard';

// Korean team-name wrap bug family lock-in (12th prior recurrence:
// TeamMatchupCards.tsx, commit ddd5db47). The middle "{팀명} 승 예측" column
// sits between two `flex-1` team columns (both already whitespace-nowrap
// protected) in a `flex items-center justify-between` row — the middle
// column itself had no shrink protection.
describe('PredictionCard — Korean team-name wrap guard', () => {
  it('"{팀명} 승 예측" 중앙 컬럼 문단은 whitespace-nowrap', () => {
    const { container } = render(
      <PredictionCard
        homeTeam="LG"
        awayTeam="HT"
        confidence={0.6}
        predictedWinner="LG"
      />,
    );
    const label = Array.from(container.querySelectorAll('p')).find((p) =>
      p.textContent?.includes('승 예측'),
    );
    expect(label?.className).toContain('whitespace-nowrap');
  });
});
