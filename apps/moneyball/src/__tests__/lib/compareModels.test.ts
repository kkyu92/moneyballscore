import { describe, it, expect } from 'vitest';
import {
  aggregateByModel,
  dailyByModel,
  extractHomeWinProb,
  type PredictionRow,
} from '@/lib/dashboard/compareModels';

function row(
  over: Partial<PredictionRow>,
  homeTeamId = 1,
  winnerTeamId: number | null = 1,
): PredictionRow {
  return {
    model_version: 'v1.6',
    scoring_rule: 'v1.6',
    is_correct: null,
    verified_at: null,
    created_at: '2026-04-22T10:00:00Z',
    reasoning: { homeWinProb: 0.6 },
    game: { home_team_id: homeTeamId, winner_team_id: winnerTeamId },
    ...over,
  };
}

describe('extractHomeWinProb', () => {
  it('picks v2.0-debate verdict homeWinProb first', () => {
    const r = {
      homeWinProb: 0.55,
      debate: { verdict: { homeWinProb: 0.62 } },
    };
    expect(extractHomeWinProb(r)).toBe(0.62);
  });

  it('falls back to top-level homeWinProb', () => {
    expect(extractHomeWinProb({ homeWinProb: 0.55 })).toBe(0.55);
  });

  it('returns null for missing', () => {
    expect(extractHomeWinProb({})).toBeNull();
    expect(extractHomeWinProb(null)).toBeNull();
  });
});

describe('aggregateByModel', () => {
  it('groups by scoring_rule + model_version', () => {
    const rows: PredictionRow[] = [
      row({ scoring_rule: 'v1.5', model_version: 'v1.5' }),
      row({ scoring_rule: 'v1.5', model_version: 'v1.5' }),
      row({ scoring_rule: 'v1.6', model_version: 'v1.6' }),
    ];
    const stats = aggregateByModel(rows);
    expect(stats).toHaveLength(2);
    const v15 = stats.find((s) => s.scoringRule === 'v1.5');
    const v16 = stats.find((s) => s.scoringRule === 'v1.6');
    expect(v15?.n).toBe(2);
    expect(v16?.n).toBe(1);
  });

  it('computes accuracy + Brier on verified rows', () => {
    const rows: PredictionRow[] = [
      row({
        is_correct: true,
        verified_at: '2026-04-22',
        reasoning: { homeWinProb: 0.8 },
      }),
      row({
        is_correct: false,
        verified_at: '2026-04-22',
        reasoning: { homeWinProb: 0.3 },
        game: { home_team_id: 1, winner_team_id: 2 }, // away won, we predicted home 0.3 (correctly pointed away), but is_correct=false → winner actually home? inconsistency — use raw calc
      }),
    ];
    const stats = aggregateByModel(rows);
    expect(stats[0].verifiedN).toBe(2);
    expect(stats[0].brierN).toBe(2);
    // Brier = ((0.8-1)^2 + (0.3-0)^2) / 2 = (0.04 + 0.09)/2 = 0.065
    expect(stats[0].brier).toBeCloseTo(0.065, 4);
  });

  it('handles missing winner / unverified rows', () => {
    const rows: PredictionRow[] = [
      row({ game: { home_team_id: 1, winner_team_id: null } }),
      row({ is_correct: null, verified_at: null }),
    ];
    const stats = aggregateByModel(rows);
    expect(stats[0].n).toBe(2);
    expect(stats[0].verifiedN).toBe(0);
    expect(stats[0].brierN).toBe(0);
    expect(stats[0].brier).toBeNull();
  });
});

describe('dailyByModel', () => {
  it('buckets by KST date + scoring_rule', () => {
    // row 1: 10:00Z + 9h = 19:00 KST 04-22 (same day)
    // row 2: 18:00Z + 9h = 03:00 KST 04-23 (crosses UTC midnight boundary —
    //   naive UTC slice(0,10) would wrongly bucket this into 04-22)
    // row 3: 10:00Z (04-23) + 9h = 19:00 KST 04-23 (same day)
    const rows: PredictionRow[] = [
      row({
        created_at: '2026-04-22T10:00:00Z',
        is_correct: true,
        verified_at: '2026-04-22',
      }),
      row({
        created_at: '2026-04-22T18:00:00Z',
        is_correct: false,
        verified_at: '2026-04-22',
      }),
      row({
        created_at: '2026-04-23T10:00:00Z',
        is_correct: true,
        verified_at: '2026-04-23',
      }),
    ];
    const daily = dailyByModel(rows);
    expect(daily).toHaveLength(2);
    const d22 = daily.find((d) => d.date === '2026-04-22')!;
    expect(d22.n).toBe(1);
    expect(d22.correct).toBe(1);
    expect(d22.accuracy).toBeCloseTo(1, 3);
    const d23 = daily.find((d) => d.date === '2026-04-23')!;
    expect(d23.n).toBe(2);
    expect(d23.correct).toBe(1);
    expect(d23.accuracy).toBeCloseTo(0.5, 3);
  });
});
