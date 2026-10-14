// M14 — silent drift family alert evidence cohort.
// pipeline_runs 의 predict_final + verify mode 안 silent drop event 누적.
// silent-drift-alert.ts trigger condition 동일 replay.

export interface PipelineRunForDrift {
  mode: string;
  run_date: string;
  games_found: number;
  predictions: number;
  created_at: string;
  // verify mode 의 predictions 컬럼 = verifiedCount (daily.ts cycle 2832 fix 이전엔
  // verify mode 전부 하드코딩 0 이라 이 컬럼이 항상 0 — 모든 verify run 이 silent 로
  // 오판정되는 self-defeat bug 였음. cycle 2832 이후 verifyResults.length 를 그대로
  // 반영해 아래 games_found > 0 + predictions = 0 판정이 정확한 verified=0 신호가 됨
  // (별도 query 불필요).
}

interface SilentDriftEvent {
  mode: string; // 'predict_final' | 'verify'
  run_date: string;
  created_at: string;
  games_found: number;
  predictions: number;
  alert_type: 'predict_final_silent_drift' | 'verify_silent_drift';
}

interface SilentDriftCohort {
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

  // verify: games_found > 0 + predictions(=verifiedCount) = 0 (cycle 2832 fix 이후 정확)
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
