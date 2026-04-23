import {
  getAccuracyColor,
  pickTierEmoji,
  WINNER_TIER_LABEL,
  type WinnerConfidenceTier,
} from "@moneyball/shared";

interface TierStat {
  correct: number;
  total: number;
}

export type TierRates = Record<WinnerConfidenceTier, TierStat>;

interface AccuracySummaryProps {
  total: number;
  correct: number;
  rate: number;
  tierRates?: TierRates;
}

const TIER_ORDER: WinnerConfidenceTier[] = ['confident', 'lean', 'tossup'];

export function AccuracySummary({
  total,
  correct,
  rate,
  tierRates,
}: AccuracySummaryProps) {
  const ratePct = Math.round(rate * 100);

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">시즌 적중률</h3>
      <div className="flex items-end gap-2 mb-4">
        <span
          className={`text-4xl font-bold ${getAccuracyColor(ratePct)}`}
        >
          {ratePct}%
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          ({correct}/{total})
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-4">
        <div
          className="bg-brand-500 h-2 rounded-full transition-all"
          style={{ width: `${ratePct}%` }}
        />
      </div>
      {tierRates && (
        <ul className="space-y-1.5 text-xs" aria-label="예측 확신 단계별 적중률">
          {TIER_ORDER.map((tier) => {
            const stat = tierRates[tier];
            const pct =
              stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : null;
            return (
              <li
                key={tier}
                className="flex items-center justify-between text-gray-600 dark:text-gray-300"
              >
                <span className="flex items-center gap-1.5">
                  <span>{pickTierEmoji(tier)}</span>
                  <span>{WINNER_TIER_LABEL[tier]}</span>
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {pct == null ? (
                    <span className="text-gray-400 dark:text-gray-500">표본 없음</span>
                  ) : (
                    <>
                      {pct}%{' '}
                      <span className="text-gray-400 dark:text-gray-500 font-normal">
                        ({stat.correct}/{stat.total})
                      </span>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
