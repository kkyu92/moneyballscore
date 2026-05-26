import { describe, expect, it } from 'vitest';
import { buildRejectReasonBreakdown, parseSkippedDetail } from '../pipelineStats';

describe('parseSkippedDetail', () => {
  it('null/empty → []', () => {
    expect(parseSkippedDetail(null)).toEqual([]);
    expect(parseSkippedDetail('')).toEqual([]);
  });

  it('정상 JSON array → SkippedEntry[]', () => {
    const raw = '[{"game":"KTvOB","reason":"window_too_early"}]';
    expect(parseSkippedDetail(raw)).toEqual([
      { game: 'KTvOB', reason: 'window_too_early' },
    ]);
  });

  it('malformed JSON → [] (silent fallback)', () => {
    expect(parseSkippedDetail('{invalid')).toEqual([]);
    expect(parseSkippedDetail('"not-array"')).toEqual([]);
  });
});

describe('buildRejectReasonBreakdown', () => {
  it('빈 runs → []', () => {
    expect(buildRejectReasonBreakdown([])).toEqual([]);
  });

  it('reason 별 count + pct + desc sort', () => {
    const runs = [
      {
        games_skipped: 5,
        skipped_detail:
          '[{"game":"a","reason":"window_too_early"},{"game":"b","reason":"window_too_early"},{"game":"c","reason":"not_scheduled"}]',
      },
      {
        games_skipped: 3,
        skipped_detail:
          '[{"game":"d","reason":"window_too_early"},{"game":"e","reason":"sp_unconfirmed"}]',
      },
    ];
    const result = buildRejectReasonBreakdown(runs);
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ reason: 'window_too_early', count: 3, pct: 0.6 });
    expect(result[1].count).toBe(1);
    expect(result[2].count).toBe(1);
    expect(result[0].pct + result[1].pct + result[2].pct).toBeCloseTo(1.0);
  });

  it('skipped_detail=null skip + reason 부재 → unknown', () => {
    const runs = [
      { games_skipped: 0, skipped_detail: null },
      { games_skipped: 1, skipped_detail: '[{"game":"x","reason":""}]' },
    ];
    const result = buildRejectReasonBreakdown(runs);
    expect(result.length).toBe(1);
    expect(result[0].reason).toBe('unknown');
    expect(result[0].count).toBe(1);
    expect(result[0].pct).toBe(1.0);
  });
});
