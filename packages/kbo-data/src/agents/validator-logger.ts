// cycle 30 — validator_logs fire-and-forget insert 통합 lib
//
// 기존 team-agent.ts 의 logValidatorRejection 을 분리 + judge-agent / postview 도 동일 path 재사용.
// migration 022 의 agent + passed 컬럼 박제.
//
// 정책:
// - violations.length === 0 → skip (insert X)
// - hot path 블로킹 X (호출부 await 없이 promise 던짐)
// - Supabase env 미박제 → silent skip (test/cli env)
// - lazy import (서버리스 cold start 최소화)

import type { Violation } from './validator';

export type ValidatorAgent = 'team' | 'judge';

export interface ValidatorLogEvent {
  gameId: number | null;
  teamCode: string;
  agent: ValidatorAgent;
  backend: string;
  passed: boolean;
  violations: Violation[];
}

export async function logValidatorEvent(event: ValidatorLogEvent): Promise<void> {
  if (event.violations.length === 0) return;

  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const v of event.violations) {
    const { error } = await db.from('validator_logs').insert({
      game_id: event.gameId,
      team_code: event.teamCode,
      agent: event.agent,
      backend: event.backend.slice(0, 50),
      severity: v.severity,
      violation_type: v.type,
      detail: v.detail.slice(0, 500),
      passed: event.passed,
    });
    if (error) {
      console.warn(
        `[validator_logs] insert failed (non-blocking) agent=${event.agent}: ${error.message}`
      );
    }
  }
}
