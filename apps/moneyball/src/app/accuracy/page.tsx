import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { CURRENT_MODEL_FILTER } from '@/config/model';
import { buildAllTeamAccuracy } from '@/lib/standings/buildTeamAccuracy';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { shortTeamName } from '@moneyball/shared';

export const revalidate = 3600;

const SITE_URL = 'https://moneyballscore.vercel.app';

export const metadata: Metadata = {
  title: 'AI 적중 기록 — MoneyBall Score',
  description:
    'MoneyBall Score AI 예측 적중률 공개. 신뢰도별 캘리브레이션, 주별 트렌드, 팀별 성과를 투명하게 공개합니다.',
  alternates: { canonical: `${SITE_URL}/accuracy` },
  openGraph: {
    title: 'AI 적중 기록 — MoneyBall Score',
    description: 'KBO AI 예측 적중률 공개 트래킹. 얼마나 정확한지 솔직하게 보여드립니다.',
    url: `${SITE_URL}/accuracy`,
    type: 'website',
    locale: 'ko_KR',
    siteName: 'MoneyBall Score',
  },
};

// ── 캘리브레이션 로직 ──────────────────────────────────────────
interface PredRow {
  confidence: number;
  is_correct: boolean;
  verified_at: string;
}

interface Bucket {
  lower: number;
  upper: number;
  n: number;
  hits: number;
  avgConf: number;
  hitRate: number;
  ci95Half: number;
}

const BUCKET_WIDTH = 0.05;
const BUCKET_START = 0.5;
const BUCKET_COUNT = 10;

function bucketize(rows: PredRow[]): Bucket[] {
  const acc = Array.from({ length: BUCKET_COUNT }, () => ({
    sumConf: 0,
    n: 0,
    hits: 0,
  }));
  for (const r of rows) {
    const idx = Math.min(
      BUCKET_COUNT - 1,
      Math.max(0, Math.floor((r.confidence - BUCKET_START) / BUCKET_WIDTH)),
    );
    acc[idx].sumConf += r.confidence;
    acc[idx].n += 1;
    if (r.is_correct) acc[idx].hits += 1;
  }
  return acc.flatMap((b, i) => {
    if (b.n === 0) return [];
    const lower = BUCKET_START + i * BUCKET_WIDTH;
    const upper = lower + BUCKET_WIDTH;
    const hitRate = b.hits / b.n;
    const ci95Half = 1.96 * Math.sqrt((hitRate * (1 - hitRate)) / b.n);
    return [
      {
        lower,
        upper,
        n: b.n,
        hits: b.hits,
        avgConf: b.sumConf / b.n,
        hitRate,
        ci95Half,
      },
    ];
  });
}

function brierScore(rows: PredRow[]): number {
  if (rows.length === 0) return 0;
  let sum = 0;
  for (const r of rows) {
    const o = r.is_correct ? 1 : 0;
    sum += (r.confidence - o) ** 2;
  }
  return sum / rows.length;
}

function calibrationGap(rows: PredRow[]): number {
  if (rows.length === 0) return 0;
  const avgConf = rows.reduce((s, r) => s + r.confidence, 0) / rows.length;
  const acc = rows.filter((r) => r.is_correct).length / rows.length;
  return avgConf - acc;
}

// ── 주별 집계 ──────────────────────────────────────────────────
interface WeekBucket {
  weekLabel: string;
  n: number;
  hits: number;
  accuracy: number | null;
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function buildWeeklyTrend(rows: PredRow[]): WeekBucket[] {
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

// ── SVG 캘리브레이션 다이어그램 ───────────────────────────────
const PLOT_SIZE = 400;
const PAD_LEFT = 55;
const PAD_BOTTOM = 45;
const PAD_TOP = 25;
const PAD_RIGHT = 25;
const VW = PLOT_SIZE + PAD_LEFT + PAD_RIGHT;
const VH = PLOT_SIZE + PAD_TOP + PAD_BOTTOM;
const AXIS_MIN = 0.4;
const AXIS_MAX = 1.0;

function px(v: number): number {
  return PAD_LEFT + ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * PLOT_SIZE;
}
function py(v: number): number {
  return PAD_TOP + PLOT_SIZE - ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * PLOT_SIZE;
}

function CalibrationChart({ buckets }: { buckets: Bucket[] }) {
  const ticks = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full max-w-[600px] h-auto"
      role="img"
      aria-label="신뢰도 vs 실제 적중률 캘리브레이션 다이어그램"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={px(t)}
            y1={PAD_TOP}
            x2={px(t)}
            y2={PAD_TOP + PLOT_SIZE}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
          <text
            x={px(t)}
            y={PAD_TOP + PLOT_SIZE + 18}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            opacity="0.55"
          >
            {(t * 100).toFixed(0)}%
          </text>
          <line
            x1={PAD_LEFT}
            y1={py(t)}
            x2={PAD_LEFT + PLOT_SIZE}
            y2={py(t)}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
          <text
            x={PAD_LEFT - 7}
            y={py(t) + 4}
            textAnchor="end"
            fontSize="10"
            fill="currentColor"
            opacity="0.55"
          >
            {(t * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* 완벽 보정 대각선 */}
      <line
        x1={px(AXIS_MIN)}
        y1={py(AXIS_MIN)}
        x2={px(AXIS_MAX)}
        y2={py(AXIS_MAX)}
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeDasharray="4 4"
      />
      <text x={px(0.91)} y={py(0.88)} fontSize="9" fill="currentColor" opacity="0.35">
        완벽 보정
      </text>

      {/* 동전 50% 기준선 */}
      <line
        x1={px(AXIS_MIN)}
        y1={py(0.5)}
        x2={px(AXIS_MAX)}
        y2={py(0.5)}
        stroke="currentColor"
        strokeOpacity="0.08"
      />

      {buckets.map((b) => {
        const cx = px(b.avgConf);
        const cy = py(b.hitRate);
        const r = Math.max(5, Math.min(16, Math.sqrt(b.n) * 3.5));
        const small = b.n < 5;
        const colVar = small ? '#9ca3af' : 'var(--color-brand-500)';
        return (
          <g key={b.lower}>
            <line
              x1={cx}
              y1={py(Math.min(1, b.hitRate + b.ci95Half))}
              x2={cx}
              y2={py(Math.max(0, b.hitRate - b.ci95Half))}
              style={{ stroke: colVar }}
              strokeWidth="1.5"
              opacity="0.35"
            />
            <circle cx={cx} cy={cy} r={r} style={{ fill: colVar }} fillOpacity="0.8" />
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="white"
            >
              {b.n}
            </text>
          </g>
        );
      })}

      <text
        x={PAD_LEFT + PLOT_SIZE / 2}
        y={VH - 5}
        textAnchor="middle"
        fontSize="11"
        fill="currentColor"
        opacity="0.6"
      >
        AI 신뢰도 (confidence)
      </text>
      <text
        x={12}
        y={PAD_TOP + PLOT_SIZE / 2}
        textAnchor="middle"
        fontSize="11"
        fill="currentColor"
        opacity="0.6"
        transform={`rotate(-90, 12, ${PAD_TOP + PLOT_SIZE / 2})`}
      >
        실제 적중률
      </text>
    </svg>
  );
}

// ── 페이지 ─────────────────────────────────────────────────────
export default async function AccuracyPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('predictions')
    .select('confidence, is_correct, verified_at')
    .match(CURRENT_MODEL_FILTER)
    .eq('prediction_type', 'pre_game')
    .not('verified_at', 'is', null)
    .not('is_correct', 'is', null)
    .order('verified_at', { ascending: true });

  const teamRows = await buildAllTeamAccuracy();

  const rows = error ? [] : ((data ?? []) as PredRow[]);
  const n = rows.length;
  const correct = rows.filter((r) => r.is_correct).length;
  const overallAcc = n > 0 ? correct / n : 0;
  const brier = brierScore(rows);
  const gap = calibrationGap(rows);
  const buckets = bucketize(rows);
  const weekly = buildWeeklyTrend(rows);

  const lastUpdated = rows.length > 0 ? rows[rows.length - 1].verified_at : null;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumb items={[{ label: 'AI 적중 기록' }]} className="mb-2" />

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">AI 적중 기록</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          MoneyBall Score AI가 얼마나 정확한지 솔직하게 공개합니다. 시즌 내 모든 검증 완료 예측 기준.
        </p>
        {lastUpdated && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            최종 업데이트:{' '}
            {new Date(lastUpdated).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </header>

      {/* 주요 지표 카드 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="검증 완료" value={n.toString()} sub="경기" />
        <StatCard
          label="전체 적중률"
          value={`${(overallAcc * 100).toFixed(1)}%`}
          sub={`${correct}/${n} 적중`}
          accent={overallAcc >= 0.5}
        />
        <StatCard
          label="Brier Score"
          value={brier.toFixed(3)}
          sub="낮을수록 좋음 (동전=0.25)"
        />
        <StatCard
          label="보정 오차"
          value={`${gap >= 0 ? '+' : ''}${(gap * 100).toFixed(1)}%p`}
          sub={
            Math.abs(gap) < 0.03 ? '잘 보정됨' : gap > 0 ? '과신 경향' : '저신 경향'
          }
        />
      </section>

      {/* 캘리브레이션 다이어그램 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
        <div>
          <h2 className="text-lg font-bold">신뢰도 vs 실제 적중률</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            AI가 60% 확신으로 예측하면 실제로 60%를 맞히는가? 대각선에 가까울수록 잘 보정된 AI입니다.
            원 크기 ∝ 예측 건수. 세로 막대 = 95% 신뢰구간.
          </p>
        </div>
        {n === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">
            아직 검증된 예측이 없습니다.
          </p>
        ) : (
          <CalibrationChart buckets={buckets} />
        )}
      </section>

      {/* 주별 트렌드 */}
      {weekly.length > 0 && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <h2 className="text-lg font-bold">주별 적중률 트렌드</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)]">
                  <th className="py-2 pr-4 font-medium">주차</th>
                  <th className="py-2 pr-4 font-medium text-right">예측</th>
                  <th className="py-2 pr-4 font-medium text-right">적중</th>
                  <th className="py-2 font-medium text-right">적중률</th>
                </tr>
              </thead>
              <tbody>
                {weekly.map((w) => (
                  <tr
                    key={w.weekLabel}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-2 pr-4">{w.weekLabel}</td>
                    <td className="py-2 pr-4 text-right font-mono">{w.n}</td>
                    <td className="py-2 pr-4 text-right font-mono">{w.hits}</td>
                    <td
                      className={`py-2 text-right font-mono font-semibold ${w.accuracy !== null && w.accuracy >= 0.5 ? 'text-brand-500' : ''}`}
                    >
                      {w.accuracy !== null
                        ? `${(w.accuracy * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 팀별 성과 */}
      {teamRows.length > 0 && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">팀별 예측 성과</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              경기 관련 팀 기준. 홈/원정 구분 없이 집계. N &lt; 3 팀은 샘플 부족 표시.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)]">
                  <th className="py-2 pr-4 font-medium">팀</th>
                  <th className="py-2 pr-4 font-medium text-right">예측</th>
                  <th className="py-2 pr-4 font-medium text-right">적중</th>
                  <th className="py-2 font-medium text-right">적중률</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((t) => (
                  <tr
                    key={t.teamCode}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-2 pr-4 font-medium">{shortTeamName(t.teamCode)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{t.verifiedN}</td>
                    <td className="py-2 pr-4 text-right font-mono">{t.correctN}</td>
                    <td
                      className={`py-2 text-right font-mono font-semibold ${t.accuracyRate !== null && t.accuracyRate >= 0.5 ? 'text-brand-500' : ''}`}
                    >
                      {t.verifiedN < 3
                        ? '(샘플 부족)'
                        : t.accuracyRate !== null
                          ? `${(t.accuracyRate * 100).toFixed(1)}%`
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 면책 고지 */}
      <footer className="text-xs text-gray-400 dark:text-gray-500 space-y-1 border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <p>• 이 페이지의 모든 데이터는 실제 KBO 경기 결과를 기준으로 자동 집계됩니다.</p>
        <p>
          • 현재 운영 중인 AI 모델 (v2-persona4) 기준. 모델 업그레이드 시 집계 기준이
          변경될 수 있습니다.
        </p>
        <p>• 예측은 정보 제공 목적이며, 베팅에 사용하지 마세요.</p>
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`text-2xl font-bold font-mono mt-1 ${accent ? 'text-brand-500' : ''}`}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
      )}
    </div>
  );
}
