import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DebateTimeline } from '../DebateTimeline';
import type { DebateTimelineData } from '@/lib/insights/loader';

// Korean team-name wrap bug family lock-in (12th prior recurrence:
// TeamMatchupCards.tsx, commit ddd5db47). The verdict box's
// "{팀명} 우세" span sits in a `flex items-baseline gap-2` row squeezed
// between a fixed label span and an `ml-auto` pct span — no flex-wrap,
// no shrink protection on the team-name span itself.
describe('DebateTimeline — Korean team-name wrap guard', () => {
  const debate: DebateTimelineData = {
    quantHomeProb: 0.58,
    homeArgument: null,
    awayArgument: null,
    calibration: null,
    verdictHomeProb: 0.6,
    verdictConfidence: 0.6,
    verdictReasoning: '홈팀 선발 투수 우위.',
    predictedWinner: 'LG',
    calibrationApplied: null,
  };

  it('"{팀명} 우세" 최종 결론 span 은 whitespace-nowrap', () => {
    const { container } = render(
      <DebateTimeline homeTeam="LG" awayTeam="HT" debate={debate} />,
    );
    const verdictRow = container.querySelector('.flex.items-baseline.gap-2');
    const verdictSpan = verdictRow?.querySelector('.font-semibold');
    expect(verdictSpan?.className).toContain('whitespace-nowrap');
    expect(verdictSpan?.textContent).toMatch(/우세/);
  });
});
