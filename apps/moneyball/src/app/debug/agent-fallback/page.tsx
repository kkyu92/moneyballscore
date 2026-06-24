import { createClient } from '@supabase/supabase-js';
import { DAY_MS } from '@moneyball/shared';
import {
  buildAgentFallbackCohort,
  type PredictionForFallback,
} from '@/lib/debug/agentFallbackStats';

// cycle 986 — /debug/agent-fallback dashboard.
// middleware.ts BASIC auth 로 보호됨 (/debug/* matcher).
// predictions.reasoning.debate 직접 read 후 fullDebate / agentsFailed / quantOnly
// 일자별 분포 + agentError 카테고리 시각화. L1 (PR #1323 validator 야구 도메인) +
// L2 (PR #1324 529 backoff 확장) + L3 (PR #1325 prompt strict 강화) 통합 효과
// 5/27 cron fire 이후 실시간 monitoring channel.

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 14;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials required');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getCohort() {
  const supabase = getAdminClient();
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS).toISOString();
  const { data, error } = await supabase
    .from('predictions')
    .select('id, created_at, reasoning')
    .eq('prediction_type', 'pre_game')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return { error: error.message, cohort: null };
  const rows = (data ?? []) as PredictionForFallback[];
  return { error: null, cohort: buildAgentFallbackCohort(rows, WINDOW_DAYS) };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function AgentFallbackDebugPage() {
  const { error, cohort } = await getCohort();

  if (error || !cohort) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold mb-4">Agent Fallback Dashboard</h1>
        <p className="text-red-500">Error: {error ?? 'no cohort'}</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Agent Fallback Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          직전 {cohort.windowDays}일 pre_game predictions의 AI 토론 fullDebate / agentsFailed / quantOnly 분포.
          L1+L2+L3 (cycle 986) 통합 효과 monitoring.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card label="총 predictions" value={String(cohort.total)} sub={`${cohort.windowDays}일`} />
        <Card
          label="fullDebate"
          value={pct(cohort.fullDebateRate)}
          sub={`${cohort.fullDebate} / ${cohort.total}`}
          tone="success"
        />
        <Card
          label="agentsFailed"
          value={pct(cohort.agentsFailedRate)}
          sub={`${cohort.agentsFailed} / ${cohort.total}`}
          tone="error"
        />
        <Card
          label="quantOnly"
          value={pct(cohort.quantOnlyRate)}
          sub={`${cohort.quantOnly} / ${cohort.total}`}
          tone="warn"
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">agentError 카테고리</h2>
        {Object.keys(cohort.errorCategories).length === 0 ? (
          <p className="text-sm text-gray-500">no agentsFailed in window</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {Object.entries(cohort.errorCategories)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <li key={k} className="flex justify-between border-b border-gray-200 dark:border-gray-700 py-1">
                  <span className="font-mono">{k}</span>
                  <span>
                    {v} ({pct(v / cohort.agentsFailed || 0)})
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">일자별 분포</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <th className="text-left py-1">일자</th>
              <th className="text-right">total</th>
              <th className="text-right">full</th>
              <th className="text-right">agentsFailed</th>
              <th className="text-right">quantOnly</th>
              <th className="text-right">full%</th>
            </tr>
          </thead>
          <tbody>
            {cohort.daily.map((d) => (
              <tr key={d.date} className="border-b border-gray-200 dark:border-gray-700">
                <td className="font-mono py-1">{d.date}</td>
                <td className="text-right">{d.total}</td>
                <td className="text-right text-green-600 dark:text-green-400">{d.fullDebate}</td>
                <td className="text-right text-red-600 dark:text-red-400">{d.agentsFailed}</td>
                <td className="text-right text-yellow-600 dark:text-yellow-400">{d.quantOnly}</td>
                <td className="text-right">{d.total > 0 ? pct(d.fullDebate / d.total) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">샘플 (직전 {cohort.samples.length}건)</h2>
        <ul className="space-y-1 text-xs font-mono">
          {cohort.samples.map((s) => (
            <li key={s.id} className="border-b border-gray-200 dark:border-gray-700 py-1">
              <span className="text-gray-500">{s.date}</span>{' '}
              <span>id={s.id}</span>{' '}
              <span
                className={
                  s.category === 'fullDebate'
                    ? 'text-green-600 dark:text-green-400'
                    : s.category === 'agentsFailed'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                }
              >
                {s.category}
              </span>
              {s.errorCategory ? <span> · {s.errorCategory}</span> : null}
              {s.agentError ? <div className="text-gray-500 ml-4">{s.agentError}</div> : null}
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700">
        BASIC auth protected (/debug/* matcher). Last refresh: {new Date().toISOString()}.
      </footer>
    </main>
  );
}

interface CardProps {
  label: string;
  value: string;
  sub: string;
  tone?: 'success' | 'error' | 'warn';
}
function Card({ label, value, sub, tone }: CardProps) {
  const toneClass =
    tone === 'success'
      ? 'text-green-600 dark:text-green-400'
      : tone === 'error'
        ? 'text-red-600 dark:text-red-400'
        : tone === 'warn'
          ? 'text-yellow-600 dark:text-yellow-400'
          : '';
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  );
}
