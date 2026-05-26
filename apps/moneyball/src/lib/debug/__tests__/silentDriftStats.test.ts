import { describe, expect, it } from 'vitest';
import { buildSilentDriftCohort } from '../silentDriftStats';

function run(mode: string, games_found: number, predictions: number, run_date = '2026-05-26') {
  return {
    mode,
    run_date,
    games_found,
    predictions,
    created_at: `${run_date}T13:00:00Z`,
  };
}

describe('buildSilentDriftCohort', () => {
  it('빈 runs → 모든 count 0', () => {
    const c = buildSilentDriftCohort([]);
    expect(c.totalRuns).toBe(0);
    expect(c.predictFinalSilent).toEqual([]);
    expect(c.verifySilent).toEqual([]);
    expect(c.alertRate.predictFinal).toBe(0);
    expect(c.alertRate.verify).toBe(0);
  });

  it('predict_final silent drift detection (games_found>0 + predictions=0)', () => {
    const runs = [
      run('predict_final', 5, 0), // silent
      run('predict_final', 5, 5), // OK
      run('predict_final', 0, 0), // no games (skip)
    ];
    const c = buildSilentDriftCohort(runs);
    expect(c.predictFinalRuns).toBe(3);
    expect(c.predictFinalSilent.length).toBe(1);
    expect(c.predictFinalSilent[0].alert_type).toBe('predict_final_silent_drift');
    expect(c.alertRate.predictFinal).toBeCloseTo(1 / 3);
  });

  it('verify silent drift detection (games_found>0 + predictions=0 proxy)', () => {
    const runs = [
      run('verify', 5, 0), // silent
      run('verify', 5, 0), // silent
      run('verify', 0, 0), // no games
    ];
    const c = buildSilentDriftCohort(runs);
    expect(c.verifyRuns).toBe(3);
    expect(c.verifySilent.length).toBe(2);
    expect(c.verifySilent[0].alert_type).toBe('verify_silent_drift');
    expect(c.alertRate.verify).toBeCloseTo(2 / 3);
  });

  it('predict mode 와 announce mode 는 alert 미발화 (silent-drift-alert.ts coverage X)', () => {
    const runs = [
      run('predict', 5, 0),
      run('predict', 5, 0),
      run('announce', 5, 0),
    ];
    const c = buildSilentDriftCohort(runs);
    expect(c.predictFinalSilent).toEqual([]);
    expect(c.verifySilent).toEqual([]);
  });
});
