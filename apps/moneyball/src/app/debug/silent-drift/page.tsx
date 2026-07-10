import { createClient } from '@supabase/supabase-js';
import {
  buildSilentDriftCohort,
  type PipelineRunForDrift,
} from '@/lib/debug/silentDriftStats';
import {
  buildFactorTimeline,
  FACTOR_ANOMALY_Z_THRESHOLD,
  type PredictionFactorRow,
} from '@/lib/debug/factorDeltaStats';
import { CURRENT_SCORING_RULE, DAY_MS, SHADOW_SCORING_RULE } from '@moneyball/shared';

// silent drift family alert dashboard
// FactorDeltaTimeline — cohort 별 factor 평균 + z-score>3 anomaly 표기.
// middleware.ts BASIC auth 로 보호됨 (/debug/* matcher)
// silent-drift-alert trigger evidence 누적 시각화 + factor anomaly monitoring.

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials required');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getSilentDriftEvidence() {
  const supabase = getAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS).toISOString();

  const { data, error } = await supabase
    .from('pipeline_runs')
    .select('mode, run_date, games_found, predictions, created_at')
    .gte('created_at', thirtyDaysAgo)
    .in('mode', ['predict_final', 'verify'])
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message, cohort: null };
  }

  const runs = (data ?? []) as PipelineRunForDrift[];
  const cohort = buildSilentDriftCohort(runs);
  return { error: null, cohort };
}

interface PredictionsFactorRowRaw {
  scoring_rule: string | null;
  factors: Record<string, number> | null;
  created_at: string;
}

async function getFactorTimeline() {
  const supabase = getAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();

  const { data, error } = await supabase
    .from('predictions')
    .select('scoring_rule, factors, created_at')
    .gte('created_at', sevenDaysAgo)
    .in('scoring_rule', [CURRENT_SCORING_RULE, SHADOW_SCORING_RULE])
    .eq('prediction_type', 'pre_game')
    .order('created_at', { ascending: false });

  if (error) return { error: error.message, timeline: null };

  const rows = (data ?? []) as PredictionsFactorRowRaw[];
  const mapped: PredictionFactorRow[] = rows.map((r) => ({
    date: r.created_at.slice(0, 10),
    scoring_rule: r.scoring_rule,
    factors: r.factors,
  }));
  const timeline = buildFactorTimeline(mapped);
  return { error: null, timeline };
}

export default async function SilentDriftDashboard() {
  const { error, cohort } = await getSilentDriftEvidence();
  const factorTimeline = await getFactorTimeline();

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold mb-1">Silent Drift Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          silent-drift-alert trigger evidence monitoring · BASIC auth
        </p>
      </header>

      {error || !cohort ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-medium mb-2">DB 쿼리 실패</p>
          <p className="text-sm text-red-600 font-mono">{error}</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
              <h3 className="text-xs text-gray-500 dark:text-gray-400 mb-1">전체 runs (30일)</h3>
              <p className="text-3xl font-bold">{cohort.totalRuns}</p>
            </div>
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
              <h3 className="text-xs text-gray-500 dark:text-gray-400 mb-1">predict_final runs</h3>
              <p className="text-3xl font-bold">{cohort.predictFinalRuns}</p>
              <p className="text-xs text-gray-500 mt-1">
                silent {cohort.predictFinalSilent.length} ({(cohort.alertRate.predictFinal * 100).toFixed(1)}%)
              </p>
            </div>
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
              <h3 className="text-xs text-gray-500 dark:text-gray-400 mb-1">verify runs</h3>
              <p className="text-3xl font-bold">{cohort.verifyRuns}</p>
              <p className="text-xs text-gray-500 mt-1">
                silent {cohort.verifySilent.length} ({(cohort.alertRate.verify * 100).toFixed(1)}%)
              </p>
            </div>
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
              <h3 className="text-xs text-gray-500 dark:text-gray-400 mb-1">총 silent alert</h3>
              <p className="text-3xl font-bold text-red-600">
                {cohort.predictFinalSilent.length + cohort.verifySilent.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">사례 11 family evidence</p>
            </div>
          </section>

          {cohort.predictFinalSilent.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3">predict_final silent drift event</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                games_found {`>`} 0 + predictions=0 (existingPredictionsCount proxy — cover&lt;games_found 조건). Sentry alert channel.
              </p>
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                      <th className="px-3 py-2">created_at</th>
                      <th className="px-3 py-2">run_date</th>
                      <th className="px-3 py-2 text-right">games_found</th>
                      <th className="px-3 py-2 text-right">predictions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohort.predictFinalSilent.map((e, i) => (
                      <tr key={i} className="border-t border-gray-200 dark:border-[var(--color-border)]">
                        <td className="px-3 py-2 font-mono text-xs">{e.created_at.slice(0, 16)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{e.run_date}</td>
                        <td className="px-3 py-2 text-right font-mono">{e.games_found}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-600">{e.predictions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {cohort.verifySilent.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3">verify silent drift event</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                games_found {`>`} 0 + predictions=0 proxy (verify extension).
              </p>
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                      <th className="px-3 py-2">created_at</th>
                      <th className="px-3 py-2">run_date</th>
                      <th className="px-3 py-2 text-right">games_found</th>
                      <th className="px-3 py-2 text-right">predictions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohort.verifySilent.map((e, i) => (
                      <tr key={i} className="border-t border-gray-200 dark:border-[var(--color-border)]">
                        <td className="px-3 py-2 font-mono text-xs">{e.created_at.slice(0, 16)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{e.run_date}</td>
                        <td className="px-3 py-2 text-right font-mono">{e.games_found}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-600">{e.predictions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {cohort.predictFinalSilent.length === 0 && cohort.verifySilent.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <p className="text-green-700 font-medium">silent drift event 0건 (30일) — 사례 11 family 재발 X</p>
            </div>
          )}

          {/* FactorDeltaTimeline */}
          <section>
            <h2 className="text-lg font-bold mb-2">FactorDeltaTimeline (7일)</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              v1.8 vs {SHADOW_SCORING_RULE} cohort 별 factor 평균 시계열 + z-score &gt;{' '}
              {FACTOR_ANOMALY_Z_THRESHOLD} anomaly 강조. shadow factor (park_weather, umpire_sz)
              분포 collapse / 결측 spike 사전 감지.
            </p>

            {factorTimeline.error || !factorTimeline.timeline ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                FactorDeltaTimeline 쿼리 실패: {factorTimeline.error ?? 'unknown'}
              </div>
            ) : factorTimeline.timeline.rows.length === 0 ? (
              <div
                className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center text-sm text-gray-500 dark:bg-gray-900/30 dark:border-gray-700 dark:text-gray-400"
                data-testid="factor-timeline-empty"
              >
                7일 안 박제된 predictions 가 없습니다. (daily 파이프라인 fire 후 누적)
              </div>
            ) : (
              <>
                {factorTimeline.timeline.anomalies.length > 0 && (
                  <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
                    <strong>Factor anomaly {factorTimeline.timeline.anomalies.length}건 감지</strong>
                    <ul className="mt-2 space-y-1 text-xs">
                      {factorTimeline.timeline.anomalies.slice(0, 10).map((a, i) => (
                        <li key={i} className="font-mono">
                          {a.date} · {a.cohort} · {a.factorKey} · value={a.value.toFixed(3)} ·
                          z={a.zScore.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                        <th className="px-3 py-2">date</th>
                        <th className="px-3 py-2">cohort</th>
                        <th className="px-3 py-2 text-right">n</th>
                        {factorTimeline.timeline.factorKeys.map((key) => (
                          <th key={key} className="px-3 py-2 text-right font-mono">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {factorTimeline.timeline.rows.map((r, i) => (
                        <tr
                          key={`${r.cohort}-${r.date}-${i}`}
                          className="border-t border-gray-200 dark:border-[var(--color-border)]"
                        >
                          <td className="px-3 py-2 font-mono text-xs">{r.date}</td>
                          <td className="px-3 py-2 font-mono text-xs">{r.cohort}</td>
                          <td className="px-3 py-2 text-right font-mono">{r.n}</td>
                          {factorTimeline.timeline!.factorKeys.map((key) => {
                            const val = r.factorMeans[key];
                            const isAnomaly = factorTimeline.timeline!.anomalies.some(
                              (a) =>
                                a.date === r.date &&
                                a.cohort === r.cohort &&
                                a.factorKey === key,
                            );
                            return (
                              <td
                                key={key}
                                className={`px-3 py-2 text-right font-mono ${
                                  isAnomaly ? 'bg-yellow-100 text-yellow-900 font-bold' : ''
                                }`}
                                data-anomaly={isAnomaly ? 'true' : undefined}
                              >
                                {val !== undefined ? val.toFixed(3) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
