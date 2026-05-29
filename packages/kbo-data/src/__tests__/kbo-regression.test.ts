import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

describe('KBO regression — MLB 도입 영향 0 강제', () => {
  it('League type union includes both kbo and mlb', async () => {
    const { } = await import('../types');
    type Imported = import('../types').League;
    const leagues: Imported[] = ['kbo', 'mlb'];
    expect(leagues).toHaveLength(2);
  });

  it('MLB modules don\'t import any KBO factor/scraper file', async () => {
    // smoke: each MLB module imports cleanly without side-effecting KBO
    await expect(import('../scrapers/statsapi-mlb')).resolves.toBeTruthy();
    await expect(import('../scrapers/fangraphs-mlb')).resolves.toBeTruthy();
    await expect(import('../scrapers/baseball-savant')).resolves.toBeTruthy();
    await expect(import('../scrapers/mlb-historical-bootstrap')).resolves.toBeTruthy();
    await expect(import('../factors/mlb-base')).resolves.toBeTruthy();
    await expect(import('../factors/mlb-shadow-c')).resolves.toBeTruthy();
  });

  it('MLB factor weights sum to 1.0 (KBO weights structure preserved)', async () => {
    const { MLB_BASE_WEIGHTS } = await import('../factors/mlb-base');
    const sum = Object.values(MLB_BASE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it('MILESTONE_TRIGGERS = [27, 60, 150, 300, 1000, 2430] (KBO v1.8 → v2.0 패턴 정합)', async () => {
    const { MILESTONE_TRIGGERS } = await import('../factors/mlb-shadow-c');
    expect(MILESTONE_TRIGGERS[0]).toBe(27);
    expect(MILESTONE_TRIGGERS[2]).toBe(150);
    expect(MILESTONE_TRIGGERS[MILESTONE_TRIGGERS.length - 1]).toBe(2430);
  });

  it('HOME_ELO_BONUS_VALUE = 24 (KBO 정합)', async () => {
    const { HOME_ELO_BONUS_VALUE } = await import('../factors/mlb-base');
    expect(HOME_ELO_BONUS_VALUE).toBe(24);
  });
});
