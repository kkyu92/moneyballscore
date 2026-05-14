import { createClient } from '@/lib/supabase/server';
import { CURRENT_MODEL_FILTER } from '@/config/model';
import { buildAllTeamAccuracy, buildMatchupData } from '@/lib/standings/buildTeamAccuracy';
import { TeamMatchupCards } from '@/components/accuracy/TeamMatchupCards';
import { ModelVersionHistory } from '@/components/accuracy/ModelVersionHistory';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { assertSelectOk, shortTeamName } from '@moneyball/shared';
import { neutral } from '@/lib/design-tokens';
import {
  type PredRow,
  type Bucket,
  type ConfidenceTier,
  bucketize,
  brierScore,
  calibrationGap,
  buildDayOfWeek,
  buildWeeklyTrend,
  buildRecentForm,
  buildConfidenceTiers,
  buildVersionHistory,
} from '@/lib/accuracy/buildAccuracyData';
import { computeCommunityVsAI } from '@/lib/picks/buildCommunityAccuracy';

export const revalidate = 3600;

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

  const [result, pollResult, completedGamesResult, predForPoll, teamRows, matchupData] = await Promise.all([
    supabase
      .from('predictions')
      .select('confidence, is_correct, verified_at, scoring_rule, reasoning->homeWinProb')
      .match(CURRENT_MODEL_FILTER)
      .eq('prediction_type', 'pre_game')
      .not('verified_at', 'is', null)
      .not('is_correct', 'is', null)
      .order('verified_at', { ascending: true }),
    supabase.from('pick_poll_events').select('game_id, pick'),
    supabase
      .from('games')
      .select('id, home_score, away_score')
      .eq('status', 'final')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null),
    supabase
      .from('predictions')
      .select('game_id, is_correct')
      .match(CURRENT_MODEL_FILTER)
      .eq('prediction_type', 'pre_game')
      .not('is_correct', 'is', null),
    buildAllTeamAccuracy(),
    buildMatchupData(),
  ]);

  const communityStats = computeCommunityVsAI(
    (pollResult.data ?? []) as Array<{ game_id: number; pick: string }>,
    (completedGamesResult.data ?? []) as Array<{ id: number; home_score: number | null; away_score: number | null }>,
    (predForPoll.data ?? []) as Array<{ game_id: number; is_correct: boolean | null }>,
  );

  const { data } = assertSelectOk(result, 'AccuracyPage');
  const rows = (data ?? []) as PredRow[];
  const n = rows.length;
  const correct = rows.filter((r) => r.is_correct).length;
  const overallAcc = n > 0 ? correct / n : 0;
  const brier = brierScore(rows);
  const gap = calibrationGap(rows);
  const buckets = bucketize(rows);
  const weekly = buildWeeklyTrend(rows);
  const dow = buildDayOfWeek(rows);
  const recentForm = buildRecentForm(rows);
  const confidenceTiers = buildConfidenceTiers(rows);
  const versionHistory = buildVersionHistory(rows);

  const lastUpdated = rows.length > 0 ? rows[rows.length - 1].verified_at : null;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumb items={[{ label: 'AI 적중 기록' }]} className="mb-2" />

      <header className="bg-gradient-to-r from-brand-800 to-brand-700 rounded-2xl p-6 md:p-8 text-white space-y-1">
        <h1 className="text-2xl font-bold">AI 적중 기록</h1>
        <p className="text-sm text-white/70">
          MoneyBall Score AI가 얼마나 정확한지 솔직하게 공개합니다. 시즌 내 모든 검증 완료 예측 기준.
        </p>
        {lastUpdated && (
          <p className="text-xs text-white/50">
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

      {/* 커뮤니티 vs AI 대결 */}
      {communityStats.communityGames >= 3 && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold">커뮤니티 vs AI 대결</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              3명 이상 참여한 경기 기준 — 커뮤니티 다수결 vs AI 예측 정확도 비교
            </p>
          </div>
          {(() => {
            const commWins =
              communityStats.communityAccuracy !== null &&
              communityStats.aiAccuracyWithPoll !== null &&
              communityStats.communityAccuracy > communityStats.aiAccuracyWithPoll;
            const aiWins =
              communityStats.communityAccuracy !== null &&
              communityStats.aiAccuracyWithPoll !== null &&
              communityStats.aiAccuracyWithPoll > communityStats.communityAccuracy;
            return (
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-lg p-4 text-center ${commWins ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700' : 'bg-gray-50 dark:bg-[var(--color-surface)]'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {commWins && '🏆 '}커뮤니티 정답률
                  </p>
                  <p
                    className={`text-2xl font-bold font-mono ${
                      communityStats.communityAccuracy !== null && communityStats.communityAccuracy >= 0.5
                        ? 'text-brand-500'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {communityStats.communityAccuracy !== null
                      ? `${(communityStats.communityAccuracy * 100).toFixed(1)}%`
                      : '—'}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {communityStats.communityCorrect}/{communityStats.communityGames} 적중
                  </p>
                </div>
                <div className={`rounded-lg p-4 text-center ${aiWins ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800' : 'bg-gray-50 dark:bg-[var(--color-surface)]'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {aiWins && '🏆 '}AI 정답률 (같은 경기)
                  </p>
                  <p
                    className={`text-2xl font-bold font-mono ${
                      communityStats.aiAccuracyWithPoll !== null && communityStats.aiAccuracyWithPoll >= 0.5
                        ? 'text-brand-500'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {communityStats.aiAccuracyWithPoll !== null
                      ? `${(communityStats.aiAccuracyWithPoll * 100).toFixed(1)}%`
                      : '—'}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {communityStats.aiGamesWithPoll > 0
                      ? `${communityStats.aiCorrectWithPoll}/${communityStats.aiGamesWithPoll} 적중`
                      : '예측 없음'}
                  </p>
                </div>
              </div>
            );
          })()}
          {communityStats.communityAccuracy !== null && communityStats.aiAccuracyWithPoll !== null && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              {communityStats.communityAccuracy > communityStats.aiAccuracyWithPoll
                ? `커뮤니티가 AI보다 ${((communityStats.communityAccuracy - communityStats.aiAccuracyWithPoll) * 100).toFixed(1)}%p 앞섭니다`
                : communityStats.communityAccuracy < communityStats.aiAccuracyWithPoll
                  ? `AI가 커뮤니티보다 ${((communityStats.aiAccuracyWithPoll - communityStats.communityAccuracy) * 100).toFixed(1)}%p 앞섭니다`
                  : '커뮤니티와 AI가 동률입니다'}
            </p>
          )}
        </section>
      )}

      {/* 최근 예측 폼 */}
      {recentForm.total >= 5 && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-bold">최근 예측 폼</h2>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span
                className={
                  recentForm.total > 0 && recentForm.hits / recentForm.total >= overallAcc
                    ? 'text-brand-600 dark:text-brand-400 font-semibold'
                    : 'text-red-600 dark:text-red-400 font-semibold'
                }
              >
                최근 {recentForm.total}경기 {recentForm.hits}적중 (
                {Math.round((recentForm.hits / recentForm.total) * 100)}%)
              </span>
              <span className="text-gray-400 dark:text-gray-500">vs 전체 {Math.round(overallAcc * 100)}%</span>
              {recentForm.trend !== 'flat' && (
                <span
                  className={
                    recentForm.trend === 'up'
                      ? 'text-brand-600 dark:text-brand-400 font-medium'
                      : 'text-red-600 dark:text-red-400 font-medium'
                  }
                >
                  {recentForm.trend === 'up' ? '▲ 상승 중' : '▼ 하락 중'}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="최근 예측 결과">
            {recentForm.dots.map((hit, i) => (
              <span
                key={i}
                role="listitem"
                aria-label={hit ? '적중' : '실패'}
                title={hit ? '적중' : '실패'}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold select-none ${
                  hit
                    ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}
              >
                {hit ? '●' : '×'}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            검증 완료된 최근 {recentForm.total}경기 순서. 왼쪽이 이전, 오른쪽이 최신.
          </p>
        </section>
      )}

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
                    className="border-b border-gray-200 dark:border-[var(--color-border)]"
                  >
                    <td className="py-2 pr-4">{w.weekLabel}</td>
                    <td className="py-2 pr-4 text-right font-mono">{w.n}</td>
                    <td className="py-2 pr-4 text-right font-mono">{w.hits}</td>
                    <td
                      className={`py-2 text-right font-mono font-semibold ${w.accuracy !== null && w.accuracy >= 0.5 ? 'text-brand-500' : w.accuracy !== null && w.accuracy < 0.5 ? 'text-red-400' : ''}`}
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

      {/* 요일별 적중률 */}
      {dow.some((d) => d.n > 0) && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">요일별 적중률</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              KST 기준. 요일에 따라 예측 난이도가 다를 수 있습니다. 막대 높이 ∝ 적중률.
              일요일은 과적합 방지를 위해 AI 신뢰도 상한 45%를 적용합니다.
            </p>
          </div>
          <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 mt-2 min-w-[360px]">
            {dow.map((d) => {
              const acc = d.accuracy;
              const barH = acc !== null ? Math.round(acc * 100) : 0;
              const colorClass =
                acc === null
                  ? 'bg-gray-200 dark:bg-gray-700'
                  : acc >= 0.55
                    ? 'bg-brand-500'
                    : acc >= 0.45
                      ? 'bg-neutral-400'
                      : 'bg-red-400';
              return (
                <div key={d.day} className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {d.dayLabel}
                  </span>
                  {d.day === 0 && (
                    <span className="text-[8px] leading-none bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded px-0.5 py-0.5 whitespace-nowrap">
                      상한 45%
                    </span>
                  )}
                  <span
                    className={`text-sm font-bold font-mono ${
                      acc !== null && acc >= 0.5
                        ? 'text-brand-500'
                        : acc !== null && acc < 0.4
                          ? 'text-red-400'
                          : ''
                    }`}
                  >
                    {acc !== null ? `${(acc * 100).toFixed(0)}%` : '—'}
                  </span>
                  <div className="relative w-full h-20 flex flex-col justify-end rounded-sm overflow-hidden bg-gray-100 dark:bg-[var(--color-border)]">
                    {/* 50% 기준선 */}
                    <div
                      className="absolute inset-x-0 border-t border-dashed border-gray-400/50 dark:border-gray-500/50 z-10"
                      style={{ bottom: '50%' }}
                    />
                    <div
                      className={`w-full rounded-sm ${colorClass}`}
                      style={{ height: `${barH}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {d.n > 0 ? `${d.hits}/${d.n}` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
          </div>
          <div className="flex gap-4 text-[10px] text-gray-400 dark:text-gray-500 pt-1">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-brand-500" />
              ≥55%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-neutral-400" />
              45~54%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-red-400" />
              {'<'}45%
            </span>
            <span className="ml-auto flex items-center gap-1">
              <span className="inline-block w-3 border-t border-dashed border-gray-400/70" />
              50% 기준선
            </span>
          </div>
        </section>
      )}

      {/* AI 확신도별 분석 */}
      {n >= 5 && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold">AI 확신도별 분석</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              AI가 스스로 매긴 확신도 구간별 실제 적중률. 확신이 높을수록 맞아야 잘 보정된 모델.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(confidenceTiers as ConfidenceTier[]).map((tier) => {
              const pct = tier.accuracy !== null ? Math.round(tier.accuracy * 100) : null;
              const ciPct = tier.n > 0 ? Math.round(tier.ci95Half * 100) : null;
              const isInverted =
                tier.accuracy !== null &&
                confidenceTiers[0].accuracy !== null &&
                tier.label === '보통 확신' &&
                tier.accuracy < confidenceTiers[0].accuracy;
              return (
                <div
                  key={tier.label}
                  className={`rounded-lg border p-3 space-y-1 text-center ${
                    isInverted
                      ? 'border-amber-400 dark:border-amber-500 bg-amber-50/40 dark:bg-amber-900/10'
                      : 'border-gray-200 dark:border-[var(--color-border)]'
                  }`}
                >
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{tier.label}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{tier.range}</p>
                  {pct !== null ? (
                    <>
                      <p
                        className={`text-2xl font-bold ${
                          isInverted
                            ? 'text-amber-500 dark:text-amber-400'
                            : pct >= 55
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}
                      >
                        {pct}%
                      </p>
                      {ciPct !== null && tier.n < 20 && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">±{ciPct}% CI</p>
                      )}
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-gray-300 dark:text-gray-600">—</p>
                  )}
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {tier.n > 0 ? `${tier.hits}/${tier.n}` : '데이터 없음'}
                  </p>
                  {isInverted && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      역전 패턴 ⚠
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {(() => {
            const low = confidenceTiers[0];
            const mid = confidenceTiers[1];
            const isInverted =
              low.n >= 5 && mid.n >= 3 && mid.accuracy !== null && low.accuracy !== null && mid.accuracy < low.accuracy;
            return isInverted ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                보통 확신 예측이 낮은 확신보다 적중률이 낮습니다. AI가 중간 구간에서 과보수하거나
                어려운 경기를 중간 확신으로 표현하는 패턴입니다.
              </p>
            ) : null;
          })()}
        </section>
      )}

      {/* AI 모델 버전별 성과 */}
      {versionHistory.some((v) => v.n > 0) && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">AI 모델 버전별 성과</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              가중치 버전별 예측 정확도. 실패에서 배우고 개선하는 AI 진화 기록.
            </p>
          </div>
          <ModelVersionHistory versions={versionHistory} />
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
                {teamRows.map((t) => {
                    const isOutlier =
                      t.accuracyRate !== null &&
                      t.verifiedN >= 3 &&
                      overallAcc - t.accuracyRate > 0.15;
                    return (
                      <tr
                        key={t.teamCode}
                        className={`border-b border-gray-200 dark:border-[var(--color-border)] ${
                          isOutlier ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                        }`}
                      >
                        <td className="py-2 pr-4 font-medium">
                          {shortTeamName(t.teamCode)}
                          {isOutlier && (
                            <span className="ml-1.5 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded px-1 py-0.5">
                              이상치
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">{t.verifiedN}</td>
                        <td className="py-2 pr-4 text-right font-mono">{t.correctN}</td>
                        <td
                          className={`py-2 text-right font-mono font-semibold ${
                            t.accuracyRate !== null && t.accuracyRate >= 0.5
                              ? 'text-brand-500'
                              : isOutlier
                                ? 'text-amber-600 dark:text-amber-400'
                                : t.accuracyRate !== null && t.accuracyRate < 0.5 && t.verifiedN >= 3
                                  ? 'text-red-400'
                                  : ''
                          }`}
                        >
                          {t.verifiedN < 3
                            ? '(샘플 부족)'
                            : t.accuracyRate !== null
                              ? `${(t.accuracyRate * 100).toFixed(1)}%`
                              : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 상대팀별 AI 강약 분석 */}
      {matchupData.matchups.length > 0 && (
        <section id="matchup" className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold">팀별 상대 강약 분석</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              각 팀 경기에서 AI가 어떤 상대팀을 만날 때 잘 맞추고 못 맞추는지 분석합니다.
              n=1 결과는 연하게 표시됩니다 (표본 1건). 홈/원정 적중률은 각 n을 함께 표시합니다.
            </p>
          </div>
          <TeamMatchupCards
            matchups={matchupData.matchups}
            homeAway={matchupData.homeAway}
            teamAccuracy={teamRows}
          />
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
        className={`text-3xl font-bold font-mono mt-1 ${accent ? 'text-brand-500' : ''}`}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
      )}
    </div>
  );
}
