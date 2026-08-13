/**
 * Backfill — MLB predictions 팩터 breakdown 컬럼 (cycle 2065 fix-incident, 사례 21).
 *
 * 배경:
 *   mlb-pipeline.ts runPredictFinal 이 computeMlbProbability 입력으로 mlb_team_stats
 *   실측(fip/xfip/woba/war/xwoba/barrel_pct)을 계산에만 쓰고 predictions breakdown
 *   컬럼(home_sp_fip 등)에 저장하지 않았음 — DB 실측 확인 시 전량(0/755) NULL.
 *   결과: buildMlbTeamFactorAverages(Phase 2a, /mlb/matchup 팩터 비교 섹션)가
 *   항상 빈 값("-" vs "-") 표시. 코드 fix(mlb-pipeline.ts)는 향후 predict_final
 *   실행분만 채움 — 기존 755건은 본 스크립트로 backfill.
 *
 *   mlb_team_stats 는 시즌 누적 스냅샷 1건/팀(point-in-time 기록 X) — 과거 경기에
 *   현재 시즌 평균을 근사값으로 적용(근사 정확도 trade-off, KBO 팩터 평균과 동일
 *   설계 원칙 — 시즌 평균 자체가 목적이라 시점별 세밀도 요구 X).
 *
 * 사용:
 *   cd apps/moneyball && set -a && source .env.local && set +a
 *   pnpm exec tsx ../../scripts/backfill-mlb-factor-breakdown.ts          # 진단
 *   pnpm exec tsx ../../scripts/backfill-mlb-factor-breakdown.ts --apply  # 적용
 */

import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

interface MlbTeamStatsRow {
  team_code: string;
  woba: number | null;
  fip: number | null;
  xfip: number | null;
  war: number | null;
  xwoba: number | null;
  barrel_pct: number | null;
}

interface PredictionRow {
  id: number;
  external_game_id: string | null;
}

interface ScheduleRow {
  external_game_id: string;
  home_team_code: string;
  away_team_code: string;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }
  const sb = createClient(url, key);

  const { data: predRows, error: predErr } = await sb
    .from('predictions')
    .select('id, external_game_id')
    .eq('league', 'mlb')
    .eq('scoring_rule', 'mlb_v0.1')
    .is('home_sp_fip', null)
    .not('external_game_id', 'is', null);
  if (predErr) { console.error('predictions query error:', predErr.message); process.exit(1); }

  console.log(`predictions rows with NULL home_sp_fip: ${predRows?.length ?? 0}`);
  if (!predRows?.length) { console.log('nothing to backfill'); return; }

  // .in() 리스트가 커지면(700+) PostgREST가 에러 없이 일부만 반환하는 현상 실측 확인
  // (cycle 2065) — 100개씩 배치 조회로 회피.
  const externalIds = (predRows as PredictionRow[]).map((r) => r.external_game_id!);
  const scheduleByExternalId = new Map<string, ScheduleRow>();
  const LOOKUP_BATCH = 100;
  for (let i = 0; i < externalIds.length; i += LOOKUP_BATCH) {
    const batchIds = externalIds.slice(i, i + LOOKUP_BATCH);
    const { data: scheduleRows, error: schedErr } = await sb
      .from('mlb_schedule')
      .select('external_game_id, home_team_code, away_team_code')
      .in('external_game_id', batchIds);
    if (schedErr) { console.error('mlb_schedule query error:', schedErr.message); process.exit(1); }
    for (const s of (scheduleRows ?? []) as ScheduleRow[]) {
      scheduleByExternalId.set(s.external_game_id, s);
    }
  }
  console.log(`mlb_schedule matched: ${scheduleByExternalId.size}/${externalIds.length}`);

  const { data: statsRows, error: statsErr } = await sb
    .from('mlb_team_stats')
    .select('team_code, woba, fip, xfip, war, xwoba, barrel_pct');
  if (statsErr) { console.error('mlb_team_stats query error:', statsErr.message); process.exit(1); }

  const statsByTeam = new Map<string, MlbTeamStatsRow>();
  for (const s of (statsRows ?? []) as MlbTeamStatsRow[]) {
    statsByTeam.set(s.team_code, s);
  }
  console.log(`mlb_team_stats teams available: ${statsByTeam.size}/30`);

  const updates: Array<{ id: number; patch: Record<string, number | null> }> = [];
  let missingSchedule = 0;
  let missingBothStats = 0;

  for (const row of predRows as PredictionRow[]) {
    const sched = scheduleByExternalId.get(row.external_game_id!);
    if (!sched) { missingSchedule++; continue; }
    const home = statsByTeam.get(sched.home_team_code);
    const away = statsByTeam.get(sched.away_team_code);
    if (!home && !away) { missingBothStats++; continue; }
    updates.push({
      id: row.id,
      patch: {
        home_sp_fip: home?.fip ?? null,
        away_sp_fip: away?.fip ?? null,
        home_sp_xfip: home?.xfip ?? null,
        away_sp_xfip: away?.xfip ?? null,
        home_lineup_woba: home?.woba ?? null,
        away_lineup_woba: away?.woba ?? null,
        home_bullpen_fip: home?.fip ?? null,
        away_bullpen_fip: away?.fip ?? null,
        home_war_total: home?.war ?? null,
        away_war_total: away?.war ?? null,
        home_lineup_xwoba: home?.xwoba ?? null,
        away_lineup_xwoba: away?.xwoba ?? null,
        home_lineup_barrel_pct: home?.barrel_pct ?? null,
        away_lineup_barrel_pct: away?.barrel_pct ?? null,
      },
    });
  }

  console.log(`candidates to update: ${updates.length}`);
  console.log(`skipped (no mlb_schedule match): ${missingSchedule}`);
  console.log(`skipped (no stats for either team): ${missingBothStats}`);
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  if (updates.length === 0) { console.log('nothing to update'); return; }

  console.log('\nsample (first 3):');
  for (const u of updates.slice(0, 3)) {
    console.log(`  id=${u.id} home_sp_fip=${u.patch.home_sp_fip} away_sp_fip=${u.patch.away_sp_fip}`);
  }

  if (!APPLY) {
    console.log('\nDRY-RUN: pass --apply to execute');
    return;
  }

  let updated = 0;
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    for (const u of batch) {
      const { error: upErr } = await sb.from('predictions').update(u.patch).eq('id', u.id);
      if (upErr) {
        console.error(`  update failed id=${u.id}: ${upErr.message}`);
      } else {
        updated++;
      }
    }
    console.log(`  progress: ${Math.min(i + BATCH, updates.length)} / ${updates.length}`);
  }

  console.log(`\nbackfill complete: ${updated} rows updated`);
}

main().catch((e) => { console.error(e); process.exit(1); });
