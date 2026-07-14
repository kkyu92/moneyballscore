import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WINNER_PROB_CONFIDENT } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const MLB_MSG = join(ROOT, 'src/components/notify/MlbCombinedMessage.ts');

describe('silent drift wave 324 — BIG_GAME_THRESHOLD → WINNER_PROB_CONFIDENT single source (cycle 1656)', () => {
  it('WINNER_PROB_CONFIDENT = 0.65 (confident tier threshold)', () => {
    expect(WINNER_PROB_CONFIDENT).toBe(0.65);
  });

  it('MlbCombinedMessage.ts: imports WINNER_PROB_CONFIDENT from shared (no local BIG_GAME_THRESHOLD)', () => {
    const src = readFileSync(MLB_MSG, 'utf8');
    expect(src).toContain("WINNER_PROB_CONFIDENT");
    expect(src).not.toContain('BIG_GAME_THRESHOLD');
    expect(src).not.toMatch(/const.*THRESHOLD.*=.*0\.65/);
  });

  it('MlbCombinedMessage.ts: bigGame check uses WINNER_PROB_CONFIDENT (no hardcoded 0.65)', () => {
    const src = readFileSync(MLB_MSG, 'utf8');
    expect(src).toContain('g.confidence > WINNER_PROB_CONFIDENT');
    expect(src).not.toMatch(/g\.confidence > 0\.65/);
  });
});
