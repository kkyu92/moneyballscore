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
  formatBacktestMarkdown,
  type BacktestPredictionRow,
  type TeamEloMap,
} from '@moneyball/kbo-data/src/backtest/backtest-v2-helpers';
import {
  expandingWindowSplit,
  rollingTimeCV,
  type CvPattern,
} from '@moneyball/kbo-data/src/backtest/walk-forward-helpers';
import { fetchEloRatings } from '@moneyball/kbo-data/src/scrapers/fancy-stats';

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

/** plan #15 C1e — --cv-pattern flag parser. default walk-forward (기존 cycle 1019 pattern). */
function parseCvPattern(): CvPattern {
  const flag = process.argv.find((a) => a.startsWith('--cv-pattern='));
  if (!flag) return 'walk-forward';
  const value = flag.split('=')[1];
  if (value === 'walk-forward' || value === 'expanding' || value === 'rolling') return value;
  throw new Error(`invalid --cv-pattern=${value}. allowed: walk-forward | expanding | rolling`);
}

async function main() {
  const writeMode = process.argv.includes('--write');
  const cvPattern = parseCvPattern();
  console.log(`[backtest-v2-candidate] mode=${writeMode ? 'write' : 'dry-run'} cv-pattern=${cvPattern}`);

  const db = createAdminClient();

  // plan #15 C1e — cohort 구성 (cv-pattern 별 분기)
  let cohort: BacktestPredictionRow[];
  let cohortNote: string;
  if (cvPattern === 'expanding') {
    // expanding window OOS: train=옛 scoring_rule (v1.5/v1.6/v1.7-revert) + test=v1.8
    const v18 = await fetchV18Cohort(db);
    const train = await fetchTrainCohort(db, ['v1.5', 'v1.6', 'v1.7-revert']);
    const split = expandingWindowSplit([...train, ...v18], ['v1.5', 'v1.6', 'v1.7-revert'], ['v1.8']);
    cohort = split.test; // production OOS evidence = test set 만 evaluate
    cohortNote = `expanding window: train=${split.train.length} (v1.5/v1.6/v1.7-revert) / test=${split.test.length} (v1.8 OOS)`;
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

if (require.main === module) {
  main().catch((e) => {
    console.error('[backtest-v2-candidate] fatal:', e);
    process.exit(1);
  });
}
