/**
 * op-analysis heavy — MLB Elo 실측 backtest (plan #25 Phase 3 게이트, cycle 2128).
 *
 * plan #25 Phase 1-2b(cycle 2080/2083)가 mlb_team_elo/mlb_team_elo_history 를
 * 만들었지만 mlb-pipeline.ts runPredictFinal 은 여전히 모든 MLB 예측에
 * elo:{home:ELO_NEUTRAL,away:ELO_NEUTRAL} 고정 placeholder 사용 (Phase 3 = 실 예측
 * 반영, plan #25 self_verification.rubric_evaluation 이 "op-analysis heavy backtest
 * 게이트 통과 전까지 자율 flip 금지"로 명시 — CLAUDE.md '데이터로만 이야기' 룰).
 *
 * 본 스크립트 = 그 게이트. mlb_schedule status='final' 경기를 시간순으로 재생하며
 * 매 경기 "그 경기 이전까지의" Elo rating(pre-game state)으로 expectedHomeWinProb
 * 를 계산해 실제 결과와 대조 — production 반영 없이 순수 신호 존재 여부만 측정.
 *
 * 사용:
 *   cd apps/moneyball && set -a && source .env.local && set +a
 *   pnpm exec tsx ../../scripts/op-analysis-mlb-elo-backtest.ts [out-path]
 */

import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { MLB_ELO_INITIAL_RATING, MLB_ELO_K, expectedHomeWinProb, updateMlbElo } from '@moneyball/kbo-data';

const MLB_ELO_EXHIBITION_CODES = new Set(['AL', 'NL']);
const WARM_GAMES_THRESHOLD = 10; // 팀당 최소 재생 경기 수 — cold-start(ELO_NEUTRAL 동률) noise 배제 cohort

interface FinalGameRow {
  game_datetime_utc: string;
  home_team_code: string;
  away_team_code: string;
  home_score: number;
  away_score: number;
}

interface GamePrediction {
  eloProb: number;
  actual: number; // 1 = home win, 0 = away win
  warm: boolean; // 양팀 모두 WARM_GAMES_THRESHOLD 이상 재생 경기 보유
}

function brier(preds: readonly GamePrediction[], pick: (p: GamePrediction) => number): number {
  if (preds.length === 0) return NaN;
  const sum = preds.reduce((acc, p) => acc + (pick(p) - p.actual) ** 2, 0);
  return sum / preds.length;
}

function accuracy(preds: readonly GamePrediction[], pick: (p: GamePrediction) => number): number {
  if (preds.length === 0) return NaN;
  const correct = preds.filter((p) => (pick(p) >= 0.5 ? 1 : 0) === p.actual).length;
  return correct / preds.length;
}

/** 단순 무작위(mulberry32) — Date.now/Math.random 미사용 결정론적 시드 (재현성 위해 스크립트 실행마다 고정 시드). */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bootstrapBrierCI(
  preds: readonly GamePrediction[],
  pick: (p: GamePrediction) => number,
  iterations = 2000,
): { mean: number; lo: number; hi: number } {
  const rng = mulberry32(20128); // cycle 2128 고정 시드
  const n = preds.length;
  if (n === 0) return { mean: NaN, lo: NaN, hi: NaN };
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(rng() * n);
      const p = preds[idx];
      sum += (pick(p) - p.actual) ** 2;
    }
    samples.push(sum / n);
  }
  samples.sort((a, b) => a - b);
  const lo = samples[Math.floor(iterations * 0.025)];
  const hi = samples[Math.floor(iterations * 0.975)];
  const mean = samples.reduce((a, b) => a + b, 0) / iterations;
  return { mean, lo, hi };
}

async function main() {
  const outPath = process.argv[2];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from('mlb_schedule')
    .select('game_datetime_utc, home_team_code, away_team_code, home_score, away_score')
    .eq('status', 'final')
    .order('game_datetime_utc', { ascending: true });
  if (error) throw error;

  const games = (data ?? []) as FinalGameRow[];
  console.log(`대상 경기 ${games.length}건 (status='final')`);

  const gamesPlayed = new Map<string, number>();
  const eloOf = new Map<string, number>();
  const rating = (team: string) => eloOf.get(team) ?? MLB_ELO_INITIAL_RATING;

  const preds: GamePrediction[] = [];
  let skipped = 0;

  for (const g of games) {
    if (MLB_ELO_EXHIBITION_CODES.has(g.home_team_code) || MLB_ELO_EXHIBITION_CODES.has(g.away_team_code)) {
      skipped++;
      continue;
    }
    if (g.home_score == null || g.away_score == null || g.home_score === g.away_score) {
      skipped++;
      continue;
    }

    const homeElo = rating(g.home_team_code);
    const awayElo = rating(g.away_team_code);
    const homeGamesPlayed = gamesPlayed.get(g.home_team_code) ?? 0;
    const awayGamesPlayed = gamesPlayed.get(g.away_team_code) ?? 0;

    const eloProb = expectedHomeWinProb(homeElo, awayElo);
    const homeWon = g.home_score > g.away_score;
    preds.push({
      eloProb,
      actual: homeWon ? 1 : 0,
      warm: homeGamesPlayed >= WARM_GAMES_THRESHOLD && awayGamesPlayed >= WARM_GAMES_THRESHOLD,
    });

    const updated = updateMlbElo(homeElo, awayElo, homeWon, MLB_ELO_K);
    eloOf.set(g.home_team_code, updated.home);
    eloOf.set(g.away_team_code, updated.away);
    gamesPlayed.set(g.home_team_code, homeGamesPlayed + 1);
    gamesPlayed.set(g.away_team_code, awayGamesPlayed + 1);
  }

  const warmPreds = preds.filter((p) => p.warm);
  const homeWinRateAll = preds.reduce((a, p) => a + p.actual, 0) / preds.length;
  const homeWinRateWarm = warmPreds.reduce((a, p) => a + p.actual, 0) / warmPreds.length;

  const eloBrierAll = brier(preds, (p) => p.eloProb);
  const coinBrierAll = brier(preds, () => 0.5);
  const homeFieldBrierAll = brier(preds, () => homeWinRateAll);
  const eloAccAll = accuracy(preds, (p) => p.eloProb);
  const homeFieldAccAll = accuracy(preds, () => homeWinRateAll);

  const eloBrierWarm = brier(warmPreds, (p) => p.eloProb);
  const coinBrierWarm = brier(warmPreds, () => 0.5);
  const homeFieldBrierWarm = brier(warmPreds, () => homeWinRateWarm);
  const eloAccWarm = accuracy(warmPreds, (p) => p.eloProb);
  const homeFieldAccWarm = accuracy(warmPreds, () => homeWinRateWarm);

  const eloCIAll = bootstrapBrierCI(preds, (p) => p.eloProb);
  const homeFieldCIAll = bootstrapBrierCI(preds, () => homeWinRateAll);
  const eloCIWarm = bootstrapBrierCI(warmPreds, (p) => p.eloProb);
  const homeFieldCIWarm = bootstrapBrierCI(warmPreds, () => homeWinRateWarm);

  const lines: string[] = [];
  lines.push('# MLB Elo backtest (plan #25 Phase 3 게이트, cycle 2128)');
  lines.push('');
  lines.push(`대상 경기: ${games.length}건 (final) / 재생 반영 ${preds.length}건 (skip ${skipped}건 — 올스타/무승부·스코어없음)`);
  lines.push(`WARM cohort (양팀 ${WARM_GAMES_THRESHOLD}+ 경기 재생 후): ${warmPreds.length}건`);
  lines.push('');
  lines.push('## 전체 표본');
  lines.push('');
  lines.push(`- home win rate (실측): ${(homeWinRateAll * 100).toFixed(1)}%`);
  lines.push(`- Elo Brier: ${eloBrierAll.toFixed(4)} (bootstrap 95% CI [${eloCIAll.lo.toFixed(4)}, ${eloCIAll.hi.toFixed(4)}])`);
  lines.push(`- 홈어드밴티지-only Brier (상수 ${homeWinRateAll.toFixed(3)}): ${homeFieldBrierAll.toFixed(4)} (bootstrap 95% CI [${homeFieldCIAll.lo.toFixed(4)}, ${homeFieldCIAll.hi.toFixed(4)}])`);
  lines.push(`- 동전던지기 Brier (0.5 상수): ${coinBrierAll.toFixed(4)}`);
  lines.push(`- Elo accuracy (favorite pick): ${(eloAccAll * 100).toFixed(1)}%`);
  lines.push(`- 홈어드밴티지-only accuracy: ${(homeFieldAccAll * 100).toFixed(1)}%`);
  lines.push('');
  lines.push(`## WARM cohort (양팀 ${WARM_GAMES_THRESHOLD}+ 경기 — cold-start noise 배제)`);
  lines.push('');
  lines.push(`- home win rate (실측): ${(homeWinRateWarm * 100).toFixed(1)}%`);
  lines.push(`- Elo Brier: ${eloBrierWarm.toFixed(4)} (bootstrap 95% CI [${eloCIWarm.lo.toFixed(4)}, ${eloCIWarm.hi.toFixed(4)}])`);
  lines.push(`- 홈어드밴티지-only Brier (상수 ${homeWinRateWarm.toFixed(3)}): ${homeFieldBrierWarm.toFixed(4)} (bootstrap 95% CI [${homeFieldCIWarm.lo.toFixed(4)}, ${homeFieldCIWarm.hi.toFixed(4)}])`);
  lines.push(`- 동전던지기 Brier (0.5 상수): ${coinBrierWarm.toFixed(4)}`);
  lines.push(`- Elo accuracy (favorite pick): ${(eloAccWarm * 100).toFixed(1)}%`);
  lines.push(`- 홈어드밴티지-only accuracy: ${(homeFieldAccWarm * 100).toFixed(1)}%`);
  lines.push('');

  const ciOverlapAll = !(eloCIAll.hi < homeFieldCIAll.lo || homeFieldCIAll.hi < eloCIAll.lo);
  const ciOverlapWarm = !(eloCIWarm.hi < homeFieldCIWarm.lo || homeFieldCIWarm.hi < eloCIWarm.lo);
  lines.push('## 판정 (op-analysis heavy 게이트)');
  lines.push('');
  lines.push(`- 전체 표본: Elo vs 홈어드밴티지-only CI ${ciOverlapAll ? '겹침 (구분 불가)' : '겹치지 않음 (차이 유의미할 가능성)'}`);
  lines.push(`- WARM cohort: Elo vs 홈어드밴티지-only CI ${ciOverlapWarm ? '겹침 (구분 불가)' : '겹치지 않음 (차이 유의미할 가능성)'}`);
  lines.push('');

  const report = lines.join('\n');
  console.log(report);

  if (outPath) {
    writeFileSync(outPath, report + '\n');
    console.log(`\n박제: ${outPath}`);
  }
}

main();
