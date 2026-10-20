import { describe, expect, it } from 'vitest';
import { buildRejectReasonBreakdown, extractWeeklyMarkerEvents, parseSkippedDetail } from '../pipelineStats';

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

describe('extractWeeklyMarkerEvents', () => {
  // cycle 3423 regression — pipeline_runs.errors 는 JSONB 컬럼에 string[] 그대로 insert 됨
  // (skipped_detail 과 달리 stringify 안 함). supabase-js 는 이미 파싱된 네이티브 배열을
  // 반환하므로, errors 가 string 이 아닌 string[] 로 와도 마커 탐지가 정상 작동해야 함.
  it('native string[] (실제 supabase-js 반환 형태) 에서 마커 탐지', () => {
    const runs = [
      {
        run_date: '2026-10-19', mode: 'predict_pre_game', created_at: '2026-10-19T10:00:00Z',
        errors: ['[GAP] KTvOB missing probable pitcher'],
      },
      {
        run_date: '2026-10-18', mode: 'verify', created_at: '2026-10-18T10:00:00Z',
        errors: ['[SP_UNCONFIRMED] LGvSS'],
      },
    ];
    expect(extractWeeklyMarkerEvents(runs, '2026-10-01T00:00:00Z', '[GAP]')).toEqual([
      { run_date: '2026-10-19', mode: 'predict_pre_game', msg: '[GAP] KTvOB missing probable pitcher', created_at: '2026-10-19T10:00:00Z' },
    ]);
    expect(extractWeeklyMarkerEvents(runs, '2026-10-01T00:00:00Z', '[SP_UNCONFIRMED]')).toEqual([
      { run_date: '2026-10-18', mode: 'verify', msg: '[SP_UNCONFIRMED] LGvSS', created_at: '2026-10-18T10:00:00Z' },
    ]);
  });

  it('created_at < sinceIso → 제외', () => {
    const runs = [
      { run_date: '2026-09-01', mode: 'predict_pre_game', created_at: '2026-09-01T00:00:00Z', errors: ['[GAP] old'] },
    ];
    expect(extractWeeklyMarkerEvents(runs, '2026-10-01T00:00:00Z', '[GAP]')).toEqual([]);
  });

  it('errors=[] 또는 매칭 없음 → []', () => {
    const runs = [
      { run_date: '2026-10-19', mode: 'predict_pre_game', created_at: '2026-10-19T10:00:00Z', errors: [] },
      { run_date: '2026-10-19', mode: 'predict_pre_game', created_at: '2026-10-19T10:00:00Z', errors: ['unrelated error'] },
    ];
    expect(extractWeeklyMarkerEvents(runs, '2026-10-01T00:00:00Z', '[GAP]')).toEqual([]);
  });
});
