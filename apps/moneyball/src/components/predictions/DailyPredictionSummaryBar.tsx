import {
  shortTeamName,
  SUMMARY_BAR_MIN_GAMES,
  ACCURACY_GOOD_PCT,
  ACCURACY_BASELINE_PCT,
  type TeamCode,
} from '@moneyball/shared';
import { TeamLogo } from '@/components/shared/TeamLogo';

interface TopPick {
  teamCode: TeamCode;
  winProbPct: number; // 55..100
  isConfident: boolean;
  isVerified: boolean;
  isCorrect: boolean | null;
}

interface DailyPredictionSummaryBarProps {
  predictedCount: number;
  verifiedCount: number;
  correctCount: number;
  topPick: TopPick | null;
}

export function DailyPredictionSummaryBar({
  predictedCount,
  verifiedCount,
  correctCount,
  topPick,
}: DailyPredictionSummaryBarProps) {
  if (predictedCount < SUMMARY_BAR_MIN_GAMES) return null;

  const accuracyPct =
    verifiedCount > 0 ? Math.round((correctCount / verifiedCount) * 100) : null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-xs"
      aria-label="오늘의 예측 요약"
    >
      {/* 경기 수 */}
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500" aria-hidden />
        {predictedCount}경기 예측
      </span>

      {/* 최고 자신감 픽 */}
      {topPick && (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
            topPick.isConfident
              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/50'
              : 'bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300'
          }`}
          title={`최고 자신감 픽: ${shortTeamName(topPick.teamCode)} ${topPick.winProbPct}%`}
        >
          <TeamLogo team={topPick.teamCode} size={14} />
          <span>최고 자신감</span>
          <span className="font-bold">{shortTeamName(topPick.teamCode)}</span>
          <span
            className={
              topPick.isConfident
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-gray-500 dark:text-gray-400'
            }
          >
            {topPick.winProbPct}%
          </span>
          {topPick.isVerified && topPick.isCorrect != null && (
            <span
              className={
                topPick.isCorrect
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-500 dark:text-red-400'
              }
              aria-label={topPick.isCorrect ? '적중' : '빗나감'}
            >
              {topPick.isCorrect ? '✓' : '✗'}
            </span>
          )}
        </span>
      )}

      {/* 적중률 */}
      {accuracyPct !== null && (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${
            accuracyPct >= ACCURACY_GOOD_PCT
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : accuracyPct >= ACCURACY_BASELINE_PCT
                ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}
        >
          {correctCount}/{verifiedCount} 적중 ({accuracyPct}%)
        </span>
      )}
    </div>
  );
}
