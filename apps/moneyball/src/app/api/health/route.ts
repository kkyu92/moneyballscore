import { createClient } from '@/lib/supabase/server';
import { assertSelectOk } from '@moneyball/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CheckStatus = 'ok' | 'warning' | 'error';
type Check = { status: CheckStatus; detail?: string };

// sync: packages/kbo-data/src/types.ts KBO_SCHEDULE_REFERER (cycle 769 사례 8 봇차단 회피)
const KBO_API_URL = 'https://www.koreabaseball.com/Schedule/Schedule.aspx';
const KBO_SCHEDULE_REFERER = 'https://www.koreabaseball.com/Schedule/Schedule.aspx';
const SHA_HEX_REGEX = /^[0-9a-f]{40}$/i;
const KBO_TIMEOUT_MS = 5000;

async function checkSupabase(): Promise<Check> {
  try {
    const supabase = await createClient();
    const result = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true });
    const { count } = assertSelectOk(result, 'health.leagues');
    return { status: 'ok', detail: `${count} leagues` };
  } catch (e) {
    return { status: 'error', detail: e instanceof Error ? e.message : String(e) };
  }
}

async function checkPipeline(): Promise<Check> {
  try {
    const supabase = await createClient();
    const result = await supabase
      .from('pipeline_runs')
      .select('run_date, mode, status, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    const { data } = assertSelectOk(result, 'health.pipeline_runs');
    if (data) {
      return {
        status: data.status === 'success' ? 'ok' : 'warning',
        detail: `Last run: ${data.run_date} (${data.mode}) - ${data.status}`,
      };
    }
    return { status: 'warning', detail: 'No pipeline runs yet' };
  } catch {
    return { status: 'warning', detail: 'No pipeline runs yet' };
  }
}

async function checkKboApi(): Promise<Check> {
  try {
    const res = await fetch(KBO_API_URL, {
      method: 'GET',
      headers: { Referer: KBO_SCHEDULE_REFERER },
      signal: AbortSignal.timeout(KBO_TIMEOUT_MS),
    });
    if (res.status === 200) return { status: 'ok', detail: `HTTP ${res.status}` };
    return { status: 'warning', detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: 'error', detail: e instanceof Error ? e.message : String(e) };
  }
}

function checkDeployAlias(): Check {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!sha) return { status: 'warning', detail: 'VERCEL_GIT_COMMIT_SHA not set (preview/dev)' };
  if (!SHA_HEX_REGEX.test(sha)) return { status: 'error', detail: 'invalid SHA format' };
  return { status: 'ok', detail: sha.slice(0, 7) };
}

export async function GET() {
  const start = Date.now();
  const [supabaseResult, pipelineResult, kboApiResult] = await Promise.allSettled([
    checkSupabase(),
    checkPipeline(),
    checkKboApi(),
  ]);

  const checks: Record<string, Check> = {
    supabase: supabaseResult.status === 'fulfilled'
      ? supabaseResult.value
      : { status: 'error', detail: 'allSettled rejected' },
    pipeline: pipelineResult.status === 'fulfilled'
      ? pipelineResult.value
      : { status: 'error', detail: 'allSettled rejected' },
    kbo_api: kboApiResult.status === 'fulfilled'
      ? kboApiResult.value
      : { status: 'error', detail: 'allSettled rejected' },
    deploy_alias: checkDeployAlias(),
  };

  const hasError = Object.values(checks).some((c) => c.status === 'error');
  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const overall: 'ok' | 'degraded' | 'fail' = hasError ? 'fail' : allOk ? 'ok' : 'degraded';
  const httpStatus = overall === 'fail' ? 503 : 200;

  return Response.json(
    {
      status: allOk ? 'healthy' : overall === 'fail' ? 'unhealthy' : 'degraded',
      overall,
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - start,
      checks,
    },
    {
      status: httpStatus,
      headers: { 'cache-control': 'no-store, no-cache, must-revalidate' },
    },
  );
}
