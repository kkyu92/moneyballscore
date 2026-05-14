export interface PredRow {
  confidence: number;
  is_correct: boolean;
  verified_at: string;
  scoring_rule?: string | null;
  // homeWinProb from reasoning JSONB — used for proper Brier Score computation.
  // winner_prob = homeWinProb >= 0.5 ? homeWinProb : 1 - homeWinProb (always 0.5-1).
  // Falls back to confidence when null (old rows or parse failures).
  homeWinProb?: number | null;
}

function resolveWinnerProb(r: PredRow): number {
  if (r.homeWinProb != null) {
    const hwp = Number(r.homeWinProb);
    return hwp >= 0.5 ? hwp : 1 - hwp;
  }
  return Math.max(0.5, r.confidence);
}

export interface VersionHistoryRow {
  version: string;
  label: string;
  n: number;
  hits: number;
  accuracy: number | null;
  ci95Half: number;
  dateRange: string;
  brier: number | null;
  note: string;
}

export interface Bucket {
  lower: number;
  upper: number;
  n: number;
  hits: number;
  avgConf: number;
  hitRate: number;
  ci95Half: number;
}

export interface DayBucket {
  day: number; // 0=일,1=월,...,6=토
  dayLabel: string;
  n: number;
  hits: number;
  accuracy: number | null;
}

export interface WeekBucket {
  weekLabel: string;
  n: number;
  hits: number;
  accuracy: number | null;
}

export interface RecentForm {
  dots: boolean[];
  hits: number;
  total: number;
  trend: 'up' | 'down' | 'flat';
}

export interface ConfidenceTier {
  label: string;
  range: string;
  n: number;
  hits: number;
  accuracy: number | null;
  ci95Half: number;
}

const BUCKET_WIDTH = 0.05;
const BUCKET_START = 0.5;
const BUCKET_COUNT = 10;

export function bucketize(rows: PredRow[]): Bucket[] {
  const acc = Array.from({ length: BUCKET_COUNT }, () => ({
    sumConf: 0,
    n: 0,
    hits: 0,
  }));
  for (const r of rows) {
    const wp = resolveWinnerProb(r);
    const idx = Math.min(
      BUCKET_COUNT - 1,
      Math.max(0, Math.floor((wp - BUCKET_START) / BUCKET_WIDTH)),
    );
    acc[idx].sumConf += wp;
    acc[idx].n += 1;
    if (r.is_correct) acc[idx].hits += 1;
  }
  return acc.flatMap((b, i) => {
    if (b.n === 0) return [];
    const lower = BUCKET_START + i * BUCKET_WIDTH;
    const upper = lower + BUCKET_WIDTH;
    const hitRate = b.hits / b.n;
    const ci95Half = 1.96 * Math.sqrt((hitRate * (1 - hitRate)) / b.n);
    return [{ lower, upper, n: b.n, hits: b.hits, avgConf: b.sumConf / b.n, hitRate, ci95Half }];
  });
}

export function brierScore(rows: PredRow[]): number {
  if (rows.length === 0) return 0;
  let sum = 0;
  for (const r of rows) {
    const o = r.is_correct ? 1 : 0;
    sum += (resolveWinnerProb(r) - o) ** 2;
  }
  return sum / rows.length;
}

export function calibrationGap(rows: PredRow[]): number {
  if (rows.length === 0) return 0;
  const avgConf = rows.reduce((s, r) => s + resolveWinnerProb(r), 0) / rows.length;
  const acc = rows.filter((r) => r.is_correct).length / rows.length;
  return avgConf - acc;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월~일 순서

export function buildDayOfWeek(rows: PredRow[]): DayBucket[] {
  const acc = Array.from({ length: 7 }, (_, i) => ({ day: i, n: 0, hits: 0 }));
  for (const r of rows) {
    // verified_at은 UTC. KST = UTC+9
    const kstMs = new Date(r.verified_at).getTime() + 9 * 3600 * 1000;
    const dow = new Date(kstMs).getUTCDay();
    acc[dow].n += 1;
    if (r.is_correct) acc[dow].hits += 1;
  }
  return DOW_ORDER.map((day) => ({
    day,
    dayLabel: DAY_LABELS[day],
    n: acc[day].n,
    hits: acc[day].hits,
    accuracy: acc[day].n > 0 ? acc[day].hits / acc[day].n : null,
  }));
}

function getWeekStart(dateStr: string): string {
  // KST 기준으로 주 시작(월요일) 계산
  const kstMs = new Date(dateStr).getTime() + 9 * 3600 * 1000;
  const d = new Date(kstMs);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export function buildWeeklyTrend(rows: PredRow[]): WeekBucket[] {
  const weeks = new Map<string, { n: number; hits: number }>();
  for (const r of rows) {
    const wk = getWeekStart(r.verified_at);
    if (!weeks.has(wk)) weeks.set(wk, { n: 0, hits: 0 });
    const w = weeks.get(wk)!;
    w.n += 1;
    if (r.is_correct) w.hits += 1;
  }
  return Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([date, { n, hits }]) => {
      const d = new Date(date + 'T00:00:00Z');
      const month = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      return {
        weekLabel: `${month}/${day} 주`,
        n,
        hits,
        accuracy: n > 0 ? hits / n : null,
      };
    });
}

export function buildConfidenceTiers(rows: PredRow[]): ConfidenceTier[] {
  const tiers = [
    { label: '낮은 확신', range: '~55%', min: 0, max: 0.55 },
    { label: '보통 확신', range: '55~65%', min: 0.55, max: 0.65 },
    { label: '높은 확신', range: '65%~', min: 0.65, max: 1.01 },
  ];
  return tiers.map(({ label, range, min, max }) => {
    const subset = rows.filter((r) => r.confidence >= min && r.confidence < max);
    const n = subset.length;
    const hits = subset.filter((r) => r.is_correct).length;
    const accuracy = n > 0 ? hits / n : null;
    const ci95Half =
      accuracy !== null && n > 0
        ? 1.96 * Math.sqrt((accuracy * (1 - accuracy)) / n)
        : 0;
    return { label, range, n, hits, accuracy, ci95Half };
  });
}

export function buildRecentForm(rows: PredRow[], limit = 20): RecentForm {
  const recent = rows.slice(-limit);
  const dots = recent.map((r) => r.is_correct);
  const hits = dots.filter(Boolean).length;
  const total = dots.length;
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (total >= limit) {
    const half = Math.floor(limit / 2);
    const prev = dots.slice(0, half).filter(Boolean).length / half;
    const last = dots.slice(-half).filter(Boolean).length / half;
    const diff = last - prev;
    trend = diff >= 0.1 ? 'up' : diff <= -0.1 ? 'down' : 'flat';
  }
  return { dots, hits, total, trend };
}

const VERSION_ORDER = ['v1.5', 'v1.6', 'v1.7-revert', 'v1.8'];
const VERSION_META: Record<string, { label: string; note: string }> = {
  'v1.5': { label: 'v1.5', note: '기준 모델' },
  'v1.6': { label: 'v1.6', note: 'ELO·상대전적 실험 → 저조로 복원' },
  'v1.7-revert': { label: 'v1.7', note: 'v1.5 가중치 복원 + 일요일 상한 도입 (55%→45% 조정)' },
  'v1.8': { label: 'v1.8', note: 'ELO 10%↑ / head_to_head 3%↓' },
};

export function buildVersionHistory(rows: PredRow[]): VersionHistoryRow[] {
  const grouped = new Map<string, PredRow[]>();
  for (const r of rows) {
    const key = r.scoring_rule ?? '';
    if (!VERSION_ORDER.includes(key)) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return VERSION_ORDER.map((version) => {
    const vRows = grouped.get(version) ?? [];
    const n = vRows.length;
    const hits = vRows.filter((r) => r.is_correct).length;
    const accuracy = n > 0 ? hits / n : null;
    const ci95Half =
      accuracy !== null && n > 0
        ? 1.96 * Math.sqrt((accuracy * (1 - accuracy)) / n)
        : 0;

    let dateRange = '';
    if (n > 0) {
      const sorted = [...vRows].sort((a, b) =>
        a.verified_at.localeCompare(b.verified_at),
      );
      const kstFmt = (d: Date) => {
        const kst = new Date(d.getTime() + 9 * 3600 * 1000);
        return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`;
      };
      const first = new Date(sorted[0].verified_at);
      const last = new Date(sorted[n - 1].verified_at);
      dateRange =
        first.toDateString() === last.toDateString()
          ? kstFmt(first)
          : `${kstFmt(first)}~${kstFmt(last)}`;
    }

    let brier: number | null = null;
    if (n > 0) {
      let sum = 0;
      for (const r of vRows) {
        const o = r.is_correct ? 1 : 0;
        sum += (resolveWinnerProb(r) - o) ** 2;
      }
      brier = sum / n;
    }

    const meta = VERSION_META[version] ?? { label: version, note: '' };
    return { version, label: meta.label, n, hits, accuracy, ci95Half, dateRange, brier, note: meta.note };
  });
}
