/**
 * v2.0 후보 가중치 backtest harness — plan #14 C1b (cycle 1019).
 * thin wrapper — helper logic 은 packages/kbo-data/src/backtest/backtest-v2-helpers.ts.
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../scripts/backtest-v2-candidate.ts        # dry-run
 *     tsx ../../scripts/backtest-v2-candidate.ts --write # docs/research/v2.0-backtest-evidence.md write
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluatePair,
  evaluateFancyElo,
  evaluateThreeWay,
  formatBacktestMarkdown,
  type BacktestPredictionRow,
  type TeamEloMap,
} from '@moneyball/kbo-data/src/backtest/backtest-v2-helpers';
import {
  scoringRuleSplit,
  rollingTimeCV,
  type CvPattern,
} from '@moneyball/kbo-data/src/backtest/walk-forward-helpers';
import {
  fitWeightedLogistic,
  type FactorMap,
} from '@moneyball/kbo-data/src/backtest/logistic-regression';
import { fetchEloRatings } from '@moneyball/kbo-data/src/scrapers/fancy-stats';
import { DEFAULT_WEIGHTS, SHADOW_V20_WEIGHTS, GAME_STATUS_FINAL } from '@moneyball/shared';

function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('env missing: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchV18Cohort(db: SupabaseClient): Promise<BacktestPredictionRow[]> {
  const result = await db
    .from('predictions')
    .select(
      'game_id, scoring_rule, factors, games!inner(game_date, status, home_team_id, away_team_id, winner_team_id)',
    )
    .eq('scoring_rule', 'v1.8')
    .eq('prediction_type', 'pre_game')
    .order('game_id', { ascending: false });
  if (result.error) throw new Error(`fetch v1.8 cohort: ${result.error.message}`);
  return (result.data ?? []) as unknown as BacktestPredictionRow[];
}

/**
 * plan #15 C1e — expanding window OOS 용 train cohort fetch (옛 scoring_rule 포함).
 * train_scoring_rules ∈ ['v1.5', 'v1.6', 'v1.7-revert'] (default).
 */
async function fetchTrainCohort(
  db: SupabaseClient,
  trainScoringRules: readonly string[],
): Promise<BacktestPredictionRow[]> {
  const result = await db
    .from('predictions')
    .select(
      'game_id, scoring_rule, factors, games!inner(game_date, status, home_team_id, away_team_id, winner_team_id)',
    )
    .in('scoring_rule', trainScoringRules)
    .eq('prediction_type', 'pre_game')
    .order('game_id', { ascending: false });
  if (result.error) throw new Error(`fetch train cohort: ${result.error.message}`);
  return (result.data ?? []) as unknown as BacktestPredictionRow[];
}

/**
 * team_code → team_id map (Fancy Stats Elo result → DB team_id 매핑).
 */
async function fetchTeamCodeIdMap(db: SupabaseClient): Promise<Map<string, number>> {
  const result = await db.from('teams').select('id, code');
  if (result.error) throw new Error(`fetch teams: ${result.error.message}`);
  const map = new Map<string, number>();
  for (const row of (result.data ?? []) as Array<{ id: number; code: string }>) {
    map.set(row.code, row.id);
  }
  return map;
}

/**
 * Fancy Stats Elo fetch + team_id 매핑 — plan #15 C1d (cycle 1021).
 * fail tolerant — Elo scraper fail 시 빈 map 반환 (evaluateFancyElo 가 null Brier 보고).
 */
async function fetchTeamElos(db: SupabaseClient): Promise<{ map: TeamEloMap; scraperFailed: boolean; scraperError: string | null }> {
  const teamMap = await fetchTeamCodeIdMap(db);
  const teamEloMap: TeamEloMap = new Map();
  let scraperFailed = false;
  let scraperError: string | null = null;
  try {
    const currentSeason = new Date().getFullYear();
    const eloData = await fetchEloRatings(currentSeason);
    for (const row of eloData) {
      const teamId = teamMap.get(row.team);
      if (teamId != null) teamEloMap.set(teamId, row.elo);
    }
  } catch (e) {
    scraperFailed = true;
    scraperError = e instanceof Error ? e.message : String(e);
    console.warn(`[backtest-v2-candidate] fetchEloRatings 실패 (Elo baseline skip):`, scraperError);
  }
  return { map: teamEloMap, scraperFailed, scraperError };
}

/** plan #15 C1e + plan #16 — --cv-pattern flag parser. default walk-forward. */
function parseCvPattern(): CvPattern {
  const flag = process.argv.find((a) => a.startsWith('--cv-pattern='));
  if (!flag) return 'walk-forward';
  const value = flag.split('=')[1];
  if (
    value === 'walk-forward' ||
    value === 'v18-only-rescore' ||
    value === 'rolling' ||
    value === 'train-and-test'
  ) {
    return value;
  }
  throw new Error(
    `invalid --cv-pattern=${value}. allowed: walk-forward | v18-only-rescore | rolling | train-and-test`,
  );
}

async function main() {
  const writeMode = process.argv.includes('--write');
  const cvPattern = parseCvPattern();
  console.log(`[backtest-v2-candidate] mode=${writeMode ? 'write' : 'dry-run'} cv-pattern=${cvPattern}`);

  const db = createAdminClient();

  // plan #15 C1e + plan #16 — cohort 구성 (cv-pattern 별 분기)
  let cohort: BacktestPredictionRow[];
  let cohortNote: string;
  // plan #16 train-and-test mode 전용 — 별도 분기 (3-way comparison)
  if (cvPattern === 'train-and-test') {
    await runTrainAndTestMode(db, writeMode);
    return;
  }
  if (cvPattern === 'v18-only-rescore') {
    // v18-only-rescore (이전 'expanding' alias). autoplan Eng-C1 rename
    // (CRITICAL, cycle 1021): train (v1.5/v1.6/v1.7-revert) cohort 가져오나
    // `cohort = split.test` 만 사용 = train 폐기. 실제 동작 = v1.8 cohort 재가중합.
    // 진짜 expanding window OOS = train weights 학습 layer 필요 (carry-over plan).
    const v18 = await fetchV18Cohort(db);
    const train = await fetchTrainCohort(db, ['v1.5', 'v1.6', 'v1.7-revert']);
    const split = scoringRuleSplit([...train, ...v18], ['v1.5', 'v1.6', 'v1.7-revert'], ['v1.8']);
    cohort = split.test; // production OOS evidence = v1.8 test set 만 (train 폐기)
    cohortNote = `v18-only-rescore (train ${split.train.length} 폐기, v1.8 test ${split.test.length} re-weighted)`;
  } else if (cvPattern === 'rolling') {
    // rolling time CV: 최근 30일 window 안 train(7) test(3)
    // H3 fix — window > cohort span silent 차단. dates 추출 후 span 측정.
    const v18 = await fetchV18Cohort(db);
    const dates = v18.map((r) => r.games?.game_date).filter((d): d is string => !!d).sort();
    const cohortSpanDays = dates.length >= 2 ? Math.ceil((Date.parse(dates[dates.length - 1] + 'T00:00:00Z') - Date.parse(dates[0] + 'T00:00:00Z')) / 86400000) : 0;
    if (cohortSpanDays < 30 && cohortSpanDays > 0) {
      console.warn(`[backtest-v2-candidate] WARNING: rolling windowDays=30 > cohort span=${cohortSpanDays} → effective window = full cohort. label misleading.`);
    }
    const split = rollingTimeCV(v18, 30, 0.7);
    cohort = split.test;
    cohortNote = `rolling 30-day window (cohort span=${cohortSpanDays}d): train=${split.train.length} / test=${split.test.length} (production OOS)`;
  } else {
    // walk-forward (기존 cycle 1019 pattern — train ≈ 0 degenerate)
    cohort = await fetchV18Cohort(db);
    cohortNote = `walk-forward: train ≈ 0 (rule_definition_date 2026-05-12 직후 cohort)`;
  }
  console.log(`[backtest-v2-candidate] ${cohortNote}`);
  console.log(`[backtest-v2-candidate] fetched n=${cohort.length} predictions`);

  // H4 fix — empty cohort (test set 0 row) silent doc 박제 차단
  if (cohort.length === 0) {
    console.error(`[backtest-v2-candidate] FATAL: cohort.length=0 (${cvPattern} mode). measure 불가, doc 박제 skip.`);
    process.exit(2);
  }

  // plan #15 C1d — Fancy Stats Elo baseline 측정 (cohort_n=0 이슈와 분리 가능, final game outcome 만 필요)
  const teamElosResult = await fetchTeamElos(db);
  const teamElos = teamElosResult.map;
  console.log(`[backtest-v2-candidate] team Elo map size=${teamElos.size}`);

  const result = evaluatePair(cohort);
  const eloResult = evaluateFancyElo(cohort, teamElos);
  result.fancy_stats_elo_brier = eloResult.brier;
  // H2 fix — scraper silent fail 시 status banner 박제 + warning 추가
  if (teamElosResult.scraperFailed) {
    result.fancy_stats_elo_note = `[ELO_SCRAPER_FAILED] [${cvPattern}] ${cohortNote} / scraper error: ${teamElosResult.scraperError} / Elo baseline 측정 X — 본 evidence pack 안 Elo Brier 신뢰 X`;
    result.warnings.push(`CRITICAL: Fancy Stats Elo scraper failed (${teamElosResult.scraperError}). Brier 측정 X. 본 fire 결과 Elo baseline 항목 사용 금지.`);
  } else {
    result.fancy_stats_elo_note = `[${cvPattern}] ${cohortNote} / ${eloResult.note}`;
  }
  console.log(`[backtest-v2-candidate] result:`, JSON.stringify(result, null, 2));

  if (writeMode) {
    const docPath = resolve(__dirname, '../docs/research/v2.0-backtest-evidence.md');
    writeFileSync(docPath, formatBacktestMarkdown(result, 1021), 'utf-8');
    console.log(`[backtest-v2-candidate] written: ${docPath}`);
  } else {
    console.log(`[backtest-v2-candidate] dry-run — pass --write to ship doc`);
  }
}

/**
 * plan #16 — true expanding window OOS train-and-test mode.
 *
 * 1. train cohort fetch (v1.5/v1.6/v1.7-revert)
 * 2. final 경기 + factors 있는 row 만 필터 (학습 가능 cohort)
 * 3. logistic regression fit → learned weights
 * 4. test cohort (v1.8) fetch
 * 5. 3-way comparison (learned vs DEFAULT vs SHADOW_V20)
 * 6. 결과 stdout + (--write 시) markdown 박제
 *
 * 자가 의신 (plan #16 frontmatter 정합):
 * - learned weights 절대값 신뢰 X — cross-version factor normalization 위장 risk
 * - 소표본 train cohort noise (n ≈ 105 추정) — production 적용 결정 X
 */
async function runTrainAndTestMode(db: SupabaseClient, writeMode: boolean) {
  console.log(`[backtest-v2-candidate] train-and-test mode (plan #16 — true expanding window OOS)`);

  const trainRows = await fetchTrainCohort(db, ['v1.5', 'v1.6', 'v1.7-revert']);
  const testRows = await fetchV18Cohort(db);

  // 학습 cohort = final + factors 있는 train row 만
  const factorsList: FactorMap[] = [];
  const homeWinList: boolean[] = [];
  for (const row of trainRows) {
    const g = row.games;
    if (!g || g.status !== GAME_STATUS_FINAL || g.winner_team_id == null) continue;
    if (!row.factors) continue;
    factorsList.push(row.factors as FactorMap);
    homeWinList.push(g.winner_team_id === g.home_team_id);
  }

  console.log(
    `[backtest-v2-candidate] train: total=${trainRows.length} / learnable=${factorsList.length} (final + factors 있는 row)`,
  );
  console.log(`[backtest-v2-candidate] test (v1.8): total=${testRows.length}`);

  if (factorsList.length < 30) {
    console.error(
      `[backtest-v2-candidate] FATAL: train cohort learnable=${factorsList.length} < 30. logistic regression fit 위험 (소표본). doc 박제 skip.`,
    );
    process.exit(2);
  }

  const fit = fitWeightedLogistic(factorsList, homeWinList, {
    lambda: 0.01,
    lr: 0.5,
    maxIter: 5000,
    tol: 1e-8,
  });

  console.log(`[backtest-v2-candidate] logistic regression fit:`, {
    trainN: fit.trainN,
    iterations: fit.iterations,
    finalLoss: fit.finalLoss,
    bias: fit.bias,
  });
  console.log(`[backtest-v2-candidate] learned weights (normalized sum=1):`, fit.weights);
  console.log(`[backtest-v2-candidate] raw weights (pre-clamp):`, fit.rawWeights);

  if (testRows.length === 0) {
    console.error(`[backtest-v2-candidate] FATAL: test cohort (v1.8) empty. 3-way comparison 불가, doc 박제 skip.`);
    process.exit(2);
  }

  const threeWay = evaluateThreeWay(testRows, fit.weights, DEFAULT_WEIGHTS, SHADOW_V20_WEIGHTS);
  console.log(`[backtest-v2-candidate] 3-way comparison:`, JSON.stringify(threeWay, null, 2));

  if (writeMode) {
    const docPath = resolve(__dirname, '../docs/research/v2.0-backtest-evidence.md');
    const md = formatTrainAndTestMarkdown(fit, threeWay, factorsList.length, testRows.length);
    writeFileSync(docPath, md, 'utf-8');
    console.log(`[backtest-v2-candidate] written: ${docPath}`);
  } else {
    console.log(`[backtest-v2-candidate] dry-run — pass --write to ship doc`);
  }
}

/**
 * plan #16 train-and-test markdown formatter — evidence pack.
 *
 * 자가 의심 (소표본 + cross-version normalization 위장 risk) 명시 박제.
 */
function formatTrainAndTestMarkdown(
  fit: ReturnType<typeof fitWeightedLogistic>,
  threeWay: ReturnType<typeof evaluateThreeWay>,
  trainTotal: number,
  testTotal: number,
): string {
  const weightRow = (label: string, w: Record<string, number>) => {
    const keys = Object.keys(DEFAULT_WEIGHTS).filter((k) => DEFAULT_WEIGHTS[k as keyof typeof DEFAULT_WEIGHTS] > 0);
    return `| ${label} | ${keys.map((k) => (w[k] ?? 0).toFixed(3)).join(' | ')} |`;
  };
  const keys = Object.keys(DEFAULT_WEIGHTS).filter((k) => DEFAULT_WEIGHTS[k as keyof typeof DEFAULT_WEIGHTS] > 0);

  return `# v2.0 후보 가중치 backtest evidence — plan #16 (train-and-test mode)

생성: ${new Date().toISOString()}
cycle: 1021
plan: #16 — true expanding window OOS (train cohort 위 logistic regression fit)
parent_plan: #15 (Eng-C1 finding 후속)

## 자가 검증 (plan #16 frontmatter 정합)

- **소표본 결정 X**: train_learnable=${fit.trainN} / test_n=${threeWay.test_n}. 본 결과 = evidence pack only.
- **cross-version factor normalization 위장 risk**: train (v1.5/v1.6/v1.7-revert) 과 test (v1.8) factors 가 다른 weights/scale 로 generate 됐을 가능성. learned weights 절대값 신뢰 X — 상대 ordering 비교만.
- **warnings**: ${threeWay.warnings.length === 0 ? '없음' : threeWay.warnings.join(' / ')}

## Train summary

- train cohort total: ${trainTotal} row (v1.5 + v1.6 + v1.7-revert)
- learnable (final + factors 있는 row): ${fit.trainN}
- iterations: ${fit.iterations}
- finalLoss: ${fit.finalLoss}
- bias (intercept): ${fit.bias}

## Test (v1.8) 위 3-way comparison

| 가중치 | n | Brier | accuracy |
|---|---|---|---|
| DEFAULT_WEIGHTS (v1.8 production) | ${threeWay.test_n} | ${threeWay.default_brier} | ${threeWay.default_accuracy} |
| SHADOW_V20_WEIGHTS (v2.0 후보) | ${threeWay.test_n} | ${threeWay.shadow_v20_brier} | ${threeWay.shadow_v20_accuracy} |
| Learned (plan #16 logistic regression) | ${threeWay.test_n} | ${threeWay.learned_brier} | ${threeWay.learned_accuracy} |

- **best by Brier (낮을수록 좋음)**: \`${threeWay.best_by_brier}\`
- **best by accuracy (높을수록 좋음)**: \`${threeWay.best_by_accuracy}\`

## Learned weights (normalized sum=1)

| weights | ${keys.join(' | ')} |
|---|${keys.map(() => '---').join('|')}|
${weightRow('DEFAULT', DEFAULT_WEIGHTS as unknown as Record<string, number>)}
${weightRow('SHADOW_V20', SHADOW_V20_WEIGHTS as unknown as Record<string, number>)}
${weightRow('Learned', fit.weights as unknown as Record<string, number>)}

## Raw weights (pre-clamp/pre-normalize)

\`\`\`json
${JSON.stringify(fit.rawWeights, null, 2)}
\`\`\`

## 다음 단계

- learned weights 절대값 신뢰 X — 상대 ordering 비교 + n=150 forward cohort 측정 후 production 적용 결정
- v2.0 후보 weights 재설계 input (CEO-3 finding 후속) — learned weights 가 SHADOW_V20 보다 win 시 그 ordering 참고
- plan #15 C1f (Statcast factor 13+ 후보) 와 분리 — 본 plan #16 = 기존 10 factor 위 학습 layer
`;
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[backtest-v2-candidate] fatal:', e);
    process.exit(1);
  });
}
