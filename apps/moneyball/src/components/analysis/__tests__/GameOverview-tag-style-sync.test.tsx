import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GameOverview } from '../GameOverview';

// Silent drift fix (cycle 3477): TAG_STYLES only had 4 hardcoded keys while
// buildGameOverview() (factor-explanations.ts) emits team-prefixed dynamic
// tags (`${team} 불펜 우세` 등) + a later-wave static tag ("저득점 예상").
// Unmatched tags silently fell through to the neutral gray fallback,
// losing the intended color categorization. Lock in: every tag family
// buildGameOverview() can produce must resolve to a non-fallback style.
describe('GameOverview — TAG_STYLES stays in sync with buildGameOverview() tag families', () => {
  const FALLBACK = 'bg-gray-100 dark:bg-[var(--color-surface-card)]';

  it.each([
    ['투수전 예상', '투수전 예상'],
    ['타격전 예상', '타격전 예상'],
    ['저득점 예상 (wave-340 static tag)', '저득점 예상'],
    ['박빙', '박빙'],
    ['우세 뚜렷', '우세 뚜렷'],
    ['LG 불펜 우세 (team-prefixed)', 'LG 불펜 우세'],
    ['LG 전력 우세 (team-prefixed)', 'LG 전력 우세'],
    ['LG 최근 핫 (team-prefixed)', 'LG 최근 핫'],
    ['LG 최근 부진 (team-prefixed)', 'LG 최근 부진'],
    ['LG Elo 강세 (team-prefixed)', 'LG Elo 강세'],
  ])('%s → non-fallback chip style', (_label, tag) => {
    const { getByText } = render(<GameOverview tags={[tag]} summary="테스트 요약" />);
    const chip = getByText(tag);
    expect(chip.className).not.toContain(FALLBACK);
  });
});
