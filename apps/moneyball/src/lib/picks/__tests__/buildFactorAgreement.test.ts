import { describe, it, expect } from 'vitest';
import { buildFactorAgreement, type PickEntry } from '../buildPicksStats';

function makeEntry(
  id: number,
  myPick: 'home' | 'away',
  isResolved: boolean,
  aiPredictedHome: boolean | null,
  aiFactors: Record<string, number> | null,
): PickEntry {
  return {
    gameId: id,
    game_date: `2026-05-${String(id).padStart(2, '0')}`,
    myPick,
    pickedAt: `2026-05-${String(id).padStart(2, '0')}T03:00:00Z`,
    homeTeamName: 'LG',
    awayTeamName: '두산',
    homeScore: isResolved ? 5 : null,
    awayScore: isResolved ? 3 : null,
    status: isResolved ? 'final' : null,
    isResolved,
    myIsCorrect: isResolved ? myPick === 'home' : null,
    aiIsCorrect: isResolved ? aiPredictedHome === true : null,
    aiPredictedHome,
    aiFactors,
  };
}

describe('buildFactorAgreement', () => {
  it('returns measuredCount=0 + empty byFactor for empty entries', () => {
    expect(buildFactorAgreement([])).toEqual({ measuredCount: 0, byFactor: [] });
  });

  it('skips entries with null aiFactors', () => {
    const entries = [
      makeEntry(1, 'home', true, true, null),
      makeEntry(2, 'home', true, true, { sp_fip: 0.6 }),
    ];
    const out = buildFactorAgreement(entries);
    expect(out.measuredCount).toBe(1); // only entry 2
  });

  it('skips unresolved entries', () => {
    const entries = [makeEntry(1, 'home', false, true, { sp_fip: 0.6 })];
    expect(buildFactorAgreement(entries).measuredCount).toBe(0);
  });

  it('skips entries with null aiPredictedHome (no AI pred)', () => {
    const entries = [makeEntry(1, 'home', true, null, { sp_fip: 0.6 })];
    expect(buildFactorAgreement(entries).measuredCount).toBe(0);
  });

  it('counts withMyPick / againstMyPick / neutral correctly', () => {
    // myPick=home for all. sp_fip values:
    //   0.7 → home lean → withMyPick
    //   0.3 → away lean → againstMyPick
    //   0.5 → neutral
    const entries = [
      makeEntry(1, 'home', true, true, { sp_fip: 0.7 }),
      makeEntry(2, 'home', true, true, { sp_fip: 0.3 }),
      makeEntry(3, 'home', true, true, { sp_fip: 0.5 }),
    ];
    const out = buildFactorAgreement(entries);
    const sp = out.byFactor.find((r) => r.factor === 'sp_fip')!;
    expect(sp.withMyPick).toBe(1);
    expect(sp.againstMyPick).toBe(1);
    expect(sp.neutral).toBe(1);
    expect(sp.total).toBe(3);
    expect(sp.agreementRate).toBe(0.5); // 1 / (1+1)
  });

  it('away pick: home lean = against, away lean = with', () => {
    const entries = [
      makeEntry(1, 'away', true, false, { sp_fip: 0.7 }), // home lean vs away pick → against
      makeEntry(2, 'away', true, false, { sp_fip: 0.3 }), // away lean vs away pick → with
    ];
    const out = buildFactorAgreement(entries);
    const sp = out.byFactor.find((r) => r.factor === 'sp_fip')!;
    expect(sp.withMyPick).toBe(1);
    expect(sp.againstMyPick).toBe(1);
    expect(sp.agreementRate).toBe(0.5);
  });

  it('boundary 0.55 = neutral (NOT home lean), 0.45 = neutral', () => {
    // classifyFactorLean: >0.55 = home / <0.45 = away. = 정확히 0.55 / 0.45 → neutral.
    const entries = [
      makeEntry(1, 'home', true, true, { sp_fip: 0.55 }),
      makeEntry(2, 'home', true, true, { sp_fip: 0.45 }),
    ];
    const out = buildFactorAgreement(entries);
    const sp = out.byFactor.find((r) => r.factor === 'sp_fip')!;
    expect(sp.neutral).toBe(2);
    expect(sp.withMyPick).toBe(0);
    expect(sp.againstMyPick).toBe(0);
    expect(sp.agreementRate).toBeNull(); // 분모 0
  });

  it('handles multiple factors per entry', () => {
    const entries = [
      makeEntry(1, 'home', true, true, { sp_fip: 0.7, elo: 0.3, lineup_woba: 0.6 }),
    ];
    const out = buildFactorAgreement(entries);
    expect(out.byFactor.length).toBe(3);
    expect(out.byFactor.find((r) => r.factor === 'sp_fip')!.withMyPick).toBe(1);
    expect(out.byFactor.find((r) => r.factor === 'elo')!.againstMyPick).toBe(1);
    expect(out.byFactor.find((r) => r.factor === 'lineup_woba')!.withMyPick).toBe(1);
  });

  it('sorts byFactor by total desc then agreementRate desc', () => {
    // sp_fip: 2 entries (both with) → total=2, agreementRate=1.0
    // elo: 3 entries (1 with, 2 against) → total=3, agreementRate=0.333
    const entries = [
      makeEntry(1, 'home', true, true, { sp_fip: 0.7, elo: 0.7 }),
      makeEntry(2, 'home', true, true, { sp_fip: 0.7, elo: 0.3 }),
      makeEntry(3, 'home', true, true, { elo: 0.3 }),
    ];
    const out = buildFactorAgreement(entries);
    // elo first (total=3) → sp_fip second (total=2)
    expect(out.byFactor[0].factor).toBe('elo');
    expect(out.byFactor[1].factor).toBe('sp_fip');
  });

  it('ignores non-numeric / NaN factor values gracefully', () => {
    const entries = [
      // @ts-expect-error — runtime test of bad input.
      makeEntry(1, 'home', true, true, { sp_fip: 'bad', elo: NaN, lineup_woba: 0.7 }),
    ];
    const out = buildFactorAgreement(entries);
    expect(out.measuredCount).toBe(1);
    const lineup = out.byFactor.find((r) => r.factor === 'lineup_woba')!;
    expect(lineup.withMyPick).toBe(1);
    // sp_fip / elo 는 total=0 (skip 됐어야)
    const sp = out.byFactor.find((r) => r.factor === 'sp_fip');
    expect(sp?.total).toBe(0);
  });
});
