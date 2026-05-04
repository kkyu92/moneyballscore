/**
 * v3 백테스트 — 기본 4 feature + game_records 기반 4 feature = 8 feature
 * logistic 재학습.
 *
 * Split: Train 2023+2024 / Test 2025 — 2025 game_records 백필 완료 필요.
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../packages/kbo-data/src/pipeline/backtest-v3-run.ts
 *
 * 목적: 불펜 피로도·팀 타자 폼·팀 투수 컨디션 feature 의 개별 유의성 검증.
 * 결과 → v1.7 가중치 후보 도출.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  loadDecidedGames,
  loadGameRecords,
  fetchEloHistory,
  buildFeatures,
  computeMetrics,
} from '../backtest';
import {
  trainLogistic,
  predict,
  vectorize,
  vectorizeV3,
  coefficientStdErrors,
  FEATURE_NAMES,
  FEATURE_NAMES_V3,
} from '../backtest/logistic';
import type {
  BacktestGame,
  GameFeatures,
} from '../backtest';
import type { FinishedGame } from '../engine/form';
import type { EloHistory } from '../backtest/elo-history';
import type { GameRecordLite } from '../features/game-record-features';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

function createAdminClient(): DB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('env missing');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function pct(x: number): string {
  return (x * 100).toFixed(2) + '%';
}

function extract(
  games: BacktestGame[],
  eloHistory: EloHistory,
  allRecords: GameRecordLite[],
): { features: GameFeatures[]; outcomes: number[]; nWithRecords: number } {
  const priorBySeason = new Map<number, FinishedGame[]>();
  const recordsBySeason = new Map<number, GameRecordLite[]>();
  for (const r of allRecords) {
    const season = Number(r.gameDate.slice(0, 4));
    const arr = recordsBySeason.get(season) ?? [];
    arr.push(r);
    recordsBySeason.set(season, arr);
  }

  const features: GameFeatures[] = [];
  const outcomes: number[] = [];
  let nWithRecords = 0;

  for (const g of games) {
    const prior = priorBySeason.get(g.season) ?? [];
    const seasonRecords = recordsBySeason.get(g.season) ?? [];
    // priorRecords = target.date 미만
    const priorRecords = seasonRecords.filter((r) => r.gameDate < g.date);
    const f = buildFeatures(g, prior, eloHistory, undefined, priorRecords);
    if (f) {
      features.push(f);
      outcomes.push(g.homeWon ? 1 : 0);
      if (f.homeBullpenInningsL3 !== undefined) nWithRecords++;
    }
    prior.unshift({
      home_team_id: g.homeTeamId,
      away_team_id: g.awayTeamId,
      winner_team_id: g.homeWon ? g.homeTeamId : g.awayTeamId,
    });
    priorBySeason.set(g.season, prior);
  }
  return { features, outcomes, nWithRecords };
}

function reportCoefs(
  name: string,
  weights: number[],
  intercept: number,
  se: number[],
  featureNames: string[],
) {
  console.log(`\n  === ${name} (n=${weights.length}) ===`);
  console.log('    feature                  coef       SE      z        95%CI              유의?');
  for (let j = 0; j < weights.length; j++) {
    const w = weights[j];
    const s = se[j];
    const z = w / s;
    const lo = w - 1.96 * s;
    const hi = w + 1.96 * s;
    const sig =
      Math.abs(z) >= 2.58
        ? '⭐⭐ p<0.01'
        : Math.abs(z) >= 1.96
          ? '⭐ p<0.05'
          : Math.abs(z) >= 1.0
            ? '-'
            : '✗ null-like';
    console.log(
      `    ${featureNames[j].padEnd(24)}  ${w.toFixed(4).padStart(8)}  ${s.toFixed(4)}  ${z.toFixed(2).padStart(6)}  [${lo.toFixed(3).padStart(7)}, ${hi.toFixed(3).padStart(7)}]  ${sig}`,
    );
  }
  console.log(`    intercept                ${intercept.toFixed(4).padStart(8)}`);
}

async function main() {
  console.log('\n=== v3 Backtest — game_records feature 추가 ===\n');

  console.log('[1/4] Elo history + game_records 로드…');
  const eloHistory = await fetchEloHistory();
  const db = createAdminClient();
  const records = await loadGameRecords(db, { seasons: [2023, 2024, 2025] });
  console.log(`  game_records: ${records.length}`);
  const byYear: Record<number, number> = {};
  for (const r of records) {
    const y = Number(r.gameDate.slice(0, 4));
    byYear[y] = (byYear[y] || 0) + 1;
  }
  for (const y of [2023, 2024, 2025]) console.log(`    ${y}: ${byYear[y] || 0}`);

  console.log('\n[2/4] decided games 로드…');
  const allGames = await loadDecidedGames(db, { seasons: [2023, 2024, 2025] });
  const trainGames = allGames.filter((g) => g.season <= 2024);
  const testGames = allGames.filter((g) => g.season === 2025);
  console.log(`  train (2023-24) N=${trainGames.length}, test (2025) N=${testGames.length}`);

  const train = extract(trainGames, eloHistory, records);
  const test = extract(testGames, eloHistory, records);
  console.log(`  train features N=${train.features.length} (${train.nWithRecords} with game_records)`);
  console.log(`  test features N=${test.features.length} (${test.nWithRecords} with game_records)`);

  // Vectorize
  const Xtr4 = train.features.map(vectorize);
  const Xte4 = test.features.map(vectorize);
  const Xtr8 = train.features.map(vectorizeV3);
  const Xte8 = test.features.map(vectorizeV3);

  console.log('\n[3/4] Logistic 학습 — base 4 vs v3 8 feature…');
  // H6 fix (cycle 23): best-of-lambda by test Brier = test-set hyperparam tuning (double-dip).
  // cycle 22 bootstrap-ci 검증 best λ=0.01 — fix LAMBDA=0.01.
  const LAMBDA = 0.01;
  const fit = (X: number[][], y: number[]) => ({
    lambda: LAMBDA,
    model: trainLogistic(X, y, { lambda: LAMBDA, lr: 0.3, maxIter: 8000, tol: 1e-10 }),
  });
  const fit4 = fit(Xtr4, train.outcomes);
  const fit8 = fit(Xtr8, train.outcomes);
  console.log(`  base 4-feature: λ=${fit4.lambda}  iter=${fit4.model.iterations}`);
  console.log(`  v3 8-feature:   λ=${fit8.lambda}  iter=${fit8.model.iterations}`);

  const se4 = coefficientStdErrors(fit4.model, Xtr4);
  const se8 = coefficientStdErrors(fit8.model, Xtr8);
  reportCoefs('Base (4 feature)', fit4.model.weights, fit4.model.intercept, se4, FEATURE_NAMES);
  reportCoefs(
    'v3 (8 feature — + bullpen/runs/allowed/HR L3~L5)',
    fit8.model.weights,
    fit8.model.intercept,
    se8,
    FEATURE_NAMES_V3,
  );

  console.log('\n[4/4] Out-of-Sample Test (2025)…\n');
  const tr4Pred = predict(fit4.model, Xtr4);
  const te4Pred = predict(fit4.model, Xte4);
  const tr8Pred = predict(fit8.model, Xtr8);
  const te8Pred = predict(fit8.model, Xte8);
  const baseTr = new Array(train.outcomes.length).fill(0.5);
  const baseTe = new Array(test.outcomes.length).fill(0.5);

  const trM4 = computeMetrics(tr4Pred, train.outcomes);
  const teM4 = computeMetrics(te4Pred, test.outcomes);
  const trM8 = computeMetrics(tr8Pred, train.outcomes);
  const teM8 = computeMetrics(te8Pred, test.outcomes);
  const trCoin = computeMetrics(baseTr, train.outcomes);
  const teCoin = computeMetrics(baseTe, test.outcomes);

  function line(name: string, m: { brier: number; logLoss: number; accuracy: number; n: number }) {
    console.log(
      `  ${name.padEnd(26)} Brier ${m.brier.toFixed(5)}  LogLoss ${m.logLoss.toFixed(5)}  Acc ${pct(m.accuracy)}  n=${m.n}`,
    );
  }
  console.log('  --- Train (2023-24) ---');
  line('coin_flip(0.5)', trCoin);
  line('Logistic 4-feature', trM4);
  line('Logistic 8-feature', trM8);

  console.log('\n  --- Test (2025) — out-of-sample ---');
  line('coin_flip(0.5)', teCoin);
  line('Logistic 4-feature', teM4);
  line('Logistic 8-feature', teM8);

  const dBrier = teM8.brier - teM4.brier;
  console.log(
    `\n  ΔBrier (8-feature vs 4-feature, test): ${dBrier >= 0 ? '+' : ''}${dBrier.toFixed(5)}`,
  );
  if (dBrier < -0.001) {
    console.log('  → game_records feature 추가가 test Brier 개선.');
  } else if (dBrier > 0.001) {
    console.log('  → 추가 feature 가 test Brier 악화 (overfitting 또는 noise).');
  } else {
    console.log('  → 차이 미미 (|Δ| < 0.001).');
  }

  console.log('\n=== 완료 ===\n');
}

main().catch((err) => {
  console.error('V3 BACKTEST FAILED:', err);
  process.exit(1);
});
