/**
 * Backfill — KBO games.status 영구 'scheduled' 고착 재검증 (cycle 2184 fix-incident, 사례 33).
 *
 * 배경:
 *   사례 32 (cycle 2179) 는 daily.ts verify 모드가 그날 games 중 하나라도
 *   final/postponed 로 안 넘어갔을 때도 results_sent flag 를 영구 세우던 버그를
 *   고쳤다 (2026-08-05~08-09 window 만 backfill). 하지만 verify 모드는 항상
 *   "어제" 단 하루만 재검증하고 이전 날짜로 돌아가지 않는 구조라 — (1) 그 fix
 *   이전에 이미 results_sent=true 로 영구 봉인된 과거 날짜들과 (2) fix 이후에도
 *   여전히 안 sealed 인 채로 재시도 기회가 없는 날짜들 — 양쪽 다 games.status
 *   가 'scheduled' 로 영구 고착된 채 남아있음이 cycle 2184 health-check 로 발견
 *   (2026-04-14 ~ 2026-08-04, 9개 날짜 24경기).
 *
 *   본 스크립트는 daily_notifications flag 를 건드리지 않고 (Telegram 알림
 *   재전송 방지, 순수 데이터 정합성 fix) games/predictions 만 재검증한다.
 *
 * 사용:
 *   cd apps/moneyball && set -a && source .env.local && set +a
 *   pnpm exec tsx ../../scripts/backfill-kbo-stuck-verify.ts          # 진단
 *   pnpm exec tsx ../../scripts/backfill-kbo-stuck-verify.ts --apply  # 적용
 */

import { createClient } from '@supabase/supabase-js';
import {
  fetchGames,
  computeWinnerTeamId,
  buildAccuracyUpdates,
  DB_CONSTRAINTS,
} from '@moneyball/kbo-data';
import { PRODUCTION_COHORT_RULES } from '@moneyball/shared';

const APPLY = process.argv.includes('--apply');
const RATE_LIMIT_MS = 2000;
const STALE_DAYS = 2;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }
  const sb = createClient(url, key);

  const staleThreshold = new Date(Date.now() - STALE_DAYS * 24 * 3600_000)
    .toISOString().slice(0, 10);

  const { data: rows, error } = await sb
    .from('games')
    .select('game_date')
    .eq('status', 'scheduled')
    .lt('game_date', staleThreshold);

  if (error) {
    console.error('games select failed:', error.message);
    process.exit(1);
  }

  const dates = Array.from(new Set((rows ?? []).map((r) => r.game_date as string))).sort();

  console.log(`대상 날짜 ${dates.length}건 (status='scheduled', game_date < ${staleThreshold})`);
  if (dates.length === 0) {
    console.log('backfill 대상 없음 — 종료');
    return;
  }
  console.log(dates);

  if (!APPLY) {
    console.log('진단 모드 — --apply 플래그로 재실행하면 실제 재검증 수행');
    return;
  }

  const { data: league, error: leagueErr } = await sb
    .from('leagues').select('id').eq('code', 'KBO').single();
  if (leagueErr || !league) {
    console.error('KBO league lookup failed:', leagueErr?.message);
    process.exit(1);
  }
  const leagueId = league.id as number;

  const { data: teams, error: teamsErr } = await sb
    .from('teams').select('id, code').eq('league_id', leagueId);
  if (teamsErr || !teams) {
    console.error('teams lookup failed:', teamsErr?.message);
    process.exit(1);
  }
  const teamIdMap: Record<string, number> = {};
  for (const t of teams as Array<{ id: number; code: string }>) teamIdMap[t.code] = t.id;

  let totalGamesUpdated = 0;
  let totalAccuracyUpdated = 0;
  let totalErrors = 0;

  for (const date of dates) {
    try {
      const scraped = await fetchGames(date);
      const gamesPayload = scraped
        .map((g) => {
          const homeTeamId = teamIdMap[g.homeTeam];
          const awayTeamId = teamIdMap[g.awayTeam];
          if (!homeTeamId || !awayTeamId) return null;
          return {
            league_id: leagueId, game_date: g.date, game_time: g.gameTime,
            home_team_id: homeTeamId, away_team_id: awayTeamId,
            stadium: g.stadium, status: g.status,
            home_score: g.homeScore ?? null, away_score: g.awayScore ?? null,
            winner_team_id: computeWinnerTeamId(
              g.status, g.homeScore, g.awayScore, homeTeamId, awayTeamId,
            ),
            external_game_id: g.externalGameId,
            game_datetime_utc: new Date(`${g.date}T${g.gameTime}:00+09:00`).toISOString(),
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (gamesPayload.length === 0) {
        console.log(`  ${date}: KBO API 응답 0건 (fetchGames) — skip`);
        await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
        continue;
      }

      const { data: upserted, error: upsertErr } = await sb
        .from('games')
        .upsert(gamesPayload, { onConflict: DB_CONSTRAINTS.games })
        .select('id, status, winner_team_id');

      if (upsertErr) {
        console.error(`  ${date}: games upsert failed: ${upsertErr.message}`);
        totalErrors += 1;
        await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
        continue;
      }

      const finalGames = (upserted ?? [])
        .filter((g: { status: string; winner_team_id: number | null }) =>
          g.status === 'final' && g.winner_team_id != null)
        .map((g: { id: number; winner_team_id: number }) => ({ id: g.id, winner_team_id: g.winner_team_id }));

      totalGamesUpdated += upserted?.length ?? 0;

      if (finalGames.length === 0) {
        console.log(`  ${date}: games upsert=${upserted?.length ?? 0}, final=0 (여전히 미종결 또는 postponed)`);
        await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
        continue;
      }

      const { data: predRows, error: predErr } = await sb
        .from('predictions')
        .select('id, game_id, predicted_winner')
        .eq('prediction_type', 'pre_game')
        .in('scoring_rule', PRODUCTION_COHORT_RULES)
        .in('game_id', finalGames.map((g) => g.id));

      if (predErr) {
        console.error(`  ${date}: predictions select failed: ${predErr.message}`);
        totalErrors += 1;
        await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
        continue;
      }

      const predByGameId = new Map<number, { id: number; predicted_winner: number }>();
      for (const row of (predRows ?? []) as Array<{ id: number; game_id: number; predicted_winner: number }>) {
        predByGameId.set(row.game_id, { id: row.id, predicted_winner: row.predicted_winner });
      }

      const updates = buildAccuracyUpdates(finalGames, predByGameId, new Date().toISOString());
      const results = await Promise.all(
        updates.map(({ predId, payload }) =>
          sb.from('predictions').update(payload).eq('id', predId)
            .then((res: { error: { message: string } | null }) => ({ predId, error: res.error })),
        ),
      );
      let accuracyErrors = 0;
      for (const { predId, error: updErr } of results) {
        if (updErr) {
          console.error(`  ${date}: prediction id=${predId} update failed: ${updErr.message}`);
          accuracyErrors += 1;
        }
      }
      totalAccuracyUpdated += updates.length - accuracyErrors;
      totalErrors += accuracyErrors;

      console.log(`  ${date}: games upsert=${upserted?.length ?? 0}, final=${finalGames.length}, accuracy updated=${updates.length - accuracyErrors}`);
    } catch (e) {
      totalErrors += 1;
      console.error(`  ${date}: threw`, e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }

  const { count: stillStuck } = await sb
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'scheduled')
    .lt('game_date', staleThreshold);

  console.log(`완료 — 처리 날짜 ${dates.length}건 / games upsert 합계 ${totalGamesUpdated} / accuracy 갱신 ${totalAccuracyUpdated} / errors ${totalErrors}`);
  console.log(`재검증: 여전히 stuck (status='scheduled', game_date < ${staleThreshold}) count = ${stillStuck}`);
}

main();
