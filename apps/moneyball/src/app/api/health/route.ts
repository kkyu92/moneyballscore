import { createClient } from '@/lib/supabase/server';
import { assertSelectOk } from '@moneyball/shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: string; detail?: string }> = {};

  // DB 연결 확인
  try {
    const supabase = await createClient();
    const result = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true });
    const { count } = assertSelectOk(result, 'health.leagues');
    checks.database = { status: 'ok', detail: `${count} leagues` };
  } catch (e) {
    checks.database = { status: 'error', detail: String(e) };
  }

  // 최근 파이프라인 실행 확인
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
      checks.pipeline = {
        status: data.status === 'success' ? 'ok' : 'warning',
        detail: `Last run: ${data.run_date} (${data.mode}) - ${data.status}`,
      };
    } else {
      checks.pipeline = { status: 'warning', detail: 'No pipeline runs yet' };
    }
  } catch {
    checks.pipeline = { status: 'warning', detail: 'No pipeline runs yet' };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  return Response.json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, {
    status: allOk ? 200 : 503,
  });
}
