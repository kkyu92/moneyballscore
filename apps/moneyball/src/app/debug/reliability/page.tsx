import { createClient } from '@supabase/supabase-js';

// /debug/reliability — 예측 신뢰도 reliability diagram
// middleware.ts BASIC auth 로 보호됨 (/debug/* matcher)
//
// Reliability diagram (calibration plot):
//   - x축: 예측 confidence (0.5 ~ 1.0)
//   - y축: 실제 적중률 (0 ~ 1.0)
//   - 완벽 보정 = y=x 대각선
//   - 점: confidence bucket 별 (평균 conf, 적중률) · 반지름 ∝ √N
//   - 95% 신뢰구간 (Wald): p ± 1.96 * √(p(1-p)/n)
//
// 보정 품질 판단:
//   - 점이 대각선 위: underconfident (보수적 — 실제가 말하는 확률보다 낮게 예측)
//   - 점이 대각선 아래: overconfident (과신 — 예측이 실제보다 큰 확률 주장)
//   - 지금 해야 할 것은 "어느 쪽" 인지 + "어떤 구간에서" 패턴 감지.

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials required');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

// 5% 폭 bucket. 현재 모델 confidence 대부분 0.5~0.7 구간이므로 0.5~1.0 을 10칸
// 으로. N=0 bucket 은 렌더 시 제외.
const BUCKET_WIDTH = 0.05;
const BUCKET_START = 0.5;
const BUCKET_COUNT = 10;

function bucketize(rows: PredRow[]): Bucket[] {
  const acc: Array<{ sumConf: number; n: number; hits: number }> = Array.from(
    { length: BUCKET_COUNT },
    () => ({ sumConf: 0, n: 0, hits: 0 }),
  );
  for (const r of rows) {
    const idx = Math.min(
      BUCKET_COUNT - 1,
      Math.max(0, Math.floor((r.confidence - BUCKET_START) / BUCKET_WIDTH)),
    );
    acc[idx].sumConf += r.confidence;
    acc[idx].n += 1;
    if (r.is_correct) acc[idx].hits += 1;
  }
  const out: Bucket[] = [];
  for (let i = 0; i < BUCKET_COUNT; i++) {
    const b = acc[i];
    if (b.n === 0) continue;
    const lower = BUCKET_START + i * BUCKET_WIDTH;
    const upper = lower + BUCKET_WIDTH;
    const hitRate = b.hits / b.n;
    // Wald 95% CI — small-sample 에서는 Wilson score 가 더 정확하지만 Wald 로 시작.
    const ci95Half = 1.96 * Math.sqrt((hitRate * (1 - hitRate)) / b.n);
    out.push({
      lower,
      upper,
      n: b.n,
      hits: b.hits,
      avgConf: b.sumConf / b.n,
      hitRate,
      ci95Half,
    });
  }
  return out;
}

/** Brier score — 낮을수록 좋음 (0 = perfect, 0.25 = 동전). */
function brierScore(rows: PredRow[]): number {
  if (rows.length === 0) return 0;
  let sum = 0;
  for (const r of rows) {
    const outcome = r.is_correct ? 1 : 0;
    sum += (r.confidence - outcome) ** 2;
  }
  return sum / rows.length;
}

/** Calibration gap = |avg conf − overall accuracy|. 0 에 가까우면 잘 보정됨. */
function calibrationGap(rows: PredRow[]): number {
  if (rows.length === 0) return 0;
  const avgConf = rows.reduce((s, r) => s + r.confidence, 0) / rows.length;
  const acc = rows.filter((r) => r.is_correct).length / rows.length;
  return avgConf - acc; // +: 과신 / −: 저신
}

// SVG 좌표계 — 500x500 plot area + 좌/하 labels 여유.
const PLOT_SIZE = 500;
const PAD_LEFT = 60;
const PAD_BOTTOM = 50;
const PAD_TOP = 30;
const PAD_RIGHT = 30;
const VW = PLOT_SIZE + PAD_LEFT + PAD_RIGHT;
const VH = PLOT_SIZE + PAD_TOP + PAD_BOTTOM;

// 축 범위 0.4 ~ 1.0 (시각 여유 — 현재 데이터 0.52 ~ 0.63 이지만 여유 공간 필요).
const AXIS_MIN = 0.4;
const AXIS_MAX = 1.0;

function x(v: number): number {
  return PAD_LEFT + ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * PLOT_SIZE;
}
function y(v: number): number {
  return PAD_TOP + PLOT_SIZE - ((v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * PLOT_SIZE;
}

function ReliabilityChart({ buckets }: { buckets: Bucket[] }) {
  const ticks = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full max-w-[700px] h-auto bg-white dark:bg-[var(--color-surface)] rounded-xl border border-gray-200 dark:border-[var(--color-border)]"
      role="img"
      aria-label="예측 신뢰도 reliability diagram"
    >
      {/* grid */}
      {ticks.map((t) => (
        <g key={`gx-${t}`}>
          <line
            x1={x(t)}
            y1={PAD_TOP}
            x2={x(t)}
            y2={PAD_TOP + PLOT_SIZE}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
          <text
            x={x(t)}
            y={PAD_TOP + PLOT_SIZE + 20}
            textAnchor="middle"
            fontSize="11"
            fill="currentColor"
            opacity="0.6"
          >
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={`gy-${t}`}>
          <line
            x1={PAD_LEFT}
            y1={y(t)}
            x2={PAD_LEFT + PLOT_SIZE}
            y2={y(t)}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
          <text
            x={PAD_LEFT - 8}
            y={y(t) + 4}
            textAnchor="end"
            fontSize="11"
            fill="currentColor"
            opacity="0.6"
          >
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {/* diagonal — perfect calibration */}
      <line
        x1={x(AXIS_MIN)}
        y1={y(AXIS_MIN)}
        x2={x(AXIS_MAX)}
        y2={y(AXIS_MAX)}
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeDasharray="4 4"
      />
      <text
        x={x(0.95)}
        y={y(0.92)}
        fontSize="10"
        fill="currentColor"
        opacity="0.45"
      >
        완벽 보정 (y=x)
      </text>

      {/* 50% baseline */}
      <line
        x1={x(AXIS_MIN)}
        y1={y(0.5)}
        x2={x(AXIS_MAX)}
        y2={y(0.5)}
        stroke="currentColor"
        strokeOpacity="0.1"
      />

      {/* buckets */}
      {buckets.map((b) => {
        const cx = x(b.avgConf);
        const cy = y(b.hitRate);
        // 반지름 ∝ √N (최소 6, 최대 18)
        const r = Math.max(6, Math.min(18, Math.sqrt(b.n) * 4));
        const smallSample = b.n < 5;
        const color = smallSample ? '#9ca3af' : '#2d6b3f';
        return (
          <g key={`${b.lower}`}>
            {/* 95% CI bar */}
            <line
              x1={cx}
              y1={y(Math.min(1, b.hitRate + b.ci95Half))}
              x2={cx}
              y2={y(Math.max(0, b.hitRate - b.ci95Half))}
              stroke={color}
              strokeWidth="2"
              opacity="0.4"
            />
            {/* point */}
            <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity="0.75" />
            {/* N label */}
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="white"
            >
              {b.n}
            </text>
          </g>
        );
      })}

      {/* axis labels */}
      <text
        x={PAD_LEFT + PLOT_SIZE / 2}
        y={VH - 8}
        textAnchor="middle"
        fontSize="12"
        fill="currentColor"
        opacity="0.7"
      >
        예측 신뢰도 (confidence)
      </text>
      <text
        x={15}
        y={PAD_TOP + PLOT_SIZE / 2}
        textAnchor="middle"
        fontSize="12"
        fill="currentColor"
        opacity="0.7"
        transform={`rotate(-90, 15, ${PAD_TOP + PLOT_SIZE / 2})`}
      >
        실제 적중률
      </text>
    </svg>
  );
}

export default async function ReliabilityPage() {
  const db = getAdminClient();
  const { data, error } = await db
    .from('predictions')
    .select('confidence, is_correct, verified_at')
    .not('verified_at', 'is', null)
    .not('is_correct', 'is', null)
    .order('verified_at', { ascending: true });

  if (error) {
    return (
      <div className="p-6 text-red-600">
        DB error: {error.message}
      </div>
    );
  }

  const rows = (data as PredRow[]) ?? [];
  const buckets = bucketize(rows);
  const n = rows.length;
  const correct = rows.filter((r) => r.is_correct).length;
  const overallAcc = n > 0 ? correct / n : 0;
  const avgConf = n > 0 ? rows.reduce((s, r) => s + r.confidence, 0) / n : 0;
  const gap = calibrationGap(rows);
  const brier = brierScore(rows);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Reliability Diagram</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          예측 신뢰도 vs 실제 적중률. 점이 대각선 위면 저신 (보수적), 아래면
          과신 (근거보다 큰 확률 주장). 점 반지름 ∝ √N.
        </p>
      </header>

      {n === 0 ? (
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            아직 검증된 예측이 없습니다. 경기 결과 verify 후 표시됩니다.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="검증 경기" value={n.toString()} suffix="경기" />
            <Stat
              label="전체 적중률"
              value={(overallAcc * 100).toFixed(1) + '%'}
              suffix={`${correct}/${n}`}
            />
            <Stat
              label="평균 신뢰도"
              value={(avgConf * 100).toFixed(1) + '%'}
              suffix="모델 자신감 평균"
            />
            <Stat
              label="Calibration Gap"
              value={(gap * 100).toFixed(1) + '%p'}
              suffix={gap > 0 ? '과신' : gap < 0 ? '저신' : '정확'}
              tone={Math.abs(gap) < 0.03 ? 'good' : Math.abs(gap) < 0.08 ? 'warn' : 'bad'}
            />
          </section>

          <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
            <h2 className="text-lg font-bold">Reliability Plot</h2>
            <ReliabilityChart buckets={buckets} />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              세로 막대 = 95% Wald CI. 회색 점 = 표본 N &lt; 5 (해석 주의).
              Brier score: <span className="font-mono">{brier.toFixed(3)}</span>
              (0 = perfect, 0.25 = 동전 던지기).
            </p>
          </section>

          <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <h2 className="text-lg font-bold mb-3">Bucket 상세</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)]">
                  <th className="py-2 pr-3 font-medium">구간</th>
                  <th className="py-2 pr-3 font-medium text-right">N</th>
                  <th className="py-2 pr-3 font-medium text-right">적중</th>
                  <th className="py-2 pr-3 font-medium text-right">평균 conf</th>
                  <th className="py-2 pr-3 font-medium text-right">실제 적중률</th>
                  <th className="py-2 font-medium text-right">95% CI</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => {
                  const smallSample = b.n < 5;
                  return (
                    <tr
                      key={b.lower}
                      className={`border-b border-gray-100 dark:border-gray-800 ${
                        smallSample ? 'text-gray-400 dark:text-gray-500' : ''
                      }`}
                    >
                      <td className="py-2 pr-3 font-mono">
                        [{b.lower.toFixed(2)}, {b.upper.toFixed(2)})
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">{b.n}</td>
                      <td className="py-2 pr-3 text-right font-mono">{b.hits}</td>
                      <td className="py-2 pr-3 text-right font-mono">
                        {(b.avgConf * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 pr-3 text-right font-mono font-semibold">
                        {(b.hitRate * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 text-right font-mono text-xs">
                        ±{(b.ci95Half * 100).toFixed(1)}%p
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-green-600'
      : tone === 'warn'
        ? 'text-yellow-600'
        : tone === 'bad'
          ? 'text-red-600'
          : '';
  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${toneClass}`}>{value}</p>
      {suffix && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{suffix}</p>
      )}
    </div>
  );
}
