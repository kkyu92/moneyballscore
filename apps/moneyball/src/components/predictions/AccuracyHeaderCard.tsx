import { MIN_VERIFIED_GAMES_HEDGE, WINNER_TIER_LABEL, pickTierEmoji } from '@moneyball/shared';

import { accuracyRateColorClass } from '@/lib/accuracy/buildAccuracyData';

interface TierStat {
  verified: number;
  correct: number;
}

interface Props {
  totalPredicted: number;
  totalVerified: number;
  totalCorrect: number;
  recentVerified?: number;
  recentCorrect?: number;
  /** 티어별 누적 적중 통계 — wave-493 (op-analysis 1855: 고신뢰 6.5pp edge 가시화) */
  tierAccuracy?: {
    confident: TierStat;
    lean: TierStat;
    tossup: TierStat;
  };
}

const TIER_BREAKDOWN_MIN = 10;

export function AccuracyHeaderCard({
  totalPredicted,
  totalVerified,
  totalCorrect,
  recentVerified,
  recentCorrect,
  tierAccuracy,
}: Props) {
  if (totalVerified === 0) return null;

  const accuracy = totalCorrect / totalVerified;
  const accuracyPct = Math.round(accuracy * 100);
  const colorClass = accuracyRateColorClass(accuracy);

  const showTrend =
    recentVerified !== undefined &&
    recentCorrect !== undefined &&
    recentVerified >= MIN_VERIFIED_GAMES_HEDGE &&
    totalVerified >= 30;
  const recentAccuracy = showTrend ? recentCorrect! / recentVerified! : 0;
  const deltaPp = showTrend
    ? Math.round((recentAccuracy - accuracy) * 100)
    : 0;
  const trendColorClass =
    deltaPp >= 3
      ? 'text-brand-600 dark:text-brand-400'
      : deltaPp <= -3
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-700 dark:text-gray-300';
  const trendSign = deltaPp > 0 ? '+' : '';

  // 티어 breakdown: 각 티어 verified ≥ TIER_BREAKDOWN_MIN 인 것만 표시
  const tiers = tierAccuracy
    ? (
        [
          { key: 'confident', ...tierAccuracy.confident },
          { key: 'lean', ...tierAccuracy.lean },
          { key: 'tossup', ...tierAccuracy.tossup },
        ] as const
      ).filter((t) => t.verified >= TIER_BREAKDOWN_MIN)
    : [];

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            누적 적중률
          </div>
          <div className={`text-3xl font-bold ${colorClass}`}>
            {accuracyPct}
            <span className="text-xl">%</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            검증 완료
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {totalCorrect}
            <span className="text-base text-gray-500 dark:text-gray-400">
              /{totalVerified}
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            누적 예측
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {totalPredicted}
          </div>
        </div>
        {showTrend && (
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              최근 {recentVerified}건
            </div>
            <div
              className={`text-2xl font-bold ${trendColorClass}`}
              title={`최근 ${recentVerified}건 적중률 ${Math.round(recentAccuracy * 100)}%`}
            >
              {trendSign}
              {deltaPp}
              <span className="text-base text-gray-500 dark:text-gray-400">
                %p
              </span>
            </div>
          </div>
        )}
      </div>

      {tiers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[var(--color-border)] flex flex-wrap gap-x-4 gap-y-1">
          {tiers.map((t) => {
            const pct = Math.round((t.correct / t.verified) * 100);
            const color = accuracyRateColorClass(t.correct / t.verified);
            return (
              <span key={t.key} className="text-xs text-gray-500 dark:text-gray-400">
                {pickTierEmoji(t.key)}{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {WINNER_TIER_LABEL[t.key]}
                </span>{' '}
                <span className={`font-bold ${color}`}>{pct}%</span>
                <span className="text-gray-400 dark:text-gray-500"> ({t.verified}건)</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
