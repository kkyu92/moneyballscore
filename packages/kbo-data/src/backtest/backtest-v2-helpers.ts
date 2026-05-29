/**
 * v2.0 후보 backtest helpers — plan #14 C1b (cycle 1019).
 * scripts/backtest-v2-candidate.ts 가 본 helper import + supabase DB fetch + write doc.
 *
 * 본 helper = pure functions only (Sentry-free / supabase-free) — vitest deterministic.
 */

import { DEFAULT_WEIGHTS, SHADOW_V20_WEIGHTS, HOME_ADVANTAGE, HOME_ELO_BONUS, GAME_STATUS_FINAL } from '@moneyball/shared';

const CLAMP_LO = 0.15;
const CLAMP_HI = 0.85;
const NEUTRAL_FACTOR = 0.5;

/** cycle 231 박제 시점 = 2026-05-12. v1.8 본격 production 시작 = 2026-05-13. */
export const RULE_DEFINITION_DATE = '2026-05-12';

export interface BacktestPredictionRow {
  game_id: number;
  scoring_rule: string;
  factors: Record<string, number> | null;
  games: {
    game_date: string;
    status: string;
    home_team_id: number;
    away_team_id?: number;
    winner_team_id: number | null;
  } | null;
}

/** team_id → Elo rating map. backtest 호출 site 에서 fetchEloRatings 결과 후 매핑. */
export type TeamEloMap = Map<number, number>;

/**
 * Elo logistic prob — home win 확률. 표준 ELO 공식.
 * 1 / (1 + 10^((awayElo - homeElo - HOME_ELO_BONUS) / 400))
 *
 * HOME_ELO_BONUS = Elo point 단위 (NOT probability delta).
 * 이전 패턴 (HOME_ADVANTAGE × 400) = dimensionally wrong — HOME_ADVANTAGE 가
 * probability delta (0.015 = +1.5pp) 라 × 400 = 6 Elo point 만 = 약 0.86%
 * prob shift (실측 1.5% 의 절반). plan #15 autoplan Eng-H1 finding 후속 fix.
 *
 * HOME_ELO_BONUS = 24 (실측 51.93% 정합 + 측정 noise 흡수). @moneyball/shared
 * 안 박제 (단일 source of truth).
 */
export function computeEloProb(homeElo: number, awayElo: number): number {
  const adjustedDiff = awayElo - homeElo - HOME_ELO_BONUS;
  return 1 / (1 + Math.pow(10, adjustedDiff / 400));
}

/**
 * Fancy Stats Elo Brier 평가 — cohort 안 모든 final game 에 적용.
 * cohort_n=0 (degenerate train set) 이슈와 무관 — Elo baseline 은 game outcome 만 필요.
 *
 * teamElos = team_id → Elo rating map (호출 site 에서 fetchEloRatings 결과).
 * 누락 team_id 시 cohort 에서 제외 (Elo 없으면 baseline 측정 X).
 */
export function evaluateFancyElo(
  rows: BacktestPredictionRow[],
  teamElos: TeamEloMap,
): { brier: number | null; n: number; note: string } {
  let sum = 0;
  let n = 0;
  let missing = 0;

  for (const row of rows) {
    const game = row.games;
    if (!game || game.status !== GAME_STATUS_FINAL || game.winner_team_id == null) continue;
    if (game.away_team_id == null) {
      missing += 1;
      continue;
    }
    const homeElo = teamElos.get(game.home_team_id);
    const awayElo = teamElos.get(game.away_team_id);
    if (homeElo == null || awayElo == null) {
      missing += 1;
      continue;
    }
    const prob = computeEloProb(homeElo, awayElo);
    const homeWin = game.winner_team_id === game.home_team_id;
    sum += brierScore(prob, homeWin);
    n += 1;
  }

  if (n === 0) {
    return {
      brier: null,
      n: 0,
      note: `Fancy Stats Elo Brier 측정 불가 — cohort=0 (missing=${missing}, teamElos size=${teamElos.size})`,
    };
  }

  return {
    brier: Math.round((sum / n) * 10000) / 10000,
    n,
    note: `Fancy Stats Elo Brier 측정 (n=${n}, missing=${missing}, teamElos size=${teamElos.size})`,
  };
}

export interface BacktestResult {
  cohort_n: number;
  v18_brier: number;
  v18_accuracy: number;
  v20_brier: number;
  v20_accuracy: number;
  brier_delta: number;
  accuracy_delta: number;
  fancy_stats_elo_brier: number | null;
  fancy_stats_elo_note: string;
  walk_forward_status: 'degenerate' | 'expanded_window' | 'normal';
  warnings: string[];
}

/**
 * 3-way comparison 결과 — plan #16 train weights 학습 layer 위 학습된 weights vs
 * DEFAULT_WEIGHTS vs SHADOW_V20_WEIGHTS 비교.
 *
 * 자가 의심 (plan #16 frontmatter 정합):
 * - learned weights 절대값 신뢰 X — cross-version factor normalization 위장 risk
 * - 본 결과 = "evidence pack only" 라벨 강제
 */
export interface ThreeWayResult {
  test_n: number;
  default_brier: number;
  default_accuracy: number;
  shadow_v20_brier: number;
  shadow_v20_accuracy: number;
  learned_brier: number;
  learned_accuracy: number;
  /** test 위 best by Brier (낮을수록 좋음) */
  best_by_brier: 'default' | 'shadow_v20' | 'learned';
  /** test 위 best by accuracy (높을수록 좋음) */
  best_by_accuracy: 'default' | 'shadow_v20' | 'learned';
  warnings: string[];
}

/**
 * 3-way evaluate — test cohort 위 DEFAULT_WEIGHTS / SHADOW_V20_WEIGHTS / learned weights.
 *
 * 입력 weights 는 모두 동일 factor key (ACTIVE_FACTOR_KEYS) 지원해야 함.
 * factor 누락 시 NEUTRAL fallback (computeProb 공식 정합).
 *
 * 자가 의심: learned weights 가 win 한다고 production 적용 X — 소표본 noise 가능.
 * production ship 결정은 본 결과 + n=150 forward cohort 측정 + 사용자 판단.
 */
export function evaluateThreeWay(
  rows: BacktestPredictionRow[],
  learnedWeights: Record<string, number>,
  defaultWeights: Record<string, number>,
  shadowV20Weights: Record<string, number>,
): ThreeWayResult {
  const warnings: string[] = [];
  let defSum = 0;
  let v20Sum = 0;
  let learnedSum = 0;
  let defHits = 0;
  let v20Hits = 0;
  let learnedHits = 0;
  let n = 0;

  for (const row of rows) {
    const game = row.games;
    if (!game || game.status !== GAME_STATUS_FINAL || game.winner_team_id == null) continue;
    if (!row.factors) continue;
    const homeWin = game.winner_team_id === game.home_team_id;

    const defProb = computeProb(row.factors, defaultWeights);
    const v20Prob = computeProb(row.factors, shadowV20Weights);
    const learnedProb = computeProb(row.factors, learnedWeights);
    if (defProb == null || v20Prob == null || learnedProb == null) continue;

    defSum += brierScore(defProb, homeWin);
    v20Sum += brierScore(v20Prob, homeWin);
    learnedSum += brierScore(learnedProb, homeWin);
    if (accuracyHit(defProb, homeWin)) defHits += 1;
    if (accuracyHit(v20Prob, homeWin)) v20Hits += 1;
    if (accuracyHit(learnedProb, homeWin)) learnedHits += 1;
    n += 1;
  }

  if (n < 150) {
    warnings.push(
      `소표본 결정 X (test_n=${n} < 150) — 3-way comparison evidence pack only. learned weights production 적용 결정은 n=150 도달 후.`,
    );
  }

  const defBrier = n > 0 ? defSum / n : 0;
  const v20Brier = n > 0 ? v20Sum / n : 0;
  const learnedBrier = n > 0 ? learnedSum / n : 0;
  const defAcc = n > 0 ? defHits / n : 0;
  const v20Acc = n > 0 ? v20Hits / n : 0;
  const learnedAcc = n > 0 ? learnedHits / n : 0;

  const briers: Array<{ name: 'default' | 'shadow_v20' | 'learned'; v: number }> = [
    { name: 'default', v: defBrier },
    { name: 'shadow_v20', v: v20Brier },
    { name: 'learned', v: learnedBrier },
  ];
  const accs: Array<{ name: 'default' | 'shadow_v20' | 'learned'; v: number }> = [
    { name: 'default', v: defAcc },
    { name: 'shadow_v20', v: v20Acc },
    { name: 'learned', v: learnedAcc },
  ];
  const bestByBrier = briers.reduce((a, b) => (b.v < a.v ? b : a)).name;
  const bestByAccuracy = accs.reduce((a, b) => (b.v > a.v ? b : a)).name;

  return {
    test_n: n,
    default_brier: Math.round(defBrier * 10000) / 10000,
    default_accuracy: Math.round(defAcc * 10000) / 10000,
    shadow_v20_brier: Math.round(v20Brier * 10000) / 10000,
    shadow_v20_accuracy: Math.round(v20Acc * 10000) / 10000,
    learned_brier: Math.round(learnedBrier * 10000) / 10000,
    learned_accuracy: Math.round(learnedAcc * 10000) / 10000,
    best_by_brier: bestByBrier,
    best_by_accuracy: bestByAccuracy,
    warnings,
  };
}

/**
 * 가중합 prob — predictor.ts / shadow-cohort.ts 와 동일 공식.
 * weights 안 key 가 factors 에 없으면 NEUTRAL_FACTOR (0.5) fallback.
 */
export function computeProb(
  factors: Record<string, number>,
  weights: Record<string, number>,
): number | null {
  let weightedSum = 0;
  let factorTotal = 0;
  for (const [key, weight] of Object.entries(weights)) {
    factorTotal += weight;
    const raw = factors[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      weightedSum += raw * weight;
    } else {
      weightedSum += NEUTRAL_FACTOR * weight;
    }
  }
  if (factorTotal === 0) return null;
  let prob = weightedSum / factorTotal + HOME_ADVANTAGE;
  prob = Math.max(CLAMP_LO, Math.min(CLAMP_HI, prob));
  return Math.round(prob * 1000) / 1000;
}

/** Brier score — winner-centric ((prob - outcome)^2). */
export function brierScore(prob: number, homeWin: boolean): number {
  const outcome = homeWin ? 1 : 0;
  return (prob - outcome) ** 2;
}

/** accuracy hit — prob > 0.5 = home pred. */
export function accuracyHit(prob: number, homeWin: boolean): boolean {
  return prob > 0.5 === homeWin;
}

/**
 * cohort 종합 평가 — v1.8 (DEFAULT_WEIGHTS) vs v2.0 후보 (SHADOW_V20_WEIGHTS).
 *
 * 자가 의심 (CEO Alt A + Eng High #4):
 * - n < 150 → "소표본 결정 X" warning
 * - n < 30 → walk-forward degenerate warning (rule_definition_date 직후 cohort)
 */
export function evaluatePair(rows: BacktestPredictionRow[]): BacktestResult {
  const warnings: string[] = [];
  let v18Sum = 0;
  let v20Sum = 0;
  let v18Hits = 0;
  let v20Hits = 0;
  let n = 0;

  for (const row of rows) {
    const game = row.games;
    if (!game || game.status !== GAME_STATUS_FINAL || game.winner_team_id == null) continue;
    if (!row.factors) continue;
    const homeWin = game.winner_team_id === game.home_team_id;

    const v18Prob = computeProb(row.factors, DEFAULT_WEIGHTS);
    const v20Prob = computeProb(row.factors, SHADOW_V20_WEIGHTS);
    if (v18Prob == null || v20Prob == null) continue;

    v18Sum += brierScore(v18Prob, homeWin);
    v20Sum += brierScore(v20Prob, homeWin);
    if (accuracyHit(v18Prob, homeWin)) v18Hits += 1;
    if (accuracyHit(v20Prob, homeWin)) v20Hits += 1;
    n += 1;
  }

  if (n < 150) {
    warnings.push(
      `소표본 결정 X (n=${n} < 150) — harness evidence pack only. v2.0 production 적용 결정은 n=150 도달 후.`,
    );
  }
  if (n < 30) {
    warnings.push(
      `walk-forward degenerate (cycle 231 시점 = ${RULE_DEFINITION_DATE} / v1.8 시작 = 2026-05-13). train set ≈ 0.`,
    );
  }

  const v18Brier = n > 0 ? v18Sum / n : 0;
  const v20Brier = n > 0 ? v20Sum / n : 0;
  const v18Accuracy = n > 0 ? v18Hits / n : 0;
  const v20Accuracy = n > 0 ? v20Hits / n : 0;

  // v2.0 후보 kill-switch (autoplan CEO-3 A 채택, cycle 1021 후속).
  // docs/research/v2.0-killswitch.md 정합.
  // 조건: n >= 60 AND v20_accuracy < v18_accuracy - 0.02 (2pp 하회)
  // single-fire warning (3회 연속 검증은 carry-over)
  if (n >= 60 && (v20Accuracy - v18Accuracy) < -0.02) {
    warnings.push(
      `KILL_SWITCH_TRIGGERED: v20_accuracy ${v20Accuracy.toFixed(4)} < v18_accuracy ${v18Accuracy.toFixed(4)} by ${((v18Accuracy - v20Accuracy) * 100).toFixed(2)}pp at n=${n}. 본 weights 폐기 권장 (3회 연속 확인 후). 자세한 protocol = docs/research/v2.0-killswitch.md`,
    );
  }

  return {
    cohort_n: n,
    v18_brier: Math.round(v18Brier * 10000) / 10000,
    v18_accuracy: Math.round(v18Accuracy * 10000) / 10000,
    v20_brier: Math.round(v20Brier * 10000) / 10000,
    v20_accuracy: Math.round(v20Accuracy * 10000) / 10000,
    brier_delta: Math.round((v20Brier - v18Brier) * 10000) / 10000,
    accuracy_delta: Math.round((v20Accuracy - v18Accuracy) * 10000) / 10000,
    fancy_stats_elo_brier: null,
    fancy_stats_elo_note:
      'KBO Fancy Stats Elo public API 부재 — manual fetch + parse 별도 carry-over (plan #14 C1b Step 2 후속).',
    walk_forward_status: n < 30 ? 'degenerate' : n < 150 ? 'expanded_window' : 'normal',
    warnings,
  };
}

export function formatBacktestMarkdown(r: BacktestResult, cycleN = 1019): string {
  return `# v2.0 후보 가중치 backtest evidence — plan #14 C1b

생성: ${new Date().toISOString()}
cycle: ${cycleN}
plan: #14 C1b

## 자가 검증 (CEO Alt A + Eng High #4)

- **소표본 결정 X**: n=${r.cohort_n} < 150. 본 결과 = harness evidence pack only.
- **walk-forward status**: ${r.walk_forward_status} (rule_definition_date=${RULE_DEFINITION_DATE}, v1.8 시작 2026-05-13)
- **warnings**: ${r.warnings.length === 0 ? '없음' : r.warnings.join(' / ')}

## 결과 — v1.8 vs v2.0 후보 (cycle 231 박제 가중치)

| 지표 | v1.8 (production) | v2.0 후보 | Delta |
|---|---|---|---|
| n cohort | ${r.cohort_n} | ${r.cohort_n} | - |
| Brier | ${r.v18_brier} | ${r.v20_brier} | ${r.brier_delta > 0 ? '+' : ''}${r.brier_delta} |
| accuracy | ${r.v18_accuracy} | ${r.v20_accuracy} | ${r.accuracy_delta > 0 ? '+' : ''}${r.accuracy_delta} |

**해석**: Brier delta < 0 = v2.0 후보 가 더 정확 (낮은 Brier = 좋음). accuracy delta > 0 = v2.0 후보 더 적중.

## KBO Fancy Stats Elo baseline (CEO Medium #1)

- Brier: ${r.fancy_stats_elo_brier ?? '미측정'}
- note: ${r.fancy_stats_elo_note}

## v2.0 후보 가중치 (cycle 231 박제)

\`\`\`
elo: 0.10 → 0.13 (+0.03)
bullpen_fip: 0.10 → 0.14 (+0.04)
recent_form: 0.10 → 0.13 (+0.03)
나머지 (sp_fip / sp_xfip / lineup_woba / war / head_to_head / park_factor / sfr) = v1.8 동일
합계: 0.85 → 0.95
\`\`\`

## 다음 단계

- C1a v2.0-shadow row 누적 (cycle 1019 ship 후 자연 cron 박제) → n=150 도달 후 본 backtest 재실행 + production 전환 결정
- Fancy Stats Elo baseline 비교 = plan #14 C1b Step 2 후속 (별도 cycle carry-over)
`;
}
