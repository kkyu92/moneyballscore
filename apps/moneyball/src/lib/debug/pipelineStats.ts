// M16 — pipeline_runs.skipped_detail JSONB cohort split.
// reason enum: window_too_early / window_too_late / not_scheduled / sp_unconfirmed / already_predicted
//   (shouldPredictGame, schedule.ts) + debate_fallback_quant (daily.ts debate.agentsFailed
//   fall-through — 게임 자체는 스킵 안 되고 quant-only 로 예측 진행되지만 동일
//   skipped_detail 배열에 적재됨, cycle 884 D fix)
// shouldPredictGame (schedule.ts) reject reason 분포 + debate fallback 이벤트 시각화.
//
// degraded-flag-exempt: 이 파일의 유일한 catch(JSON.parse 실패, parseSkippedDetail)는 Supabase
// 조회와 무관 — `.from(` 은 전혀 없고 `Array.from(` 만 존재(cycle 3402 구조 가드 테스트 false
// positive 패턴, grep 매칭 기준 단어 경계 없는 `.from(` 때문).

export interface SkippedEntry {
  game: string;
  reason: string;
}

interface PipelineRunForStats {
  skipped_detail: string | null;
  games_skipped: number;
}

export interface RejectReasonCell {
  reason: string;
  count: number;
  pct: number;
}

export function parseSkippedDetail(raw: string | null): SkippedEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as SkippedEntry[];
  } catch (err) {
    console.warn('[parseSkippedDetail] JSON parse failed', err);
  }
  return [];
}

// 모든 runs.skipped_detail entries flatten → reason count desc sort.
export function buildRejectReasonBreakdown(runs: PipelineRunForStats[]): RejectReasonCell[] {
  const counts = new Map<string, number>();
  for (const run of runs) {
    const entries = parseSkippedDetail(run.skipped_detail);
    for (const e of entries) {
      const reason = e.reason || 'unknown';
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  return Array.from(counts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      pct: count / total,
    }))
    .sort((a, b) => b.count - a.count);
}

interface PipelineRunForMarkerEvents {
  run_date: string;
  mode: string;
  created_at: string;
  errors: string[];
}

export interface MarkerEvent {
  run_date: string;
  mode: string;
  msg: string;
  created_at: string;
}

// pipeline_runs.errors 는 JSONB 컬럼 — insert 시 string[] 그대로 저장(stringify 안 함, daily.ts).
// supabase-js 는 이를 이미 파싱된 JS 배열로 반환하므로 여기서 JSON.parse 하면 안 됨
// (cycle 3423 발견 — 과거 JSON.parse(run.errors) 가 매번 throw 돼 GAP/SP_UNCONFIRMED 카드가
// silent 하게 항상 0 으로 표시됨. skipped_detail 과 달리 errors 는 이중 인코딩 안 함).
export function extractWeeklyMarkerEvents(
  runs: PipelineRunForMarkerEvents[],
  sinceIso: string,
  marker: string
): MarkerEvent[] {
  const out: MarkerEvent[] = [];
  for (const run of runs) {
    if (run.created_at < sinceIso) continue;
    const errs = run.errors ?? [];
    for (const e of errs) {
      if (typeof e === 'string' && e.includes(marker)) {
        out.push({ run_date: run.run_date, mode: run.mode, msg: e, created_at: run.created_at });
      }
    }
  }
  return out;
}

// Korean label 매핑 — reason enum 안 한국어 자연어.
export const REJECT_REASON_LABEL: Record<string, string> = {
  window_too_early: 'window_too_early (window 미진입)',
  window_too_late: 'window_too_late (window 경과)',
  not_scheduled: 'not_scheduled (status≠scheduled)',
  sp_unconfirmed: 'sp_unconfirmed (선발 미확정)',
  already_predicted: 'already_predicted (existingSet cover)',
  debate_fallback_quant: 'debate_fallback_quant (에이전트 실패 → 정량 모델 단독)',
  unknown: 'unknown (parse fail)',
};
