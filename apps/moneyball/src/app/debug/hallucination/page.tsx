import { createClient } from '@supabase/supabase-js';

// v4-4 Task 6: /debug/hallucination 대시보드
// middleware.ts BASIC auth로 보호됨
// Eng 리뷰 A3 validator_logs 테이블 (migration 011)
//
// Service role 직접 사용: validator_logs는 RLS로 service role만 접근 가능.
// 일반 anon key로는 권한 없음. middleware BASIC auth가 이미 페이지 보호 중.

export const dynamic = 'force-dynamic'; // 항상 최신 데이터

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials required');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface ValidatorLog {
  id: number;
  game_id: number | null;
  team_code: string;
  backend: string;
  severity: string;
  violation_type: string;
  detail: string | null;
  created_at: string;
}

async function getStats() {
  const supabase = getAdminClient();

  // 최근 7일 전체 건수
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recent, error: recentErr } = await supabase
    .from('validator_logs')
    .select('id, severity, violation_type, backend, created_at', { count: 'exact' })
    .gte('created_at', sevenDaysAgo);

  if (recentErr) {
    return { error: recentErr.message, total: 0, byType: {}, byBackend: {}, samples: [] };
  }

  const logs = (recent ?? []) as Partial<ValidatorLog>[];
  const total = logs.length;

  // 사유별 분포
  const byType: Record<string, number> = {};
  for (const log of logs) {
    const key = log.violation_type ?? 'unknown';
    byType[key] = (byType[key] ?? 0) + 1;
  }

  // backend별 분포
  const byBackend: Record<string, number> = {};
  for (const log of logs) {
    const key = log.backend ?? 'unknown';
    byBackend[key] = (byBackend[key] ?? 0) + 1;
  }

  // 최근 샘플 20건
  const { data: samples } = await supabase
    .from('validator_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    total,
    byType,
    byBackend,
    samples: (samples ?? []) as ValidatorLog[],
    error: null,
  };
}

export default async function HallucinationDashboard() {
  const stats = await getStats();

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold mb-1">Hallucination Dashboard</h1>
        <p className="text-sm text-gray-500">
          최근 7일 validator reject 이벤트 · 내부용 · BASIC auth 보호
        </p>
      </header>

      {stats.error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-medium mb-2">DB 쿼리 실패</p>
          <p className="text-sm text-red-600 font-mono">{stats.error}</p>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm text-gray-500 mb-2">최근 7일 reject</h3>
              <p className="text-4xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">건</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm text-gray-500 mb-3">사유별 분포</h3>
              {Object.keys(stats.byType).length === 0 ? (
                <p className="text-gray-400 italic text-sm">reject 0건</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {Object.entries(stats.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <li key={type} className="flex justify-between">
                        <span className="font-mono text-gray-700">{type}</span>
                        <span className="text-gray-500">{count}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm text-gray-500 mb-3">Backend별 분포</h3>
              {Object.keys(stats.byBackend).length === 0 ? (
                <p className="text-gray-400 italic text-sm">데이터 없음</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {Object.entries(stats.byBackend)
                    .sort(([, a], [, b]) => b - a)
                    .map(([backend, count]) => (
                      <li key={backend} className="flex justify-between">
                        <span className="font-mono text-xs text-gray-700 truncate">
                          {backend}
                        </span>
                        <span className="text-gray-500 ml-2">{count}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </section>

          {/* 최근 reject 샘플 20건 */}
          <section>
            <h2 className="text-lg font-bold mb-3">최근 Reject 샘플 20건</h2>
            {stats.samples.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
                <p>reject 이벤트 없음 — 지난 7일 모두 정상</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">시각</th>
                      <th className="px-3 py-2 text-left">Game</th>
                      <th className="px-3 py-2 text-left">Team</th>
                      <th className="px-3 py-2 text-left">Backend</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Severity</th>
                      <th className="px-3 py-2 text-left">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.samples.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-500 font-mono">
                          {new Date(log.created_at).toLocaleString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-2 font-mono">{log.game_id ?? '—'}</td>
                        <td className="px-3 py-2 font-mono">{log.team_code}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600 truncate max-w-[140px]">
                          {log.backend}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {log.violation_type}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              log.severity === 'hard'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate">
                          {log.detail ?? '—'}
                        </td>
                      </tr>
                    ))}
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
