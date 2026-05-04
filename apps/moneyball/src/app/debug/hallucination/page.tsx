import { createClient } from '@supabase/supabase-js';
import { buildHallucinationStats, type ValidatorLogInput } from '@/lib/dashboard/buildHallucinationStats';

// v4-4 Task 6: /debug/hallucination 대시보드
// middleware.ts BASIC auth로 보호됨
// Eng 리뷰 A3 validator_logs 테이블 (migration 011)
// cycle 28 — buildHallucinationStats 분리 + 일자별 추세 + 비율 추가 (P3)
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

interface DashboardData {
  error: string | null;
  total: number;
  hardCount: number;
  warnCount: number;
  byType: { key: string; count: number; pct: number }[];
  byBackend: { key: string; count: number; pct: number }[];
  daily: { date: string; hard: number; warn: number; total: number }[];
  samples: ValidatorLog[];
}

async function getStats(): Promise<DashboardData> {
  const supabase = getAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recent, error: recentErr } = await supabase
    .from('validator_logs')
    .select('severity, violation_type, backend, created_at')
    .gte('created_at', sevenDaysAgo);

  if (recentErr) {
    return {
      error: recentErr.message,
      total: 0,
      hardCount: 0,
      warnCount: 0,
      byType: [],
      byBackend: [],
      daily: [],
      samples: [],
    };
  }

  const stats = buildHallucinationStats((recent ?? []) as ValidatorLogInput[]);

  const { data: samples } = await supabase
    .from('validator_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    error: null,
    total: stats.total,
    hardCount: stats.hardCount,
    warnCount: stats.warnCount,
    byType: stats.byType,
    byBackend: stats.byBackend,
    daily: stats.daily,
    samples: (samples ?? []) as ValidatorLog[],
  };
}

function DailyTrend({
  daily,
}: {
  daily: { date: string; hard: number; warn: number; total: number }[];
}) {
  const max = Math.max(1, ...daily.map((d) => d.total));
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm text-gray-500 mb-4">일자별 추세 (7일, KST)</h3>
      <div className="flex items-end gap-2 h-32">
        {daily.map((d) => {
          const hardPct = (d.hard / max) * 100;
          const warnPct = (d.warn / max) * 100;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex-1 flex flex-col justify-end gap-px">
                <div
                  className="w-full bg-yellow-400"
                  style={{ height: `${warnPct}%` }}
                  title={`warn ${d.warn}건`}
                />
                <div
                  className="w-full bg-red-500"
                  style={{ height: `${hardPct}%` }}
                  title={`hard ${d.hard}건`}
                />
              </div>
              <div className="text-[10px] font-mono text-gray-500">
                {d.date.slice(5)}
              </div>
              <div className="text-[10px] text-gray-700">{d.total}</div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 text-xs text-gray-500 mt-3">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-red-500" /> hard
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-yellow-400" /> warn
        </span>
      </div>
    </div>
  );
}

function CategoryList({
  title,
  data,
}: {
  title: string;
  data: { key: string; count: number; pct: number }[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm text-gray-500 mb-3">{title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-400 italic text-sm">데이터 없음</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {data.map(({ key, count, pct }) => (
            <li key={key} className="flex justify-between items-baseline">
              <span className="font-mono text-xs text-gray-700 truncate max-w-[180px]">
                {key}
              </span>
              <span className="text-gray-500 ml-2">
                <span className="font-mono">{count}</span>
                <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
              <div className="text-xs text-gray-500 mt-2 flex gap-3">
                <span>
                  hard <span className="font-mono text-red-600">{stats.hardCount}</span>
                </span>
                <span>
                  warn <span className="font-mono text-yellow-700">{stats.warnCount}</span>
                </span>
              </div>
            </div>

            <CategoryList title="사유별 분포" data={stats.byType} />
            <CategoryList title="Backend별 분포" data={stats.byBackend} />
          </section>

          <section>
            <DailyTrend daily={stats.daily} />
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
