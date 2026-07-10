import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ACCURACY_SRC = readFileSync(join(__dirname, '../accuracy/page.tsx'), 'utf-8');
const LEADERBOARD_SRC = readFileSync(join(__dirname, '../leaderboard/page.tsx'), 'utf-8');
const CALENDAR_SRC = readFileSync(join(__dirname, '../calendar/page.tsx'), 'utf-8');
const ANALYSIS_GAME_SRC = readFileSync(
  join(__dirname, '../analysis/game/[id]/page.tsx'),
  'utf-8',
);

describe('silent drift wave 230 — stale cycle/task-ref annotations (cycle 1529)', () => {
  it('accuracy page does not contain user-visible "(cycle 358)"', () => {
    expect(ACCURACY_SRC).not.toContain('(cycle 358)');
  });

  it('accuracy page does not contain "v1.6 anomaly cohort" jargon', () => {
    expect(ACCURACY_SRC).not.toContain('v1.6 anomaly cohort');
  });

  it('accuracy page does not contain "plan #14 C2 a2 cycle 1021" task-ref', () => {
    expect(ACCURACY_SRC).not.toContain('plan #14 C2 a2 cycle 1021');
  });

  it('accuracy page does not contain "plan #10 Tier 1, cycle 947" task-ref', () => {
    expect(ACCURACY_SRC).not.toContain('plan #10 Tier 1, cycle 947');
  });

  it('leaderboard page does not contain "cycle 1021 c10" task-ref prefix', () => {
    expect(LEADERBOARD_SRC).not.toContain('cycle 1021 c10');
  });

  it('leaderboard page does not contain "cycle 1021 Tier 1 carry-over B" JSX comment', () => {
    expect(LEADERBOARD_SRC).not.toContain('cycle 1021 Tier 1 carry-over B');
  });

  it('calendar page does not contain "cycle 1021 (b8)" task-ref', () => {
    expect(CALENDAR_SRC).not.toContain('cycle 1021 (b8)');
  });

  it('calendar assertSelectOk comment does not contain "cycle 1096" stale ref', () => {
    expect(CALENDAR_SRC).not.toContain('cycle 1096');
  });

  it('analysis game page does not contain "cycle 1021 (a1)" JSX comment suffix', () => {
    expect(ANALYSIS_GAME_SRC).not.toContain('cycle 1021 (a1)');
  });

  it('analysis game page does not contain "cycle 1021 (a3)" JSX comment suffix', () => {
    expect(ANALYSIS_GAME_SRC).not.toContain('cycle 1021 (a3)');
  });

  it('analysis game page does not contain "a4, cycle 1021" JSX comment suffix', () => {
    expect(ANALYSIS_GAME_SRC).not.toContain('a4, cycle 1021');
  });
});
