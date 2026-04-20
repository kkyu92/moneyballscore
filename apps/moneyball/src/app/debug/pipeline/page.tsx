import { createClient } from '@supabase/supabase-js';

// PLAN_v5 Phase 3 — /debug/pipeline 대시보드
// middleware.ts BASIC auth 로 보호됨 (/debug/* matcher)
//
// pipeline_runs 최근 30일 표시. mode 별 subtotal + 이번 주 GAP 강조.
// /debug/hallucination 패턴 답습.

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials required');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface PipelineRun {
  id: number;
  run_date: string;
  mode: string;
  status: string;
  games_found: number;
  predictions: number;
  games_skipped: number;
  errors: string;
  skipped_detail: string | null;
  duration_ms: number;
  triggered_by: string;
  created_at: string;
}

interface SkippedEntry {
  game: string;
  reason: string;
}

function parseSkippedDetail(raw: string | null): SkippedEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as SkippedEntry[];
  } catch {}
  return [];
}

function summarizeReasons(entries: SkippedEntry[]): string {
  if (entries.length === 0) return '';
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([r, n]) => `${r}:${n}`)
    .join(', ');
}

interface ModeSubtotal {
  runs: number;
  success: number;
  partial: number;
  error: number;
  totalPredictions: number;
  avgDurationMs: number;
}

async function getPipelineStats() {
  const supabase = getAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentRuns, error: runsErr } = await supabase
    .from('pipeline_runs')
    .select('*')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false });

  if (runsErr) {
    return {
      error: runsErr.message, runs: [], byMode: {},
      gapEventsWeek: [], totalRuns: 0,
    };
  }

  const runs = (recentRuns ?? []) as PipelineRun[];

  // mode 별 subtotal
  const byMode: Record<string, ModeSubtotal> = {};
  for (const run of runs) {
    if (!byMode[run.mode]) {
      byMode[run.mode] = {
        runs: 0, success: 0, partial: 0, error: 0,
        totalPredictions: 0, avgDurationMs: 0,
      };
    }
    const m = byMode[run.mode];
    m.runs++;
    if (run.status === 'success') m.success++;
    else if (run.status === 'partial') m.partial++;
    else if (run.status === 'error') m.error++;
    m.totalPredictions += run.predictions;
    m.avgDurationMs += run.duration_ms;
  }
  for (const key of Object.keys(byMode)) {
    byMode[key].avgDurationMs = Math.round(byMode[key].avgDurationMs / byMode[key].runs);
  }

  // 이번 주 GAP / SP_UNCONFIRMED 이벤트 추출 — errors JSONB 마커 기반
  const gapEventsWeek: Array<{ run_date: string; mode: string; gap_msg: string; created_at: string }> = [];
  const spEventsWeek: Array<{ run_date: string; mode: string; sp_msg: string; created_at: string }> = [];
  for (const run of runs) {
    if (run.created_at < sevenDaysAgo) continue;
    let errs: string[] = [];
    try {
      errs = JSON.parse(run.errors || '[]');
    } catch {
      continue;
    }
    for (const e of errs) {
      if (typeof e !== 'string') continue;
      if (e.includes('[GAP]')) {
        gapEventsWeek.push({
          run_date: run.run_date, mode: run.mode,
          gap_msg: e, created_at: run.created_at,
        });
      } else if (e.includes('[SP_UNCONFIRMED]')) {
        spEventsWeek.push({
          run_date: run.run_date, mode: run.mode,
          sp_msg: e, created_at: run.created_at,
        });
      }
    }
  }

  return {
    runs: runs.slice(0, 50),
    byMode, gapEventsWeek, spEventsWeek,
    totalRuns: runs.length, error: null,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function modeBadge(mode: string) {
  const colors: Record<string, string> = {
    announce: 'bg-blue-100 text-blue-700',
    predict: 'bg-green-100 text-green-700',
    predict_final: 'bg-purple-100 text-purple-700',
    verify: 'bg-amber-100 text-amber-700',
  };
  return colors[mode] ?? 'bg-gray-100 text-gray-700';
}

function statusBadge(status: string) {
  if (status === 'success') return 'bg-green-100 text-green-700';
  if (status === 'partial') return 'bg-yellow-100 text-yellow-700';
  if (status === 'error') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

export default async function PipelineDashboard() {
  const stats = await getPipelineStats();

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-6">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold mb-1">Pipeline Dashboard</h1>
        <p className="text-sm text-gray-500">
          최근 30일 pipeline_runs · 내부용 · BASIC auth 보호 · PLAN_v5 Phase 3
        </p>
      </header>

      {stats.error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-medium mb-2">DB 쿼리 실패</p>
          <p className="text-sm text-red-600 font-mono">{stats.error}</p>
        </div>
      ) : (
        <>
          {/* 요약 상단 */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm text-gray-500 mb-2">최근 30일 전체 run</h3>
              <p className="text-4xl font-bold">{stats.totalRuns}</p>
              <p className="text-xs text-gray-500 mt-1">건</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm text-gray-500 mb-2">이번 주 GAP 이벤트</h3>
              <p
                className={`text-4xl font-bold ${
                  stats.gapEventsWeek.length > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {stats.gapEventsWeek.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.gapEventsWeek.length > 0 ? '누락 감지됨' : '예측 누락 0건'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm text-gray-500 mb-2">cron 무료 티어 사용</h3>
              <p className="text-4xl font-bold">
                {Math.round((stats.totalRuns * 30) / 60)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                분/월 추정 (run 당 30초)
              </p>
            </div>
          </section>

          {/* Mode 별 subtotal */}
          <section>
            <h2 className="text-lg font-bold mb-3">Mode 별 30일 합계</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Mode</th>
                    <th className="px-3 py-2 text-right">Runs</th>
                    <th className="px-3 py-2 text-right">Success</th>
                    <th className="px-3 py-2 text-right">Partial</th>
                    <th className="px-3 py-2 text-right">Error</th>
                    <th className="px-3 py-2 text-right">총 예측</th>
                    <th className="px-3 py-2 text-right">평균 duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(stats.byMode)
                    .sort(([, a], [, b]) => b.runs - a.runs)
                    .map(([mode, sub]) => (
                      <tr key={mode} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${modeBadge(mode)}`}>
                            {mode}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{sub.runs}</td>
                        <td className="px-3 py-2 text-right font-mono text-green-600">
                          {sub.success}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-yellow-600">
                          {sub.partial}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-red-600">
                          {sub.error}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {sub.totalPredictions}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-gray-600">
                          {formatDuration(sub.avgDurationMs)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 이번 주 SP 미확정 이벤트 */}
          {stats.spEventsWeek && stats.spEventsWeek.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3 text-amber-700">⚠️ 이번 주 선발 미확정 이벤트</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-amber-100 text-xs text-amber-800">
                    <tr>
                      <th className="px-3 py-2 text-left">시각</th>
                      <th className="px-3 py-2 text-left">Run date</th>
                      <th className="px-3 py-2 text-left">Mode</th>
                      <th className="px-3 py-2 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {stats.spEventsWeek.map((s, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs text-gray-700 font-mono">
                          {new Date(s.created_at).toLocaleString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-2 font-mono">{s.run_date}</td>
                        <td className="px-3 py-2 font-mono text-xs">{s.mode}</td>
                        <td className="px-3 py-2 text-xs text-amber-700">{s.sp_msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 이번 주 GAP 이벤트 */}
          {stats.gapEventsWeek.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3 text-red-700">⚠️ 이번 주 GAP 이벤트</h2>
              <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-red-100 text-xs text-red-800">
                    <tr>
                      <th className="px-3 py-2 text-left">시각</th>
                      <th className="px-3 py-2 text-left">Run date</th>
                      <th className="px-3 py-2 text-left">Mode</th>
                      <th className="px-3 py-2 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {stats.gapEventsWeek.map((g, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs text-gray-700 font-mono">
                          {new Date(g.created_at).toLocaleString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-2 font-mono">{g.run_date}</td>
                        <td className="px-3 py-2 font-mono text-xs">{g.mode}</td>
                        <td className="px-3 py-2 text-xs text-red-700">{g.gap_msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 최근 50 run 리스트 */}
          <section>
            <h2 className="text-lg font-bold mb-3">최근 50 run</h2>
            {stats.runs.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
                <p>pipeline_runs 기록 없음</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">시각</th>
                      <th className="px-3 py-2 text-left">Run date</th>
                      <th className="px-3 py-2 text-left">Mode</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Games</th>
                      <th className="px-3 py-2 text-right">Pred</th>
                      <th className="px-3 py-2 text-right">Skip</th>
                      <th className="px-3 py-2 text-right">Duration</th>
                      <th className="px-3 py-2 text-left">첫 에러</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.runs.map((run) => {
                      let errs: string[] = [];
                      try {
                        errs = JSON.parse(run.errors || '[]');
                      } catch {}
                      const hasGap = errs.some((e) => typeof e === 'string' && e.includes('[GAP]'));
                      return (
                        <tr
                          key={run.id}
                          className={hasGap ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                        >
                          <td className="px-3 py-2 text-xs text-gray-500 font-mono">
                            {new Date(run.created_at).toLocaleString('ko-KR', {
                              month: '2-digit', day: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{run.run_date}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${modeBadge(run.mode)}`}>
                              {run.mode}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(run.status)}`}>
                              {run.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{run.games_found}</td>
                          <td className="px-3 py-2 text-right font-mono">{run.predictions}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-500">
                            <div>{run.games_skipped}</div>
                            {(() => {
                              const entries = parseSkippedDetail(run.skipped_detail);
                              const summary = summarizeReasons(entries);
                              return summary ? (
                                <div
                                  className="text-[10px] text-gray-400 mt-0.5"
                                  title={entries
                                    .map((e) => `${e.game} — ${e.reason}`)
                                    .join('\n')}
                                >
                                  {summary}
                                </div>
                              ) : null;
                            })()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs text-gray-600">
                            {formatDuration(run.duration_ms)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate">
                            {errs.length > 0 ? errs[0] : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
