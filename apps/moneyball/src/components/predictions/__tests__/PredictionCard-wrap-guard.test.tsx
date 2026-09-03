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

// cycle 2836 polish-ui — 승률 바 (원정/홈 %) 가 PredictReveal 카운트업으로 배선됨
// (design-system 완성 컴포넌트였으나 어디에도 wiring 안 됐던 상태 — cycle 2835 관찰 후속).
describe('PredictionCard — 승률 바 PredictReveal 배선', () => {
  it('원정/홈 % 표시가 PredictReveal (role=status) 를 사용', () => {
    const { container } = render(
      <PredictionCard
        homeTeam="LG"
        awayTeam="HT"
        confidence={0.6}
        predictedWinner="LG"
        winProb={0.6}
        status="scheduled"
      />,
    );
    const reveals = container.querySelectorAll('[role="status"]');
    expect(reveals.length).toBe(2);
  });
});
