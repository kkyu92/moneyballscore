import { MLB_FACTOR_PICK_STRONG, MLB_FACTOR_PICK_COMPLETE } from "@moneyball/shared";
import {
  getMlbRecentConvergencePickRecord,
  getMlbConvergencePickStreak,
  getMlbConvergencePickBestStreak,
  getMlbConvergencePickTeamStats,
  getMlbConvergencePickHomeAwaySplit,
  getMlbConvergencePickDayOfWeekSplit,
} from "@/lib/analysis/convergenceRecord";

// mlb/reviews (ko) + en/mlb/reviews 양쪽 재사용 — wave-659 (cycle 2339), analysis-data.ts
// (wave-658) 와 동일 DRY 패턴.
export async function getMlbReviewsData() {
  const [
    strongConvergenceRecord,
    completeConvergenceRecord,
    strongConvergenceStreak,
    strongBestStreak,
    completeConvergenceStreak,
    completeBestStreak,
    strongTeamStats,
    completeTeamStats,
    strongHomeAwaySplit,
    completeHomeAwaySplit,
    strongDayOfWeekSplit,
    completeDayOfWeekSplit,
  ] = await Promise.all([
    getMlbRecentConvergencePickRecord(MLB_FACTOR_PICK_STRONG),
    getMlbRecentConvergencePickRecord(MLB_FACTOR_PICK_COMPLETE),
    getMlbConvergencePickStreak(MLB_FACTOR_PICK_STRONG),
    getMlbConvergencePickBestStreak(MLB_FACTOR_PICK_STRONG),
    getMlbConvergencePickStreak(MLB_FACTOR_PICK_COMPLETE),
    getMlbConvergencePickBestStreak(MLB_FACTOR_PICK_COMPLETE),
    getMlbConvergencePickTeamStats(MLB_FACTOR_PICK_STRONG),
    getMlbConvergencePickTeamStats(MLB_FACTOR_PICK_COMPLETE),
    getMlbConvergencePickHomeAwaySplit(MLB_FACTOR_PICK_STRONG),
    getMlbConvergencePickHomeAwaySplit(MLB_FACTOR_PICK_COMPLETE),
    getMlbConvergencePickDayOfWeekSplit(MLB_FACTOR_PICK_STRONG),
    getMlbConvergencePickDayOfWeekSplit(MLB_FACTOR_PICK_COMPLETE),
  ]);

  return {
    strongConvergenceRecord,
    completeConvergenceRecord,
    strongConvergenceStreak,
    strongBestStreak,
    completeConvergenceStreak,
    completeBestStreak,
    strongTeamStats,
    completeTeamStats,
    strongHomeAwaySplit,
    completeHomeAwaySplit,
    strongDayOfWeekSplit,
    completeDayOfWeekSplit,
    hasAnyData: strongConvergenceRecord.total > 0 || completeConvergenceRecord.total > 0,
  };
}

type MlbReviewsData = Awaited<ReturnType<typeof getMlbReviewsData>>;
