import { createClient } from '@supabase/supabase-js';
import {
  buildSilentDriftCohort,
  type PipelineRunForDrift,
} from '@/lib/debug/silentDriftStats';

// M14 — silent drift family alert dashboard (plan #10 Tier 1, cycle 947)
// middleware.ts BASIC auth 로 보호됨 (/debug/* matcher)
// silent-drift-alert.ts (cycle 819 + 886) trigger evidence 누적 시각화.
// 사례 11 family monitoring.

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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

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

export default async function SilentDriftDashboard() {
  const { error, cohort } = await getSilentDriftEvidence();

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold mb-1">Silent Drift Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          silent-drift-alert.ts (cycle 819 + 886) trigger evidence — 사례 11 family monitoring · BASIC auth
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
                games_found {`>`} 0 + predictions=0 (existingPredictionsCount proxy — cycle 864 false positive 정정 후 cover&lt;games_found 조건). cycle 819 PR #1179 alert channel.
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
                games_found {`>`} 0 + predictions=0 proxy. cycle 886 PR #1220 verify extension.
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
        </>
      )}
    </div>
  );
}
