// M16 — pipeline_runs.skipped_detail JSONB cohort split.
// reason enum: window_too_early / window_too_late / not_scheduled / sp_unconfirmed / already_predicted
// shouldPredictGame (schedule.ts) reject reason 분포 시각화.

export interface SkippedEntry {
  game: string;
  reason: string;
}

export interface PipelineRunForStats {
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
  } catch {
    // silent fallback — main path 보호
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

// Korean label 매핑 — reason enum 안 한국어 자연어.
export const REJECT_REASON_LABEL: Record<string, string> = {
  window_too_early: 'window_too_early (window 미진입)',
  window_too_late: 'window_too_late (window 경과)',
  not_scheduled: 'not_scheduled (status≠scheduled)',
  sp_unconfirmed: 'sp_unconfirmed (선발 미확정)',
  already_predicted: 'already_predicted (existingSet cover)',
  unknown: 'unknown (parse fail)',
};
