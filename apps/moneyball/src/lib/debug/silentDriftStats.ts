// M14 — silent drift family alert evidence cohort (plan #10 Tier 1, cycle 947)
// pipeline_runs 의 predict_final + verify mode 안 silent silent drop event 누적.
// silent-drift-alert.ts (cycle 819 + 886) trigger condition 동일 replay.

export interface PipelineRunForDrift {
  mode: string;
  run_date: string;
  games_found: number;
  predictions: number;
  created_at: string;
  // verify mode 의 verified_count = updateAccuracy fire 결과
  // 본 helper 는 mode='verify' 일 때 games_found > 0 + predictions = 0 = silent drop 가정.
  // 정확한 verified count 는 별도 query 필요 — 본 helper 는 pipeline_runs 기반 proxy.
}

export interface SilentDriftEvent {
  mode: string; // 'predict_final' | 'verify'
  run_date: string;
  created_at: string;
  games_found: number;
  predictions: number;
  alert_type: 'predict_final_silent_drift' | 'verify_silent_drift';
}

export interface SilentDriftCohort {
  totalRuns: number;
  predictFinalRuns: number;
  verifyRuns: number;
  predictFinalSilent: SilentDriftEvent[];
  verifySilent: SilentDriftEvent[];
  alertRate: {
    predictFinal: number;
    verify: number;
  };
}

export function buildSilentDriftCohort(runs: PipelineRunForDrift[]): SilentDriftCohort {
  const predictFinalRuns = runs.filter((r) => r.mode === 'predict_final');
  const verifyRuns = runs.filter((r) => r.mode === 'verify');

  // silent-drift-alert.ts trigger condition replay
  // predict_final: games_found > 0 + predictions = 0 (existingPredictionsCount proxy 안 measure)
  const predictFinalSilent: SilentDriftEvent[] = predictFinalRuns
    .filter((r) => r.games_found > 0 && r.predictions === 0)
    .map((r) => ({
      mode: r.mode,
      run_date: r.run_date,
      created_at: r.created_at,
      games_found: r.games_found,
      predictions: r.predictions,
      alert_type: 'predict_final_silent_drift' as const,
    }));

  // verify: games_found > 0 + predictions = 0 proxy (verified_count 별도 query 필요)
  const verifySilent: SilentDriftEvent[] = verifyRuns
    .filter((r) => r.games_found > 0 && r.predictions === 0)
    .map((r) => ({
      mode: r.mode,
      run_date: r.run_date,
      created_at: r.created_at,
      games_found: r.games_found,
      predictions: r.predictions,
      alert_type: 'verify_silent_drift' as const,
    }));

  return {
    totalRuns: runs.length,
    predictFinalRuns: predictFinalRuns.length,
    verifyRuns: verifyRuns.length,
    predictFinalSilent,
    verifySilent,
    alertRate: {
      predictFinal: predictFinalRuns.length > 0
        ? predictFinalSilent.length / predictFinalRuns.length
        : 0,
      verify: verifyRuns.length > 0
        ? verifySilent.length / verifyRuns.length
        : 0,
    },
  };
}
