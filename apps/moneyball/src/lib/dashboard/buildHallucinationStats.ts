// cycle 28 — /debug/hallucination 대시보드 통계 분리
// spec docs/superpowers/specs/2026-05-04-llm-output-integrity-cycle25.md § 4.3 (P3)
// 기존 page.tsx 의 인라인 집계 로직을 순수 함수로 추출 + 일자별 추세 + 비율 추가.

export interface ValidatorLogInput {
  severity: string;
  violation_type: string;
  backend: string;
  created_at: string;
}

export interface CategoryBreakdown {
  key: string;
  count: number;
  pct: number;
}

export interface DayBucket {
  date: string;
  hard: number;
  warn: number;
  total: number;
}

export interface HallucinationStats {
  total: number;
  hardCount: number;
  warnCount: number;
  byType: CategoryBreakdown[];
  byBackend: CategoryBreakdown[];
  daily: DayBucket[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toIsoDate(value: string): string {
  // KST 기준 일자 박제 — UTC 가 자정 직전이면 다음날로 분류 위해 +9h shift
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function toBreakdown(counts: Record<string, number>, total: number): CategoryBreakdown[] {
  return Object.entries(counts)
    .map(([key, count]) => ({
      key,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildHallucinationStats(
  logs: ValidatorLogInput[],
  options?: { now?: Date; days?: number }
): HallucinationStats {
  const days = options?.days ?? 7;
  const now = options?.now ?? new Date();

  const total = logs.length;
  let hardCount = 0;
  let warnCount = 0;
  const typeCounts: Record<string, number> = {};
  const backendCounts: Record<string, number> = {};
  const dayMap = new Map<string, DayBucket>();

  // 빈 day bucket 미리 박제 (오늘 ~ N-1 일전, KST 기준)
  const todayKst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  for (let i = 0; i < days; i++) {
    const d = new Date(todayKst.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { date: key, hard: 0, warn: 0, total: 0 });
  }

  for (const log of logs) {
    const sev = log.severity ?? 'unknown';
    if (sev === 'hard') hardCount++;
    else if (sev === 'warn') warnCount++;

    const t = log.violation_type ?? 'unknown';
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;

    const b = log.backend ?? 'unknown';
    backendCounts[b] = (backendCounts[b] ?? 0) + 1;

    const dayKey = toIsoDate(log.created_at);
    const bucket = dayMap.get(dayKey);
    if (bucket) {
      bucket.total++;
      if (sev === 'hard') bucket.hard++;
      else if (sev === 'warn') bucket.warn++;
    }
  }

  return {
    total,
    hardCount,
    warnCount,
    byType: toBreakdown(typeCounts, total),
    byBackend: toBreakdown(backendCounts, total),
    daily: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
