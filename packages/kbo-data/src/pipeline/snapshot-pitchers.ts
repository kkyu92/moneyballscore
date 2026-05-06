/**
 * 투수 스탯 주간 snapshot — pitcher_stats 테이블에 시점별 누적.
 *
 * 사용 (library):
 *   import { snapshotPitcherStats } from '@moneyball/kbo-data';
 *   const result = await snapshotPitcherStats({ season: 2026 });
 *
 * 사용 (CLI):
 *   tsx snapshot-pitchers.ts            # 오늘 날짜 (CURRENT_DATE) 로 upsert
 *   tsx snapshot-pitchers.ts --dry-run  # 시뮬
 *
 * 소스: fetchPitcherStats (Fancy Stats + KBO 공식 merge, 인메모리 로직 그대로).
 *
 * 매칭: PitcherStats (name + TeamCode) → players (name_ko + team_id).
 *   - 정확 일치 1건 → upsert
 *   - 미매칭 → unmatched 카운트. 경기 진행되며 자동 생성되므로 시간이 지나면 매칭됨.
 *
 * Idempotent: (player_id, season, captured_at) unique. 같은 날 재실행 시 덮어씀.
 *
 * Cron: .github/workflows/pitcher-snapshot.yml — 주간 일요일 KST 00시.
 *   월 ~4 snapshot, 시즌 말까지 ~30 snapshot 누적. factor-correlation 시점별
 *   분석 + v2.0 튜닝 재료.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertSelectOk, assertWriteOk, type TeamCode } from '@moneyball/shared';
import { fetchPitcherStats } from '../scrapers/fancy-stats';
import type { PitcherStats } from '../types';

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
  const { data } = assertSelectOk<{ id: number }>(result, 'snapshot-pitchers.getKBOLeagueId');
  if (!data) throw new Error('KBO league not found');
  return data.id;
}

async function getTeamIdMap(db: DB, leagueId: number): Promise<Record<string, number>> {
  const result = await db.from('teams').select('id, code').eq('league_id', leagueId);
  const { data } = assertSelectOk<{ id: number; code: string }[]>(result, 'snapshot-pitchers.getTeamIdMap');
  const map: Record<string, number> = {};
  for (const t of data ?? []) map[t.code] = t.id;
  return map;
}

interface PlayerRow { id: number; name_ko: string; team_id: number | null }

async function loadPitchers(db: DB, leagueId: number): Promise<PlayerRow[]> {
  const { data, error } = await db
    .from('players')
    .select('id, name_ko, team_id')
    .eq('league_id', leagueId)
    .eq('position', 'P');
  if (error) throw error;
  return (data as PlayerRow[]) ?? [];
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, '');
}

interface MatchResult { playerId: number | null; reason: 'match' | 'team_miss' | 'name_miss' }

function matchPitcher(name: string, teamCode: TeamCode, teamIdMap: Record<string, number>, pitchers: PlayerRow[]): MatchResult {
  const nName = normalizeName(name);
  const teamId = teamIdMap[teamCode];
  if (!teamId) return { playerId: null, reason: 'team_miss' };
  const teamMatches = pitchers.filter((p) => normalizeName(p.name_ko) === nName && p.team_id === teamId);
  if (teamMatches.length === 1) return { playerId: teamMatches[0].id, reason: 'match' };
  const nameMatches = pitchers.filter((p) => normalizeName(p.name_ko) === nName);
  if (nameMatches.length === 1) return { playerId: nameMatches[0].id, reason: 'match' };
  return { playerId: null, reason: 'name_miss' };
}

/**
 * fetchPitcherStats 결과에 _source 태그 부여.
 * fetchPitcherStats 는 Fancy Stats (top 50, WAR·xFIP 있음) + KBO Basic1 (28명, WAR=0)
 * 을 merged 반환. WAR > 0 또는 xFIP ≠ FIP 면 fancy-stats, 아니면 kbo-basic1 로 분류.
 */
function tagSource(stats: PitcherStats[]): Array<PitcherStats & { _source: 'fancy-stats' | 'kbo-basic1' }> {
  return stats.map((p) => ({
    ...p,
    _source: (p.war > 0 || p.xfip !== p.fip) ? 'fancy-stats' : 'kbo-basic1',
  }));
}

export interface SnapshotOptions {
  season?: number;
  capturedAt?: string;  // YYYY-MM-DD, 기본: 오늘
  dryRun?: boolean;
}

export interface SnapshotResult {
  season: number;
  capturedAt: string;
  fetched: number;
  matched: number;
  upserted: number;
  unmatched: number;
  errors: number;
  bySource: { 'fancy-stats': number; 'kbo-basic1': number };
}

export async function snapshotPitcherStats(opts: SnapshotOptions = {}): Promise<SnapshotResult> {
  const season = opts.season ?? new Date().getFullYear();
  const capturedAt = opts.capturedAt ?? new Date().toISOString().slice(0, 10);
  const dryRun = opts.dryRun ?? false;

  const db = createAdminClient();
  const leagueId = await getKBOLeagueId(db);
  const teamIdMap = await getTeamIdMap(db, leagueId);
  const pitchers = await loadPitchers(db, leagueId);

  const rawStats = await fetchPitcherStats(season);
  const stats = tagSource(rawStats);

  const result: SnapshotResult = {
    season,
    capturedAt,
    fetched: stats.length,
    matched: 0,
    upserted: 0,
    unmatched: 0,
    errors: 0,
    bySource: { 'fancy-stats': 0, 'kbo-basic1': 0 },
  };

  for (const s of stats) {
    const m = matchPitcher(s.name, s.team, teamIdMap, pitchers);
    if (!m.playerId) {
      result.unmatched++;
      continue;
    }
    result.matched++;
    result.bySource[s._source]++;

    const payload = {
      player_id: m.playerId,
      season,
      captured_at: capturedAt,
      innings: s.innings,
      era: s.era,
      fip: s.fip,
      xfip: s.xfip,
      k_per_9: s.kPer9,
      war: s.war,
      source: s._source,
      last_synced: new Date().toISOString(),
    };

    if (!dryRun) {
      // cycle 170 — pitcher_stats upsert assertWriteOk 통일 (write 측 silent
      // drift family). 기존 .error 체크는 있었지만 assertWriteOk helper 통일 X →
      // sync-batter-stats (cycle 168) / live.ts (cycle 169) 와 channel 일관성 확보.
      // throw → loop break 부작용 차단 위해 try/catch wrap 으로 기존 continue 로직 유지.
      try {
        const upsertResult = await db
          .from('pitcher_stats')
          .upsert(payload, { onConflict: 'player_id,season,captured_at' });
        assertWriteOk(upsertResult, 'snapshot-pitchers.pitcher_stats.upsert');
      } catch (e) {
        console.error(`  ❌ ${s.name} (${s.team}): ${e instanceof Error ? e.message : String(e)}`);
        result.errors++;
        continue;
      }
    }
    result.upserted++;
  }

  return result;
}

// CLI entry
async function cli() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const seasonIdx = args.indexOf('--season');
  const season = seasonIdx >= 0 ? parseInt(args[seasonIdx + 1], 10) : undefined;

  console.log(`📅 Snapshot pitchers (dry-run=${dryRun}, season=${season ?? 'current'})`);
  const result = await snapshotPitcherStats({ season, dryRun });

  console.log('');
  console.log(`📊 Season: ${result.season} · Captured: ${result.capturedAt}`);
  console.log(`   Fetched: ${result.fetched}`);
  console.log(`   Matched: ${result.matched} (fancy-stats: ${result.bySource['fancy-stats']}, kbo-basic1: ${result.bySource['kbo-basic1']})`);
  console.log(`   Upserted: ${result.upserted}`);
  console.log(`   Unmatched: ${result.unmatched}`);
  console.log(`   Errors: ${result.errors}`);
  if (dryRun) console.log('(dry run — DB unchanged)');
}

// ESM: import.meta.url === `file://${process.argv[1]}` 로 직접 실행 판정
if (import.meta.url === `file://${process.argv[1]}`) {
  cli().catch((err) => { console.error('💥 Fatal:', err); process.exit(1); });
}

export { matchPitcher, normalizeName, tagSource };
