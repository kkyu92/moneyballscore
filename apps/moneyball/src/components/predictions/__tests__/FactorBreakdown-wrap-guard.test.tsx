import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FactorBreakdown } from '../FactorBreakdown';

// Korean team-name wrap bug family lock-in (12th prior recurrence:
// TeamMatchupCards.tsx, commit ddd5db47). Two sites inside a fixed-width
// column:
//  - statLabel ("{away} X.XX vs {home} X.XX") inside a `w-20 shrink-0` box
//    — design intends multi-line wrap (leading-tight), so break-keep
//    (word-break: keep-all) rather than whitespace-nowrap, to block a
//    mid-CJK-character split while still allowing wraps at spaces.
//  - favorLabel ("{team} 우위") inside a `w-28 shrink-0` box — single-line
//    intent, so truncate.
describe('FactorBreakdown — Korean team-name wrap guard', () => {
  it('statLabel 문단은 break-keep (w-20 고정폭 박스, 멀티라인 의도 유지하며 CJK 중간 줄바꿈만 차단)', () => {
    const { container } = render(
      <FactorBreakdown
        factors={{ sp_fip: 0.6 }}
        homeTeam="LG"
        awayTeam="HT"
        details={{ homeSPFip: 3.2, awaySPFip: 3.8 }}
      />,
    );
    const statLabel = container.querySelector('.text-2xs.text-gray-400.dark\\:text-gray-500.leading-tight');
    expect(statLabel?.className).toContain('break-keep');
  });

  it('favorLabel span 은 truncate (w-28 shrink-0 고정폭 박스)', () => {
    const { container } = render(
      <FactorBreakdown
        factors={{ sp_fip: 0.6 }}
        homeTeam="LG"
        awayTeam="HT"
      />,
    );
    const favorLabel = container.querySelector('.text-sm.font-medium.w-28.shrink-0');
    expect(favorLabel?.className).toContain('truncate');
  });

  // 13th recurrence (cycle 2818): header "← {away} 유리 / {home} 유리 →" row —
  // flex justify-between with two Korean-team-name siblings, no md: breakpoint
  // rescue, missed by both the cycle-2804 sweep and this guard file originally.
  it('헤더 비교 행("← away 유리" / "home 유리 →") 양쪽 span 은 whitespace-nowrap (flex justify-between, 좁은 폭에서 CJK 중간 줄바꿈 위험)', () => {
    const { container } = render(
      <FactorBreakdown
        factors={{ sp_fip: 0.6 }}
        homeTeam="LG"
        awayTeam="HT"
      />,
    );
    const headerRow = container.querySelector('.flex.justify-between.mb-2');
    const spans = headerRow?.querySelectorAll('span') ?? [];
    expect(spans.length).toBe(2);
    spans.forEach((span) => {
      expect(span.className).toContain('whitespace-nowrap');
    });
  });
});
