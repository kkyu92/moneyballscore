/**
 * v2.0 후보 backtest helpers — plan #14 C1b (cycle 1019).
 * scripts/backtest-v2-candidate.ts 가 본 helper import + supabase DB fetch + write doc.
 *
 * 본 helper = pure functions only (Sentry-free / supabase-free) — vitest deterministic.
 */

import { DEFAULT_WEIGHTS, SHADOW_V20_WEIGHTS, HOME_ADVANTAGE } from '@moneyball/shared';

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
    winner_team_id: number | null;
  } | null;
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
    if (!game || game.status !== 'completed' || game.winner_team_id == null) continue;
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
