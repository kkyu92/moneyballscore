import {
  ALL_SCORING_RULES,
  QUANT_PREGAME_VERSION,
  QUANT_POSTVIEW_VERSION,
  LLM_ACTIVE_VERSIONS,
  WINNER_PROB_CONFIDENT,
  WINNER_PROB_LEAN,
  type ModelVersion,
  type ScoringRule,
} from '@moneyball/shared';

// 적중률 3-tier color class — accuracy rate 표시 위치 일관 source-of-truth.
// >= 60% = brand (강한 적중) / >= 50% = yellow (균형) / else = red (저조).
// asPercent=true 일 때 rate 가 0~100 정수 (예: 65) / false 일 때 0~1 소수 (예: 0.65).
// caller: AccuracyHeaderCard / predictions/page.tsx tier row / reviews/page.tsx hero stat (sweep 51 통합).
export function accuracyRateColorClass(rate: number, asPercent = false): string {
  const high = asPercent ? 60 : 0.6;
  const mid = asPercent ? 50 : 0.5;
  if (rate >= high) return 'text-brand-600 dark:text-brand-400';
  if (rate >= mid) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export interface PredRow {
  confidence: number;
  is_correct: boolean;
  verified_at: string;
  scoring_rule?: string | null;
  model_version?: string | null;
  // homeWinProb from reasoning JSONB — used for proper Brier Score computation.
  // winner_prob = homeWinProb >= 0.5 ? homeWinProb : 1 - homeWinProb (always 0.5-1).
  // Falls back to confidence when null (old rows or parse failures).
  homeWinProb?: number | null;
}

// LLM 토론 활성 vs 정량 fallback 가시화.
// mv=LLM_DEBATE_VERSION = LLM debate 성공, mv=QUANT_PREGAME_VERSION = pregame 정량 fallback.
// mv=LLM_POSTVIEW_VERSION = LLM postview 성공, mv=QUANT_POSTVIEW_VERSION = postview 정량 fallback.
// QUANT_*_VERSION 단일 source — CURRENT_SCORING_RULE bump 시 shared 와 동시 박제.
export interface FallbackStatsRow {
  model_version: string | null;
  predicted_at: string;
}

export interface FallbackStats {
  total: number;
  llmActive: number;
  fallback: number;
  fallbackRate: number;
  oldestSeenAt: string | null;
  latestFallbackAt: string | null;
}

// LLM_ACTIVE_VERSIONS 는 shared 단일 source. FALLBACK_VERSIONS 는 QUANT_*_VERSION 두 상수만.
const FALLBACK_VERSIONS = new Set<string>([QUANT_PREGAME_VERSION, QUANT_POSTVIEW_VERSION]);

// LLM_ACTIVE_VERSIONS (shared) / FALLBACK_VERSIONS 변경 시 동시 박제 누락 차단 (silent drift family).
function classifyVersion(mv: string | null | undefined): 'llmActive' | 'fallback' | null {
  const v = mv ?? '';
  if (LLM_ACTIVE_VERSIONS.has(v as ModelVersion)) return 'llmActive';
  if (FALLBACK_VERSIONS.has(v)) return 'fallback';
  return null;
}

// 95% Wald CI half-width for binomial proportion. n=0 시 0.
function binomCi95Half(hits: number, n: number): number {
  if (n <= 0) return 0;
  const p = hits / n;
  return 1.96 * Math.sqrt((p * (1 - p)) / n);
}

export function buildFallbackStats(rows: FallbackStatsRow[]): FallbackStats {
  let llmActive = 0;
  let fallback = 0;
  let latestFallbackAt: string | null = null;
  let oldestSeenAt: string | null = null;
  for (const r of rows) {
    if (!oldestSeenAt || r.predicted_at < oldestSeenAt) oldestSeenAt = r.predicted_at;
    const cls = classifyVersion(r.model_version);
    if (cls === 'llmActive') {
      llmActive++;
    } else if (cls === 'fallback') {
      fallback++;
      if (!latestFallbackAt || r.predicted_at > latestFallbackAt) latestFallbackAt = r.predicted_at;
    }
  }
  const total = llmActive + fallback;
  return {
    total,
    llmActive,
    fallback,
    fallbackRate: total > 0 ? fallback / total : 0,
    oldestSeenAt,
    latestFallbackAt,
  };
}

// /accuracy "AI 토론 사용률" 섹션 일별 stacked bar 데이터.
// LLM 활성 vs quant-only fallback 일별 분포 가시화 — silent quality drift 차단.
export interface FallbackDailyBucket {
  dateISO: string; // YYYY-MM-DD (KST)
  dateLabel: string; // M/D
  llmActive: number;
  fallback: number;
  total: number;
}

export function buildFallbackDailyTrend(
  rows: FallbackStatsRow[],
  days: number,
  now: number = Date.now(),
): FallbackDailyBucket[] {
  const KST_OFFSET_MS = 9 * 3600 * 1000;
  const buckets = new Map<string, FallbackDailyBucket>();
  for (let i = days - 1; i >= 0; i--) {
    const kstDate = new Date(now + KST_OFFSET_MS - i * 86_400_000);
    const dateISO = kstDate.toISOString().slice(0, 10);
    const [, m, d] = dateISO.split('-');
    buckets.set(dateISO, {
      dateISO,
      dateLabel: `${Number(m)}/${Number(d)}`,
      llmActive: 0,
      fallback: 0,
      total: 0,
    });
  }
  for (const r of rows) {
    const kstISO = new Date(new Date(r.predicted_at).getTime() + KST_OFFSET_MS)
      .toISOString()
      .slice(0, 10);
    const b = buckets.get(kstISO);
    if (!b) continue;
    const cls = classifyVersion(r.model_version);
    if (cls === 'llmActive') {
      b.llmActive++;
      b.total++;
    } else if (cls === 'fallback') {
      b.fallback++;
      b.total++;
    }
  }
  return Array.from(buckets.values());
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
    const ci95Half = binomCi95Half(b.hits, b.n);
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
    { label: '낮은 확신', range: '~55%', min: 0, max: WINNER_PROB_LEAN },
    { label: '보통 확신', range: '55~65%', min: WINNER_PROB_LEAN, max: WINNER_PROB_CONFIDENT },
    { label: '높은 확신', range: '65%~', min: WINNER_PROB_CONFIDENT, max: 1.01 },
  ];
  return tiers.map(({ label, range, min, max }) => {
    const subset = rows.filter((r) => r.confidence >= min && r.confidence < max);
    const n = subset.length;
    const hits = subset.filter((r) => r.is_correct).length;
    const accuracy = n > 0 ? hits / n : null;
    const ci95Half = binomCi95Half(hits, n);
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

// VERSION_ORDER = ALL_SCORING_RULES (shared tuple). 신규 버전 추가 시
// shared/model-version-labels.ts ALL_SCORING_RULES 1줄 변경 = ScoringRule union +
// VERSION_ORDER 동시 박제. shared invariant test (ALL_SCORING_RULES 누락 검출) 와 짝.
const VERSION_ORDER = ALL_SCORING_RULES;

// 새 ScoringRule 추가 시 VERSION_NOTES 한 줄만 박제 (label 필드 동기 잊을 surface 제거).
// label==key 중복 제거 + '-revert' suffix strip 만 labelOf() 안 special-case.
const VERSION_NOTES: Record<ScoringRule, string> = {
  'v1.5': '기준 모델',
  'v1.6': 'ELO·상대전적 실험 → 저조로 복원',
  'v1.7-revert': 'v1.5 가중치 복원 + 일요일 상한 0.55 도입',
  'v1.8': 'ELO 10%↑ / head_to_head 3%↓ + 일요일 상한 0.45 조정',
};

function labelOf(version: ScoringRule): string {
  return version.replace(/-revert$/, '');
}

function isScoringRule(s: string): s is ScoringRule {
  return (VERSION_ORDER as readonly string[]).includes(s);
}

// cycle 627 explore-idea heavy — spec 623 candidate A: v1.8 sub-cohort split.
// v1.8 scoring_rule 안 LLM debate 활성 (model_version='v2.0-debate') vs quant
// fallback (model_version!='v2.0-debate', 보통 'v1.8') 2분할. 사용자 가시
// 사용률 + 적중률 sub-cohort 공개.
export interface SubCohortBucket {
  label: string;
  n: number;
  hits: number;
  accuracy: number | null;
  ci95Half: number;
}

export interface V18SubCohortStats {
  realDebate: SubCohortBucket;
  fallback: SubCohortBucket;
  total: number;
}

export function buildV18SubCohort(rows: PredRow[]): V18SubCohortStats {
  const v18Rows = rows.filter((r) => r.scoring_rule === 'v1.8');
  const realDebateRows = v18Rows.filter(
    (r) => r.model_version != null && LLM_ACTIVE_VERSIONS.has(r.model_version as ModelVersion),
  );
  const fallbackRows = v18Rows.filter(
    (r) => r.model_version == null || !LLM_ACTIVE_VERSIONS.has(r.model_version as ModelVersion),
  );

  const toBucket = (label: string, subset: PredRow[]): SubCohortBucket => {
    const n = subset.length;
    const hits = subset.filter((r) => r.is_correct).length;
    return {
      label,
      n,
      hits,
      accuracy: n > 0 ? hits / n : null,
      ci95Half: binomCi95Half(hits, n),
    };
  };

  return {
    realDebate: toBucket('AI 토론 활성', realDebateRows),
    fallback: toBucket('정량 fallback', fallbackRows),
    total: v18Rows.length,
  };
}

export function buildVersionHistory(rows: PredRow[]): VersionHistoryRow[] {
  const grouped = new Map<ScoringRule, PredRow[]>();
  for (const r of rows) {
    const key = r.scoring_rule ?? '';
    if (!isScoringRule(key)) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return VERSION_ORDER.map((version) => {
    const vRows = grouped.get(version) ?? [];
    const n = vRows.length;
    const hits = vRows.filter((r) => r.is_correct).length;
    const accuracy = n > 0 ? hits / n : null;
    const ci95Half = binomCi95Half(hits, n);

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

    return {
      version,
      label: labelOf(version),
      n,
      hits,
      accuracy,
      ci95Half,
      dateRange,
      brier,
      note: VERSION_NOTES[version] ?? '',
    };
  });
}
