/**
 * walk-forward 대체 pattern helpers — plan #15 C1e (cycle 1021).
 *
 * pure functions only (Sentry-free / supabase-free) — vitest deterministic.
 *
 * 의도: cycle 1019 plan #14 C1b 가 walk-forward 단독 patron 만 박제 → n=27 cohort
 * 가 rule_definition_date (2026-05-12) 직후라 train set ≈ 0 (degenerate). 대체
 * pattern 2종 추가:
 *
 * - **expanding window OOS**: train=v1.7-revert 전체 + test=v1.8 cohort. 시간 leakage
 *   차단 (5/12 split). 소표본 (n=25) 도 evidence pack 가능.
 * - **rolling time CV**: 시간 window 별 split (예: 7일 window, 1일 step). cohort
 *   안 noise 가 시간 cluster 안 균등하게 분산되는지 검증.
 *
 * 자가 의심 (cycle 887 plan #8 패턴 정합):
 * - 모든 결과 "evidence pack only" 라벨 강제 — production ship 결정 input 으로만 사용
 * - 소표본 (n < 150) 결정 X
 */

import type { BacktestPredictionRow } from './backtest-v2-helpers';

export type CvPattern = 'walk-forward' | 'expanding' | 'rolling';

export interface SplitResult {
  pattern: CvPattern;
  train: BacktestPredictionRow[];
  test: BacktestPredictionRow[];
  notes: string;
}

/**
 * walk-forward split (cycle 1019 기존 pattern).
 * rule_definition_date 기준 train=before / test=after.
 * v1.8 시작 (5/13) 직후 = train set ≈ 0 (degenerate).
 */
export function walkForwardSplit(
  rows: BacktestPredictionRow[],
  ruleDefinitionDate: string,
): SplitResult {
  const train: BacktestPredictionRow[] = [];
  const test: BacktestPredictionRow[] = [];
  for (const row of rows) {
    const date = row.games?.game_date;
    if (!date) continue;
    if (date < ruleDefinitionDate) train.push(row);
    else test.push(row);
  }
  return {
    pattern: 'walk-forward',
    train,
    test,
    notes: `walk-forward split: rule_definition_date=${ruleDefinitionDate} / train=${train.length} / test=${test.length}`,
  };
}

/**
 * expanding window OOS — train=옛 scoring_rule 전체 (예: v1.7-revert) + test=새
 * scoring_rule cohort (예: v1.8). 시간 leakage 차단.
 *
 * train_scoring_rules + test_scoring_rules 명시 — silent drift 차단.
 */
export function expandingWindowSplit(
  rows: BacktestPredictionRow[],
  trainScoringRules: readonly string[],
  testScoringRules: readonly string[],
): SplitResult {
  const train: BacktestPredictionRow[] = [];
  const test: BacktestPredictionRow[] = [];
  for (const row of rows) {
    if (trainScoringRules.includes(row.scoring_rule)) train.push(row);
    else if (testScoringRules.includes(row.scoring_rule)) test.push(row);
  }
  return {
    pattern: 'expanding',
    train,
    test,
    notes: `expanding window split: train=[${trainScoringRules.join(',')}] (n=${train.length}) / test=[${testScoringRules.join(',')}] (n=${test.length})`,
  };
}

/**
 * rolling time CV — 시간 window 별 split. window_days = train + test 누적.
 * step_days = window 이동 단위. last_window 만 반환 (간단 1-fold rolling, 다중
 * fold 는 caller 가 반복 호출).
 *
 * sort by game_date ASC → last window = train (앞 window_days × 0.7) + test (뒤 window_days × 0.3).
 */
export function rollingTimeCV(
  rows: BacktestPredictionRow[],
  windowDays: number = 30,
  trainTestRatio: number = 0.7,
): SplitResult {
  const sorted = [...rows]
    .filter((r) => r.games?.game_date != null)
    .sort((a, b) => (a.games!.game_date < b.games!.game_date ? -1 : 1));

  if (sorted.length === 0) {
    return {
      pattern: 'rolling',
      train: [],
      test: [],
      notes: `rolling time CV: 빈 cohort / windowDays=${windowDays} / trainTestRatio=${trainTestRatio}`,
    };
  }

  const lastDate = sorted[sorted.length - 1].games!.game_date;
  const windowStart = subtractDays(lastDate, windowDays);
  const windowRows = sorted.filter((r) => r.games!.game_date >= windowStart);

  const splitIdx = Math.floor(windowRows.length * trainTestRatio);
  const train = windowRows.slice(0, splitIdx);
  const test = windowRows.slice(splitIdx);

  return {
    pattern: 'rolling',
    train,
    test,
    notes: `rolling time CV: lastDate=${lastDate} / windowStart=${windowStart} / windowDays=${windowDays} / train=${train.length} / test=${test.length}`,
  };
}

/** YYYY-MM-DD - N days. UTC 무관 (string 비교만 사용). */
function subtractDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
