/**
 * 2023-2025 decided 경기에 대한 제한 모델 백테스트 CLI.
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../packages/kbo-data/src/pipeline/backtest-run.ts
 *
 * 출력: 모델별 Brier / LogLoss / Accuracy + 팀별 홈 승률 요약 + calibration bucket.
 *
 * Look-ahead bias: 없음. Elo 는 경기 날짜 직전, form/h2h 는 시즌 내 이전 경기만.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { KBO_TEAMS } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import {
  loadDecidedGames,
  computeHomeWinRates,
  fetchEloHistory,
  runBacktest,
  modelCoinFlip,
  modelEloHomeAdv,
  makeRestricted,
  teamHomeAdvantagesInEloPt,
  DEFAULT_RESTRICTED,
  HOME_ADV_ELO_DEFAULT,
} from '../backtest';
import type { Model, MetricsSummary } from '../backtest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

function createAdminClient(): DB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 필요');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function pct(x: number): string {
  return (x * 100).toFixed(2) + '%';
}

function fmtMetrics(m: MetricsSummary): string {
  return `Brier ${m.brier.toFixed(4)} · LogLoss ${m.logLoss.toFixed(4)} · Acc ${pct(m.accuracy)} · n=${m.n}`;
}

async function main() {
  console.log('\n=== MoneyBall Backtest — 2023-2025 제한 모델 ===\n');

  // 1. Elo history fetch
  console.log('[1/4] Fancy Stats elohistory 다운로드…');
  const t0 = Date.now();
  const eloHistory = await fetchEloHistory();
  const eloT = Date.now() - t0;
  const teamsWithElo = Array.from(eloHistory.keys()).sort();
  console.log(`  ↳ ${eloT}ms, ${teamsWithElo.length} 팀 시계열 복원`);
  for (const team of teamsWithElo) {
    const series = eloHistory.get(team)!;
    console.log(
      `     ${team.padEnd(3)} n=${String(series.length).padStart(5)}  ${series[0].date} ~ ${series[series.length - 1].date}`,
    );
  }

  // 2. decided games 로드
  console.log('\n[2/4] 2023-2025 decided 경기 로드…');
  const db = createAdminClient();
  const games = await loadDecidedGames(db, { seasons: [2023, 2024, 2025] });
  console.log(`  ↳ ${games.length} 경기`);
  const bySeason: Record<number, number> = {};
  for (const g of games) bySeason[g.season] = (bySeason[g.season] || 0) + 1;
  for (const s of [2023, 2024, 2025]) {
    console.log(`     ${s}: ${bySeason[s] || 0}`);
  }

  // 3. 팀별 홈 승률 (후보 ①용)
  console.log('\n[3/4] 팀별 홈 승률 (3시즌 통합)');
  const homeWinRates = computeHomeWinRates(games);
  const teamRows: Array<{ code: TeamCode; rate: number }> = [];
  for (const code of Object.keys(KBO_TEAMS) as TeamCode[]) {
    const r = homeWinRates[code];
    if (r != null) teamRows.push({ code, rate: r });
  }
  teamRows.sort((a, b) => b.rate - a.rate);
  const leagueHome = teamRows.reduce((a, t) => a + t.rate, 0) / teamRows.length;
  for (const t of teamRows) {
    const delta = t.rate - leagueHome;
    const sign = delta >= 0 ? '+' : '';
    console.log(
      `     ${t.code.padEnd(3)} ${pct(t.rate).padStart(7)}  (리그평균 대비 ${sign}${(delta * 100).toFixed(2)}pp)`,
    );
  }
  console.log(`     --- 리그 홈 평균 ${pct(leagueHome)} ---`);

  const teamHomeAdv = teamHomeAdvantagesInEloPt(homeWinRates);

  // 4. 모델 구성 + 실행
  console.log('\n[4/4] 모델별 백테스트 실행…\n');
  const models: Record<string, Model> = {
    'A. coin_flip': modelCoinFlip,
    'B. elo_only': modelEloHomeAdv,
    'C. restricted_baseline': makeRestricted(DEFAULT_RESTRICTED),
    'D. restricted_team_home_adv': makeRestricted(DEFAULT_RESTRICTED, teamHomeAdv),
    'E. restricted_h2h_off': makeRestricted({ ...DEFAULT_RESTRICTED, kH2h: 0 }),
    'F. restricted_h2h_boost50': makeRestricted({ ...DEFAULT_RESTRICTED, kH2h: 50 }),
  };

  const result = runBacktest({ games, eloHistory, models });
  console.log(`  used ${result.used} / skipped ${result.skipped} (Elo 부재 경기)\n`);

  const names = Object.keys(models).sort();
  const baseline = result.perModel['C. restricted_baseline'];

  console.log('  ┌─────────────────────────────────────────────────────────────┐');
  console.log('  │                    Metrics (낮을수록 좋음 = Brier, LogLoss)  │');
  console.log('  └─────────────────────────────────────────────────────────────┘');
  for (const name of names) {
    const m = result.perModel[name];
    const deltaBrier = m.brier - baseline.brier;
    const mark =
      name === 'C. restricted_baseline'
        ? ''
        : deltaBrier < -0.0001
          ? ` ↓ΔBrier ${deltaBrier.toFixed(4)}`
          : deltaBrier > 0.0001
            ? ` ↑ΔBrier +${deltaBrier.toFixed(4)}`
            : ' ≈';
    console.log(`  ${name.padEnd(28)}  ${fmtMetrics(m)}${mark}`);
  }

  // 5. 후보 ③ h2h sweep (kH2h = 0, 15, 30, 45, 60)
  console.log('\n  --- 후보 ③ h2h kH2h sweep (restricted_baseline 위에서) ---');
  for (const kH2h of [0, 15, 30, 45, 60]) {
    const m = runBacktest({
      games,
      eloHistory,
      models: { x: makeRestricted({ ...DEFAULT_RESTRICTED, kH2h }) },
    }).perModel.x;
    const delta = m.brier - baseline.brier;
    const sign = delta < 0 ? '↓' : delta > 0 ? '↑' : '≈';
    console.log(
      `    kH2h=${String(kH2h).padStart(2)}  ${fmtMetrics(m)}  ΔBrier ${sign}${delta.toFixed(5)}`,
    );
  }

  // 6. Calibration (baseline 위주)
  console.log('\n  --- Calibration: C. restricted_baseline ---');
  console.log('    [prob range]   n    avgP      actualHomeWin');
  for (const b of baseline.calibration) {
    if (b.n === 0) continue;
    console.log(
      `    [${b.lo.toFixed(1)}, ${b.hi.toFixed(1)})  ${String(b.n).padStart(5)}  ${b.avgPredicted.toFixed(3)}  ${b.actualRate.toFixed(3)}`,
    );
  }

  console.log('\n=== 완료 ===\n');
  console.log(`HOME_ADV_ELO_DEFAULT: ${HOME_ADV_ELO_DEFAULT.toFixed(2)} pt (= HOME_ADVANTAGE 0.015)`);
}

main().catch((err) => {
  console.error('BACKTEST FAILED:', err);
  process.exit(1);
});
