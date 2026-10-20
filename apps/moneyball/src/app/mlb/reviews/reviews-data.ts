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
    strongConvergenceStreakResult,
    strongBestStreakResult,
    completeConvergenceStreakResult,
    completeBestStreakResult,
    strongTeamStatsResult,
    completeTeamStatsResult,
    strongHomeAwaySplitResult,
    completeHomeAwaySplitResult,
    strongDayOfWeekSplitResult,
    completeDayOfWeekSplitResult,
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

  // cycle 3402 fix — getMlbConvergencePick* 계열 반환 shape 변경(degraded 플래그 추가) unwrap +
  // 집계 degraded 노출 (호출 page 가 자체 dbDegraded 배너에 OR 하도록).
  const strongConvergenceStreak = strongConvergenceStreakResult.streak;
  const strongBestStreak = strongBestStreakResult.streak;
  const completeConvergenceStreak = completeConvergenceStreakResult.streak;
  const completeBestStreak = completeBestStreakResult.streak;
  const strongTeamStats = strongTeamStatsResult.rows;
  const completeTeamStats = completeTeamStatsResult.rows;
  const strongHomeAwaySplit = strongHomeAwaySplitResult.split;
  const completeHomeAwaySplit = completeHomeAwaySplitResult.split;
  const strongDayOfWeekSplit = strongDayOfWeekSplitResult.rows;
  const completeDayOfWeekSplit = completeDayOfWeekSplitResult.rows;

  const degraded = strongConvergenceRecord.degraded
    || completeConvergenceRecord.degraded
    || strongConvergenceStreakResult.degraded
    || strongBestStreakResult.degraded
    || completeConvergenceStreakResult.degraded
    || completeBestStreakResult.degraded
    || strongTeamStatsResult.degraded
    || completeTeamStatsResult.degraded
    || strongHomeAwaySplitResult.degraded
    || completeHomeAwaySplitResult.degraded
    || strongDayOfWeekSplitResult.degraded
    || completeDayOfWeekSplitResult.degraded;

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
    degraded,
  };
}
