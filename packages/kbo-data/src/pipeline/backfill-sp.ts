/**
 * SP 백필 — games.home_sp_id / away_sp_id 채우기.
 *
 * 사용:
 *   tsx backfill-sp.ts 2025-03-22 2025-11-05           # 실행
 *   tsx backfill-sp.ts 2025-03-22 2025-11-05 --dry-run # 시뮬
 *
 * 목적: backfill-season.ts 는 Naver API 에서 homeSP·awaySP 이름을 받지만
 *   players 매칭 없이 NULL 로 저장. 이 스크립트가 후속 작업으로 games 를
 *   탐색해 players.id 로 치환.
 *
 * 매칭 전략 (3단계 fallback — daily.ts getOrCreatePlayerId 패턴):
 *   1) name + 현재 팀 (players.team_id = 경기 팀) — 안전
 *   2) name only — 단, 같은 이름 players row 가 1건일 때만 (동명이인 보호)
 *   3) 자동 생성 — minimal row (name_ko, team_id, league_id, position='P')
 *      이후 kbo-pitcher scraper 실행 시 FIP/xFIP/WAR 자동 채움.
 *
 * Idempotent: home_sp_id IS NULL 이거나 away_sp_id IS NULL 인 row 만 갱신.
 *   재실행 시 이미 채워진 것 건드리지 않음. 세션 내 동일 (name, team) 재요청
 *   은 in-memory cache 로 중복 INSERT 방지.
 *
 * 이적 선수 처리: 시즌 중 트레이드된 투수는 현재 팀 기준 1안 실패 → 2안
 *   fallback. 동명이인이 있으면 같은 이름 여러 team_id 로 새로 생성됨 — 별도
 *   review 에서 player_team_history 테이블 여부 논의 예정.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertSelectOk } from '@moneyball/shared';
import { fetchNaverSchedule } from '../scrapers/naver-schedule';

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
  const result = await db.from('leagues').select('id').eq('code', 'KBO').single();
  const { data } = assertSelectOk<{ id: number }>(result, 'backfill-sp.getKBOLeagueId');
  if (!data) throw new Error('KBO league not found');
  return data.id;
}

async function getTeamIdMap(db: DB, leagueId: number): Promise<Record<string, number>> {
  const result = await db.from('teams').select('id, code').eq('league_id', leagueId);
  const { data } = assertSelectOk<{ id: number; code: string }[]>(result, 'backfill-sp.getTeamIdMap');
  const map: Record<string, number> = {};
  for (const t of data ?? []) map[t.code] = t.id;
  return map;
}

interface PlayerRow {
  id: number;
  name_ko: string;
  team_id: number | null;
}

/** 전체 KBO 투수 로드. position = 'P' or null (KBO 대체로 P). */
async function loadPitchers(db: DB, leagueId: number): Promise<PlayerRow[]> {
  const { data, error } = await db
    .from('players')
    .select('id, name_ko, team_id')
    .eq('league_id', leagueId)
    .in('position', ['P', 'SP', 'RP']);
  if (error) throw error;
  return (data as PlayerRow[]) ?? [];
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, '');
}

interface MatchResult {
  playerId: number | null;
  strategy: 'team' | 'name_only' | 'unmatched';
}

/**
 * 이름 + 팀 → 이름 only → unmatched 3단계 매칭의 read-only 판정부.
 * 실제 INSERT 는 호출자에서 `strategy === 'unmatched'` 일 때 수행.
 */
function matchPitcher(
  name: string,
  teamId: number,
  pitchers: PlayerRow[],
): MatchResult {
  const nName = normalizeName(name);
  const teamMatches = pitchers.filter((p) => normalizeName(p.name_ko) === nName && p.team_id === teamId);
  if (teamMatches.length === 1) return { playerId: teamMatches[0].id, strategy: 'team' };

  const nameMatches = pitchers.filter((p) => normalizeName(p.name_ko) === nName);
  if (nameMatches.length === 1) return { playerId: nameMatches[0].id, strategy: 'name_only' };

  return { playerId: null, strategy: 'unmatched' };
}

/**
 * Auto-create: matchPitcher unmatched 시 minimal row INSERT.
 * (name + team) 기준 in-memory cache 로 세션 내 중복 INSERT 방지.
 * dryRun=true 면 가짜 id 반환.
 */
async function getOrCreatePitcher(
  db: DB,
  leagueId: number,
  name: string,
  teamId: number,
  cache: Map<string, number>,
  pitchers: PlayerRow[],
  dryRun: boolean,
): Promise<number> {
  const key = `${teamId}:${normalizeName(name)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  if (dryRun) {
    const fakeId = -cache.size - 1;
    cache.set(key, fakeId);
    return fakeId;
  }

  const { data: created, error } = await db
    .from('players')
    .insert({ league_id: leagueId, name_ko: name, team_id: teamId, position: 'P' })
    .select('id')
    .single();
  if (error || !created) {
    throw new Error(`Failed to create player ${name} (team ${teamId}): ${error?.message}`);
  }
  cache.set(key, created.id);
  pitchers.push({ id: created.id, name_ko: name, team_id: teamId });
  return created.id;
}

interface GameRow {
  id: number;
  external_game_id: string;
  home_team_id: number;
  away_team_id: number;
  home_sp_id: number | null;
  away_sp_id: number | null;
}

async function loadTargetGames(db: DB, start: string, end: string): Promise<GameRow[]> {
  const { data, error } = await db
    .from('games')
    .select('id, external_game_id, home_team_id, away_team_id, home_sp_id, away_sp_id')
    .gte('game_date', start)
    .lte('game_date', end)
    .or('home_sp_id.is.null,away_sp_id.is.null');
  if (error) throw error;
  return (data as GameRow[]) ?? [];
}

function splitDateRange(start: string, end: string): Array<[string, string]> {
  const chunks: Array<[string, string]> = [];
  const startD = new Date(start + 'T00:00:00Z');
  const endD = new Date(end + 'T00:00:00Z');
  let cur = startD;
  while (cur <= endD) {
    const chunkEnd = new Date(cur);
    if (chunkEnd > endD) chunkEnd.setTime(endD.getTime());
    chunks.push([cur.toISOString().slice(0, 10), chunkEnd.toISOString().slice(0, 10)]);
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
    console.error('Usage: tsx backfill-sp.ts <start-date> <end-date> [--dry-run]');
    console.error('  e.g. tsx backfill-sp.ts 2025-03-22 2025-11-05');
    process.exit(1);
  }

  const db = createAdminClient();
  const leagueId = await getKBOLeagueId(db);
  const teamIdMap = await getTeamIdMap(db, leagueId);
  const pitchers = await loadPitchers(db, leagueId);
  const games = await loadTargetGames(db, startDate, endDate);

  const gameById = new Map<string, GameRow>();
  for (const g of games) gameById.set(g.external_game_id, g);

  console.log(`📅 Range: ${startDate} ~ ${endDate}`);
  console.log(`🏟  Games missing SP: ${games.length}`);
  console.log(`⚾ Pitchers loaded: ${pitchers.length}`);
  if (dryRun) console.log('🔍 DRY RUN — no writes');
  console.log('');

  const createCache = new Map<string, number>();
  const chunks = splitDateRange(startDate, endDate);
  let naverFetched = 0;
  let matchedTeam = 0;
  let matchedName = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const [from, to] of chunks) {
    let naverGames;
    try {
      naverGames = await fetchNaverSchedule(from, to, 'all');
    } catch (err) {
      console.error(`  ❌ ${from} fetch failed:`, err instanceof Error ? err.message : err);
      errors++;
      continue;
    }
    naverFetched += naverGames.length;

    for (const ng of naverGames) {
      const game = gameById.get(ng.externalGameId);
      if (!game) continue;

      const updates: { home_sp_id?: number; away_sp_id?: number } = {};
      const homeTeamId = teamIdMap[ng.homeTeam];
      const awayTeamId = teamIdMap[ng.awayTeam];

      // Home SP
      if (!game.home_sp_id && ng.homeSP && homeTeamId) {
        const m = matchPitcher(ng.homeSP, homeTeamId, pitchers);
        if (m.strategy === 'team') matchedTeam++;
        else if (m.strategy === 'name_only') matchedName++;
        else {
          created++;
          const pid = await getOrCreatePitcher(db, leagueId, ng.homeSP, homeTeamId, createCache, pitchers, dryRun);
          m.playerId = pid;
        }
        if (m.playerId && m.playerId > 0) updates.home_sp_id = m.playerId;
      }

      // Away SP
      if (!game.away_sp_id && ng.awaySP && awayTeamId) {
        const m = matchPitcher(ng.awaySP, awayTeamId, pitchers);
        if (m.strategy === 'team') matchedTeam++;
        else if (m.strategy === 'name_only') matchedName++;
        else {
          created++;
          const pid = await getOrCreatePitcher(db, leagueId, ng.awaySP, awayTeamId, createCache, pitchers, dryRun);
          m.playerId = pid;
        }
        if (m.playerId && m.playerId > 0) updates.away_sp_id = m.playerId;
      }

      if (Object.keys(updates).length > 0) {
        if (!dryRun) {
          const { error } = await db.from('games').update(updates).eq('id', game.id);
          if (error) {
            console.error(`    ❌ game ${game.id}: ${error.message}`);
            errors++;
            continue;
          }
        }
        updated++;
      }
    }

    // Polite delay
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`📊 Naver games fetched: ${naverFetched}`);
  console.log(`   매칭 (팀+이름): ${matchedTeam}`);
  console.log(`   매칭 (이름 only): ${matchedName}`);
  console.log(`   자동 생성:       ${created} (new players: ${createCache.size})`);
  console.log(`   games updated:    ${updated}`);
  console.log(`   errors:           ${errors}`);

  const total = matchedTeam + matchedName + created;
  if (total > 0) {
    console.log(`\nSP 확보율: ${total}/${total} = 100% (auto-create 포함)`);
  }
  if (dryRun) console.log('(dry run — DB unchanged)');
}

main().catch((err) => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});

export { matchPitcher, normalizeName, splitDateRange };
