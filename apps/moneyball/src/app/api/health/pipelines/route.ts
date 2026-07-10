import { createClient } from '@/lib/supabase/server';
import { assertSelectOk, errMsg, HOUR_MS } from '@moneyball/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cloudflare Workers Cron '17 0-14 * * *' (UTC 0-14 = KST 9-23) →
// 4 mode 별 마지막 success 기대 freshness 임계. silent skip detection 강화.
const PIPELINE_MODES = [
  { mode: 'announce', stale_hours: 28 },
  { mode: 'predict', stale_hours: 15 },
  { mode: 'predict_final', stale_hours: 28 },
  { mode: 'verify', stale_hours: 28 },
] as const;

type ModeStatus = 'ok' | 'stale' | 'error' | 'never';
type ModeCheck = {
  status: ModeStatus;
  last_success_at: string | null;
  hours_since: number | null;
  stale_threshold_hours: number;
  detail?: string;
};

async function checkMode(
  mode: typeof PIPELINE_MODES[number]['mode'],
  staleHours: number,
): Promise<ModeCheck> {
  try {
    const supabase = await createClient();
    const result = await supabase
      .from('pipeline_runs')
      .select('created_at')
      .eq('mode', mode)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data } = assertSelectOk(result, `health.pipelines.${mode}`);
    if (!data) {
      return {
        status: 'never',
        last_success_at: null,
        hours_since: null,
        stale_threshold_hours: staleHours,
        detail: 'no successful runs',
      };
    }
    const last = new Date(data.created_at);
    const hoursSince = (Date.now() - last.getTime()) / HOUR_MS;
    return {
      status: hoursSince > staleHours ? 'stale' : 'ok',
      last_success_at: last.toISOString(),
      hours_since: Math.round(hoursSince * 10) / 10,
      stale_threshold_hours: staleHours,
    };
  } catch (e) {
    return {
      status: 'error',
      last_success_at: null,
      hours_since: null,
      stale_threshold_hours: staleHours,
      detail: errMsg(e),
    };
  }
}

export async function GET() {
  const start = Date.now();
  const results = await Promise.all(
    PIPELINE_MODES.map((m) => checkMode(m.mode, m.stale_hours)),
  );
  const modes: Record<string, ModeCheck> = {};
  for (let i = 0; i < PIPELINE_MODES.length; i++) {
    modes[PIPELINE_MODES[i].mode] = results[i];
  }

  const hasError = Object.values(modes).some((c) => c.status === 'error');
  const hasStale = Object.values(modes).some(
    (c) => c.status === 'stale' || c.status === 'never',
  );
  const overall: 'ok' | 'degraded' | 'fail' = hasError
    ? 'fail'
    : hasStale
      ? 'degraded'
      : 'ok';
  const httpStatus = overall === 'fail' ? 503 : 200;

  return Response.json(
    {
      overall,
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - start,
      modes,
    },
    {
      status: httpStatus,
      headers: { 'cache-control': 'no-store, no-cache, must-revalidate' },
    },
  );
}
