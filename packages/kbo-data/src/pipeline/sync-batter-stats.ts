import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fetchBatterStats } from '../scrapers/fancy-stats';
import { notifyError } from '../notify/telegram';
import type { BatterStats } from '../types';

// 시즌 중 Fancy Stats /leaders/가 노출하는 최소 타자 수.
// 4 테이블 union 기준 관찰값은 보통 10-20명. 아래로 떨어지면 셀렉터 깨졌을 가능성 강함.
const MIN_EXPECTED_BATTERS = 8;

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
  if (!data) throw new Error('KBO league not found in DB');
  return data.id;
}

async function getTeamIdMap(db: DB, leagueId: number): Promise<Record<string, number>> {
  const { data } = await db.from('teams').select('id, code').eq('league_id', leagueId);
  if (!data) return {};
  const map: Record<string, number> = {};
  for (const t of data) map[t.code] = t.id;
  return map;
}

async function upsertPlayerId(
  db: DB,
  leagueId: number,
  name: string,
  teamId: number,
  position: string | null,
): Promise<number | null> {
  // 같은 league_id + name_ko + team_id로 기존 player 조회
  const { data: existing } = await db
    .from('players')
    .select('id, position')
    .eq('league_id', leagueId)
    .eq('name_ko', name)
    .eq('team_id', teamId)
    .maybeSingle();

  if (existing) {
    // position 비어 있으면 업데이트
    if (!existing.position && position) {
      await db.from('players').update({ position }).eq('id', existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await db
    .from('players')
    .insert({
      league_id: leagueId,
      name_ko: name,
      team_id: teamId,
      position: position ?? 'B',
    })
    .select('id')
    .single();

  if (error) {
    console.warn(`[sync-batter] failed to insert player ${name}: ${error.message}`);
    return null;
  }
  return created?.id ?? null;
}

export interface SyncBatterStatsResult {
  season: number;
  fetched: number;
  upsertedPlayers: number;
  upsertedStats: number;
  errors: string[];
  warnings: string[];
  durationMs: number;
}

/**
 * Fancy Stats /leaders/ → batter_stats 테이블 적재.
 *
 * - `players` 테이블에 없는 선수는 새로 insert (position 채움)
 * - `batter_stats`는 (player_id, season) unique → upsert
 */
export async function syncBatterStats(
  season: number = new Date().getFullYear(),
): Promise<SyncBatterStatsResult> {
  const startedAt = Date.now();
  const db = createAdminClient();
  const errors: string[] = [];
  const warnings: string[] = [];
  let upsertedPlayers = 0;
  let upsertedStats = 0;

  const batters: BatterStats[] = await fetchBatterStats(season);

  if (batters.length === 0) {
    const msg =
      'fetchBatterStats returned 0 rows — Fancy Stats /leaders/ 셀렉터 드리프트 의심';
    try {
      await notifyError('sync-batter-stats', msg);
    } catch {
      // 알림 실패는 치명적이지 않음
    }
    return {
      season,
      fetched: 0,
      upsertedPlayers: 0,
      upsertedStats: 0,
      errors: [msg],
      warnings: [],
      durationMs: Date.now() - startedAt,
    };
  }

  if (batters.length < MIN_EXPECTED_BATTERS) {
    const warn = `fetched ${batters.length} 명 (기대치 ${MIN_EXPECTED_BATTERS}+). 부분적 셀렉터 실패 가능성.`;
    warnings.push(warn);
    try {
      await notifyError('sync-batter-stats WARNING', warn);
    } catch {}
  }

  const leagueId = await getKBOLeagueId(db);
  const teamIdMap = await getTeamIdMap(db, leagueId);

  for (const b of batters) {
    const teamId = teamIdMap[b.team];
    if (!teamId) {
      errors.push(`team ${b.team} not found for ${b.name}`);
      continue;
    }

    const playerId = await upsertPlayerId(
      db,
      leagueId,
      b.name,
      teamId,
      b.position,
    );
    if (!playerId) {
      errors.push(`player upsert failed: ${b.name}`);
      continue;
    }
    upsertedPlayers += 1;

    const { error: statErr } = await db
      .from('batter_stats')
      .upsert(
        {
          player_id: playerId,
          season,
          war: b.war,
          // migration 001: wrc_plus INT. Fancy Stats는 소수점(178.2) 반환하므로 반올림.
          wrc_plus: b.wrcPlus > 0 ? Math.round(b.wrcPlus) : null,
          ops: b.ops,
          last_synced: new Date().toISOString(),
        },
        { onConflict: 'player_id,season' },
      );

    if (statErr) {
      errors.push(`stat upsert failed for ${b.name}: ${statErr.message}`);
    } else {
      upsertedStats += 1;
    }
  }

  // upsertedStats=0인데 fetched>0이면 전부 DB 실패 → 심각한 상황
  if (upsertedStats === 0 && batters.length > 0) {
    const msg = `fetched ${batters.length}건인데 DB upsert 전부 실패. errors: ${errors.slice(0, 3).join(' | ')}`;
    try {
      await notifyError('sync-batter-stats CRITICAL', msg);
    } catch {}
  }

  return {
    season,
    fetched: batters.length,
    upsertedPlayers,
    upsertedStats,
    errors,
    warnings,
    durationMs: Date.now() - startedAt,
  };
}
