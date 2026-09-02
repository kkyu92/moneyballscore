import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { JudgeVerdictPanel } from '../JudgeVerdictPanel';

// Korean team-name wrap bug family lock-in (12th prior recurrence:
// TeamMatchupCards.tsx, commit ddd5db47). Away/home full team-name
// paragraphs sit inside `flex-1 max-w-[30%]` boxes — an explicit hard
// max-width cap, the clearest instance of the "narrow fixed column, no
// truncate" signature in this sweep.
describe('JudgeVerdictPanel — Korean team-name wrap guard', () => {
  it('away/home 팀명 문단 2곳 모두 truncate (max-w-[30%] 고정폭 컬럼)', () => {
    const { container } = render(
      <JudgeVerdictPanel
        homeTeam="LG"
        awayTeam="HT"
        predictedWinner="LG"
        homeWinProb={0.58}
        confidence={0.6}
        reasoning="홈팀 선발 투수 우위로 판정."
      />,
    );
    const boxes = container.querySelectorAll('.flex-1.max-w-\\[30\\%\\]');
    expect(boxes.length).toBe(2);
    boxes.forEach((box) => {
      const name = box.querySelector('.text-sm.text-brand-200');
      expect(name?.className).toContain('truncate');
    });
  });
});
