import { mlbShortTeamName, CALIBRATION_AXIS_MIN, CALIBRATION_AXIS_MAX, BRIER_CALIBRATION_OK_GAP, ACCURACY_BASELINE, ROLLING_ACCURACY_WINDOW_DAYS, ROLLING_ACCURACY_TOTAL_DAYS, MIN_TEAM_PREDICTIONS, SMALL_SAMPLE_N } from '@moneyball/shared';
import { neutral } from '@/lib/design-tokens';
import { countBrierTrendWeeks, type Bucket, type ConfidenceTier, type WinnerProbBucket, type RollingAccuracyPoint, type BrierTrendPoint, type ScoringRuleDayCell, type ScoringRuleWeekCell } from '@/lib/accuracy/buildAccuracyData';
import type { MlbTeamAccuracyRow } from '@/lib/mlb/buildMlbTeamAccuracy';
import { WinnerProbBucketChart } from '@/components/dashboard/WinnerProbBucketChart';
import { RollingAccuracyChart } from '@/components/dashboard/RollingAccuracyChart';
import { BrierTrendChart } from '@/components/dashboard/BrierTrendChart';
import { ScoringRuleDayHeatmap } from '@/components/dashboard/ScoringRuleDayHeatmap';
import { CohortComparisonHeatmap } from '@/components/dashboard/CohortComparisonHeatmap';

// KBO /accuracy 페이지의 CalibrationChart/StatCard 를 그대로 옮겨오지 않고 MLB 전용으로
// 독립 작성 (wave-626, MVP scope — rolling accuracy/brier trend/요일별 등 나머지 섹션은
// 후속 wave 후보로 남김). CALIBRATION_AXIS_MIN/MAX 등 상수만 KBO 와 공유.
const PLOT_SIZE = 320;
const PAD_LEFT = 48;
const PAD_BOTTOM = 38;
const PAD_TOP = 20;
const PAD_RIGHT = 20;
const VW = PLOT_SIZE + PAD_LEFT + PAD_RIGHT;
const VH = PLOT_SIZE + PAD_TOP + PAD_BOTTOM;

function px(v: number): number {
  return PAD_LEFT + ((v - CALIBRATION_AXIS_MIN) / (CALIBRATION_AXIS_MAX - CALIBRATION_AXIS_MIN)) * PLOT_SIZE;
}
function py(v: number): number {
  return PAD_TOP + PLOT_SIZE - ((v - CALIBRATION_AXIS_MIN) / (CALIBRATION_AXIS_MAX - CALIBRATION_AXIS_MIN)) * PLOT_SIZE;
}

interface Strings {
  calibrationTitle: string;
  calibrationDesc: string;
  xAxisLabel: string;
  yAxisLabel: string;
  verifiedLabel: string;
  accuracyLabel: string;
  brierLabel: string;
  gapLabel: string;
  gapWellCalibrated: string;
  gapOverconfident: string;
  gapUnderconfident: string;
  confidenceTitle: string;
  winnerProbTitle: string;
  winnerProbDesc: string;
  rollingTitle: string;
  rollingSubLabel: string;
  rollingDesc: string;
  brierTrendTitle: string;
  brierTrendDesc: string;
  scoringRuleDayTitle: string;
  scoringRuleDayDesc: string;
  cohortWeekTitle: string;
  cohortWeekSubLabel: string;
  cohortWeekDesc: string;
  teamTitle: string;
  teamDesc: string;
  teamHeader: string;
  predictedHeader: string;
  correctHeader: string;
  accuracyHeader: string;
  smallSample: string;
  gamesUnit: (n: number) => string;
}

const STRINGS: Record<'ko' | 'en', Strings> = {
  ko: {
    calibrationTitle: '신뢰도 vs 실제 적중률',
    calibrationDesc: 'AI가 60% 확신으로 예측하면 실제로 60%를 맞히는가? 대각선에 가까울수록 잘 보정된 AI입니다.',
    xAxisLabel: 'AI 신뢰도 (confidence)',
    yAxisLabel: '실제 적중률',
    verifiedLabel: '검증 완료',
    accuracyLabel: '전체 적중률',
    brierLabel: 'Brier Score',
    gapLabel: '보정 오차',
    gapWellCalibrated: '잘 보정됨',
    gapOverconfident: '과신 경향',
    gapUnderconfident: '저신 경향',
    confidenceTitle: 'AI 확신도별 분석',
    winnerProbTitle: '확률 bucket 보정',
    winnerProbDesc: 'AI가 예측한 승리 확률 구간별로 실제 적중률이 얼마나 일치하는지 보여줍니다.',
    rollingTitle: `${ROLLING_ACCURACY_WINDOW_DAYS}일 rolling 적중률 추세`,
    rollingSubLabel: `최근 ${ROLLING_ACCURACY_TOTAL_DAYS}일, window=${ROLLING_ACCURACY_WINDOW_DAYS}일`,
    rollingDesc: `각 날짜의 직전 ${ROLLING_ACCURACY_WINDOW_DAYS}일 평균 적중률입니다. 한두 경기 운에 흔들리지 않고 모델의 실제 추세를 보여줍니다. 50% 기준선보다 위에 있으면 모델이 동전 던지기보다 낫다는 뜻입니다.`,
    brierTrendTitle: 'Brier Score 추이',
    brierTrendDesc: '주차별 Brier score 변화입니다. 값이 낮을수록 AI 예측이 정확합니다.',
    scoringRuleDayTitle: '요일별 적중률',
    scoringRuleDayDesc: '요일별 적중률 매트릭스입니다. N<3 인 요일은 소표본으로 회색 처리됩니다.',
    cohortWeekTitle: 'cohort × 주차 비교',
    cohortWeekSubLabel: '최근 4주',
    cohortWeekDesc: 'scoring_rule (모델 가중치 버전) × 주차 적중률 매트릭스입니다. 요일별 매트릭스의 시간 축 자매 view입니다.',
    teamTitle: '팀별 예측 성과',
    teamDesc: '경기 관련 팀 기준. 홈/원정 구분 없이 집계.',
    teamHeader: '팀',
    predictedHeader: '예측',
    correctHeader: '적중',
    accuracyHeader: '적중률',
    smallSample: '(샘플 부족)',
    gamesUnit: (n) => `${n}경기`,
  },
  en: {
    calibrationTitle: 'Confidence vs Actual Accuracy',
    calibrationDesc: "When the AI says 60% confidence, does it actually win 60% of the time? Closer to the diagonal = better calibrated.",
    xAxisLabel: 'AI confidence',
    yAxisLabel: 'Actual accuracy',
    verifiedLabel: 'Verified',
    accuracyLabel: 'Overall accuracy',
    brierLabel: 'Brier Score',
    gapLabel: 'Calibration gap',
    gapWellCalibrated: 'Well calibrated',
    gapOverconfident: 'Overconfident',
    gapUnderconfident: 'Underconfident',
    confidenceTitle: 'Accuracy by AI Confidence',
    winnerProbTitle: 'Win Probability Calibration',
    winnerProbDesc: "Shows how closely the AI's predicted win probability buckets match actual outcomes.",
    rollingTitle: `${ROLLING_ACCURACY_WINDOW_DAYS}-Day Rolling Accuracy Trend`,
    rollingSubLabel: `Last ${ROLLING_ACCURACY_TOTAL_DAYS} days, window=${ROLLING_ACCURACY_WINDOW_DAYS} days`,
    rollingDesc: `Average accuracy over the trailing ${ROLLING_ACCURACY_WINDOW_DAYS} days for each date. Smooths out single-game luck to show the model's real trend. Above the 50% baseline means the model beats a coin flip.`,
    brierTrendTitle: 'Brier Score Trend',
    brierTrendDesc: 'Weekly Brier score over time. Lower is more accurate.',
    scoringRuleDayTitle: 'Accuracy by Day of Week',
    scoringRuleDayDesc: 'Accuracy matrix by day of week. Days with N<3 are grayed out as small samples.',
    cohortWeekTitle: 'Cohort × Week Comparison',
    cohortWeekSubLabel: 'Last 4 weeks',
    cohortWeekDesc: 'Accuracy matrix by scoring_rule (model weight version) × week. Time-axis sister view of the day-of-week matrix.',
    teamTitle: 'Team Prediction Performance',
    teamDesc: 'Counted for any team involved in the game, home or away.',
    teamHeader: 'Team',
    predictedHeader: 'Games',
    correctHeader: 'Correct',
    accuracyHeader: 'Accuracy',
    smallSample: '(small sample)',
    gamesUnit: (n) => `${n} games`,
  },
};


function MlbCalibrationChart({ buckets, locale }: { buckets: Bucket[]; locale: 'ko' | 'en' }) {
  const s = STRINGS[locale];
  const ticks = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full max-w-[480px] h-auto"
      role="img"
      aria-label={s.calibrationTitle}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={px(t)} y1={PAD_TOP} x2={px(t)} y2={PAD_TOP + PLOT_SIZE} stroke="currentColor" strokeOpacity="0.08" />
          <text x={px(t)} y={PAD_TOP + PLOT_SIZE + 16} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.55">
            {(t * 100).toFixed(0)}%
          </text>
          <line x1={PAD_LEFT} y1={py(t)} x2={PAD_LEFT + PLOT_SIZE} y2={py(t)} stroke="currentColor" strokeOpacity="0.08" />
          <text x={PAD_LEFT - 6} y={py(t) + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.55">
            {(t * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      <line
        x1={px(CALIBRATION_AXIS_MIN)}
        y1={py(CALIBRATION_AXIS_MIN)}
        x2={px(CALIBRATION_AXIS_MAX)}
        y2={py(CALIBRATION_AXIS_MAX)}
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeDasharray="4 4"
      />
      {buckets.map((b) => {
        const cx = px(b.avgConf);
        const cy = py(b.hitRate);
        const r = Math.max(4, Math.min(14, Math.sqrt(b.n) * 3));
        const small = b.n < SMALL_SAMPLE_N;
        const colVar = small ? neutral[400] : 'var(--color-brand-500)';
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
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize="9" fontWeight="bold" fill="white">
              {b.n}
            </text>
          </g>
        );
      })}
      <text x={PAD_LEFT + PLOT_SIZE / 2} y={VH - 4} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">
        {s.xAxisLabel}
      </text>
      <text
        x={11}
        y={PAD_TOP + PLOT_SIZE / 2}
        textAnchor="middle"
        fontSize="10"
        fill="currentColor"
        opacity="0.6"
        transform={`rotate(-90, 11, ${PAD_TOP + PLOT_SIZE / 2})`}
      >
        {s.yAxisLabel}
      </text>
    </svg>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${accent ? 'text-brand-500' : ''}`}>{value}</p>
      {sub && <p className="text-2xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function MlbAccuracyDashboard({
  locale,
  verifiedN,
  correctN,
  accuracyRate,
  brier,
  gap,
  buckets,
  confidenceTiers,
  winnerProbBuckets,
  rollingAccuracy,
  brierTrend,
  scoringRuleDayHeatmap,
  cohortWeekHeatmap,
  teamRows,
}: {
  locale: 'ko' | 'en';
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null;
  brier: number | null;
  gap: number | null;
  buckets: Bucket[];
  confidenceTiers: ConfidenceTier[];
  winnerProbBuckets: WinnerProbBucket[];
  rollingAccuracy: RollingAccuracyPoint[];
  brierTrend: BrierTrendPoint[];
  scoringRuleDayHeatmap: ScoringRuleDayCell[];
  cohortWeekHeatmap: ScoringRuleWeekCell[];
  teamRows: MlbTeamAccuracyRow[];
}) {
  const s = STRINGS[locale];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={s.verifiedLabel} value={verifiedN.toString()} sub={s.gamesUnit(verifiedN)} />
        <StatCard
          label={s.accuracyLabel}
          value={accuracyRate !== null ? `${(accuracyRate * 100).toFixed(1)}%` : '—'}
          sub={`${correctN}/${verifiedN}${verifiedN > 0 && verifiedN < SMALL_SAMPLE_N ? ` ${s.smallSample}` : ''}`}
          accent={accuracyRate !== null && accuracyRate >= ACCURACY_BASELINE && verifiedN >= SMALL_SAMPLE_N}
        />
        <StatCard label={s.brierLabel} value={brier !== null ? brier.toFixed(3) : '—'} />
        <StatCard
          label={s.gapLabel}
          value={gap !== null ? `${gap >= 0 ? '+' : ''}${(gap * 100).toFixed(1)}%p` : '—'}
          sub={
            gap === null
              ? undefined
              : Math.abs(gap) < BRIER_CALIBRATION_OK_GAP
                ? s.gapWellCalibrated
                : gap > 0
                  ? s.gapOverconfident
                  : s.gapUnderconfident
          }
        />
      </section>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
        <div>
          <h2 className="text-lg font-bold">{s.calibrationTitle}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.calibrationDesc}</p>
        </div>
        {verifiedN === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm py-8 text-center">—</p>
        ) : (
          <MlbCalibrationChart buckets={buckets} locale={locale} />
        )}
      </section>

      {rollingAccuracy.some((p) => p.windowAccuracy !== null) && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-bold">{s.rollingTitle}</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{s.rollingSubLabel}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{s.rollingDesc}</p>
          <RollingAccuracyChart data={rollingAccuracy} locale={locale} />
        </section>
      )}

      {verifiedN >= SMALL_SAMPLE_N && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">{s.winnerProbTitle}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.winnerProbDesc}</p>
          </div>
          <WinnerProbBucketChart data={winnerProbBuckets} locale={locale} />
        </section>
      )}

      {countBrierTrendWeeks(brierTrend) >= 3 && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">{s.brierTrendTitle}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.brierTrendDesc}</p>
          </div>
          <BrierTrendChart data={brierTrend} />
        </section>
      )}

      {scoringRuleDayHeatmap.some((c) => c.n > 0) && verifiedN >= 10 && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">{s.scoringRuleDayTitle}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.scoringRuleDayDesc}</p>
          </div>
          <ScoringRuleDayHeatmap data={scoringRuleDayHeatmap} />
        </section>
      )}

      {cohortWeekHeatmap.some((c) => c.n >= MIN_TEAM_PREDICTIONS) && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-bold">{s.cohortWeekTitle}</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{s.cohortWeekSubLabel}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{s.cohortWeekDesc}</p>
          <CohortComparisonHeatmap data={cohortWeekHeatmap} />
        </section>
      )}

      {verifiedN >= SMALL_SAMPLE_N && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-4">
          <h2 className="text-lg font-bold">{s.confidenceTitle}</h2>
          <div className="grid grid-cols-3 gap-3">
            {confidenceTiers.map((tier) => {
              const pct = tier.accuracy !== null ? Math.round(tier.accuracy * 100) : null;
              return (
                <div key={tier.label} className="rounded-lg border border-gray-200 dark:border-[var(--color-border)] p-3 space-y-1 text-center">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{tier.label}</p>
                  <p className="text-2xs text-gray-400 dark:text-gray-500">{tier.range}</p>
                  <p className={`text-2xl font-bold ${pct === null ? 'text-gray-300 dark:text-gray-600' : 'text-brand-600 dark:text-brand-400'}`}>
                    {pct !== null ? `${pct}%` : '—'}
                  </p>
                  <p className="text-2xs text-gray-400 dark:text-gray-500">{tier.n > 0 ? `${tier.hits}/${tier.n}` : ''}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {teamRows.length > 0 && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">{s.teamTitle}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.teamDesc}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)]">
                  <th className="py-2 pr-4 font-medium">{s.teamHeader}</th>
                  <th className="py-2 pr-4 font-medium text-right">{s.predictedHeader}</th>
                  <th className="py-2 pr-4 font-medium text-right">{s.correctHeader}</th>
                  <th className="py-2 font-medium text-right">{s.accuracyHeader}</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((t) => (
                  <tr key={t.teamCode} className="border-b border-gray-200 dark:border-[var(--color-border)]">
                    <td className="py-2 pr-4 font-medium">{mlbShortTeamName(t.teamCode)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{t.verifiedN}</td>
                    <td className="py-2 pr-4 text-right font-mono">{t.correctN}</td>
                    <td
                      className={`py-2 text-right font-mono font-semibold ${
                        t.accuracyRate !== null && t.accuracyRate >= ACCURACY_BASELINE ? 'text-brand-500' : t.verifiedN >= MIN_TEAM_PREDICTIONS ? 'text-red-400' : ''
                      }`}
                    >
                      {t.verifiedN < MIN_TEAM_PREDICTIONS ? s.smallSample : t.accuracyRate !== null ? `${(t.accuracyRate * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
