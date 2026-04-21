/**
 * 시즌 전체 games 백필 — Naver API 기반.
 *
 * 사용:
 *   tsx backfill-season.ts 2025-03-22 2025-11-05          # 실행
 *   tsx backfill-season.ts 2025-03-22 2025-11-05 --dry-run
 *
 * 목적: 과거 시즌 (예: 2025) 경기 전량을 games 테이블에 적재. 이후 weather
 *   backfill 과 factor 상관 분석에 사용.
 *
 * 저장 필드:
 *   - game_date, game_time, stadium
 *   - home_team_id, away_team_id (teams.code → id 조회)
 *   - home_score, away_score, winner_team_id (final only)
 *   - status ('scheduled' | 'final' | 'postponed' | 'live')
 *   - is_canceled (postponed 와 동일 의미, 하위 호환)
 *   - external_game_id (Naver gameId 13자리 정규화)
 *
 * 비저장 (후속 과제):
 *   - home_sp_id / away_sp_id  — Naver 는 SP 이름만 주고 player 테이블 매칭
 *     별도 작업 필요. 지금은 NULL 유지.
 *   - predictions           — 과거 경기는 예측 대상 아님 (factor 상관 분석용).
 *   - weather                — backfill-weather.ts 로 별도 실행.
 *
 * Idempotent: UPSERT on (league_id, external_game_id). 재실행 시 최신 값
 *   덮어쓰기 — 스케줄 변경·취소 반영.
 *
 * 일 단위 chunk: Naver API 는 단일 호출 최대 10건 반환 cap. KBO 하루 최대
 *   5경기 이므로 1일씩 fetch 가 안전. 228일 ≈ 2분 (250ms delay).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fetchNaverSchedule } from '../scrapers/naver-schedule';
import type { TeamCode } from '@moneyball/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

function createAdminClient(): DB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getKBOLeagueId(db: DB): Promise<number> {
  const { data } = await db.from('leagues').select('id').eq('code', 'KBO').single();
  if (!data) throw new Error('KBO league not found');
  return data.id;
}

async function getTeamIdMap(db: DB, leagueId: number): Promise<Record<string, number>> {
  const { data } = await db.from('teams').select('id, code').eq('league_id', leagueId);
  const map: Record<string, number> = {};
  for (const t of data ?? []) map[t.code] = t.id;
  return map;
}

/** 날짜 범위를 N일 chunks 로 split. Naver API 10건 cap 때문에 chunkDays=1 권장. */
function splitDateRange(start: string, end: string, chunkDays = 1): Array<[string, string]> {
  const chunks: Array<[string, string]> = [];
  const startD = new Date(start + 'T00:00:00Z');
  const endD = new Date(end + 'T00:00:00Z');
  let cur = startD;
  while (cur <= endD) {
    const chunkEnd = new Date(cur);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + chunkDays - 1);
    if (chunkEnd > endD) chunkEnd.setTime(endD.getTime());
    chunks.push([
      cur.toISOString().slice(0, 10),
      chunkEnd.toISOString().slice(0, 10),
    ]);
    cur = new Date(chunkEnd);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return chunks;
}

async function main() {
  const args = process.argv.slice(2);
  const startDate = args[0];
  const endDate = args[1];
  const dryRun = args.includes('--dry-run');

  if (!startDate || !endDate) {
    console.error('Usage: tsx backfill-season.ts <start-date> <end-date> [--dry-run]');
    console.error('  e.g. tsx backfill-season.ts 2025-03-22 2025-11-05');
    process.exit(1);
  }

  const db = createAdminClient();
  const leagueId = await getKBOLeagueId(db);
  const teamIdMap = await getTeamIdMap(db, leagueId);

  console.log(`📅 Range: ${startDate} ~ ${endDate}`);
  console.log(`🏟  KBO league id: ${leagueId}, teams: ${Object.keys(teamIdMap).length}`);
  if (dryRun) console.log('🔍 DRY RUN — no writes');

  const chunks = splitDateRange(startDate, endDate, 1);
  console.log(`📦 Fetching ${chunks.length} days (Naver API 10-game cap → day-by-day)`);
  console.log('');

  let totalFetched = 0;
  let totalUpserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const [from, to] of chunks) {
    let games;
    try {
      games = await fetchNaverSchedule(from, to, 'all');
    } catch (err) {
      console.error(`  ❌ ${from}~${to} fetch failed:`, err instanceof Error ? err.message : err);
      errors++;
      continue;
    }

    if (games.length > 0) {
      console.log(`  📥 ${from}: ${games.length} games`);
    }
    totalFetched += games.length;

    for (const g of games) {
      const homeId = teamIdMap[g.homeTeam];
      const awayId = teamIdMap[g.awayTeam];
      if (!homeId || !awayId) {
        skipped++;
        continue;
      }

      // winner_team_id — status=final + 점수 있을 때만. DRAW 는 null.
      let winnerTeamId: number | null = null;
      if (
        g.status === 'final' &&
        typeof g.homeScore === 'number' &&
        typeof g.awayScore === 'number'
      ) {
        if (g.homeScore > g.awayScore) winnerTeamId = homeId;
        else if (g.awayScore > g.homeScore) winnerTeamId = awayId;
        // tie → null
      }

      const payload = {
        league_id: leagueId,
        game_date: g.date,
        game_time: g.gameTime,
        home_team_id: homeId,
        away_team_id: awayId,
        stadium: g.stadium || null,
        status: g.status,
        home_score: g.homeScore ?? null,
        away_score: g.awayScore ?? null,
        winner_team_id: winnerTeamId,
        is_canceled: g.status === 'postponed',
        external_game_id: g.externalGameId,
      };

      if (!dryRun) {
        const { error } = await db
          .from('games')
          .upsert(payload, { onConflict: 'league_id,external_game_id' });
        if (error) {
          console.error(`    ❌ ${g.date} ${g.awayTeam}@${g.homeTeam}: ${error.message}`);
          errors++;
          continue;
        }
      }
      totalUpserted++;
    }

    // Polite delay between day calls.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log('');
  console.log(`📊 Fetched: ${totalFetched} · Upserted: ${totalUpserted} · Skipped: ${skipped} · Errors: ${errors}`);
  if (dryRun) console.log('(dry run — DB unchanged)');
}

main().catch((err) => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});

// Utility re-export for tests.
export { splitDateRange };
