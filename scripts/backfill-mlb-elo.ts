/**
 * Backfill — mlb_team_elo 초기 rating 도출 (plan #25 Phase 1, cycle 2080).
 *
 * 배경:
 *   MLB 는 팀별 Elo rating 을 계산/저장한 적이 없음(mlb-pipeline.ts 가 모든 예측에
 *   ELO_NEUTRAL 고정값 사용, plan #24 Phase 2b BLOCKED). 신규 K-factor 엔진
 *   (packages/kbo-data/src/factors/mlb-elo.ts, MLB_ELO_K=4)을 시즌 시작부터 현재까지
 *   완료된(mlb_schedule.status='final') 경기에 순차 재생해 현재 rating 을 1회성 도출.
 *
 *   Phase 1 스코프 — 여기서 만든 rating 은 UI 표시(Phase 2 matchup Elo 추이 차트)용.
 *   예측 win_prob 반영(Phase 3)은 op-analysis heavy backtest 게이트 통과 전까지 보류
 *   (mlb-pipeline.ts 의 ELO_NEUTRAL placeholder 는 이 스크립트로 변경되지 않음).
 *
 * 사용:
 *   cd apps/moneyball && set -a && source .env.local && set +a
 *   pnpm exec tsx ../../scripts/backfill-mlb-elo.ts          # 진단 (rating 미리보기만)
 *   pnpm exec tsx ../../scripts/backfill-mlb-elo.ts --apply  # mlb_team_elo upsert
 */

import { createClient } from '@supabase/supabase-js';
import { computeMlbEloRatings, DB_CONSTRAINTS } from '@moneyball/kbo-data';

const APPLY = process.argv.includes('--apply');

interface FinalGameRow {
  external_game_id: string;
  game_date: string;
  game_datetime_utc: string;
  home_team_code: string;
  away_team_code: string;
  home_score: number;
  away_score: number;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }
  const sb = createClient(url, key);

  const { data: rows, error } = await sb
    .from('mlb_schedule')
    .select('external_game_id, game_date, game_datetime_utc, home_team_code, away_team_code, home_score, away_score')
    .eq('status', 'final')
    .order('game_datetime_utc', { ascending: true });

  if (error) {
    console.error('mlb_schedule select failed:', error.message);
    process.exit(1);
  }

  const games = (rows ?? []) as FinalGameRow[];
  console.log(`대상 경기 ${games.length}건 (status='final', game_datetime_utc 순 재생)`);
  if (games.length === 0) {
    console.log('재생 대상 없음 — 종료');
    return;
  }

  const states = computeMlbEloRatings(games);
  const gamesApplied = Array.from(states.values()).reduce((sum, s) => sum + s.gamesPlayed, 0) / 2;
  const skipped = games.length - gamesApplied;

  const ranked = Array.from(states.entries()).sort((a, b) => b[1].eloRating - a[1].eloRating);
  console.log(`재생 완료 — 경기 ${gamesApplied}건 반영 (skip ${skipped}건, 무승부/스코어 없음)`);
  console.log('현재 rating (내림차순):');
  for (const [team, s] of ranked) {
    console.log(`  ${team.padEnd(4)} ${s.eloRating.toFixed(2).padStart(8)}  (${s.gamesPlayed} games)`);
  }

  if (!APPLY) {
    console.log('진단 모드 — --apply 플래그로 재실행하면 mlb_team_elo 에 upsert');
    return;
  }

  const now = new Date().toISOString();
  const upsertRows = Array.from(states.entries()).map(([team_code, s]) => ({
    team_code,
    season: s.season,
    elo_rating: s.eloRating,
    games_played: s.gamesPlayed,
    updated_at: now,
  }));

  const { error: uErr } = await sb
    .from('mlb_team_elo')
    .upsert(upsertRows, { onConflict: DB_CONSTRAINTS.mlbTeamElo });

  if (uErr) {
    console.error('mlb_team_elo upsert failed:', uErr.message);
    process.exit(1);
  }

  console.log(`mlb_team_elo upsert 완료 — ${upsertRows.length}팀`);
}

main();
