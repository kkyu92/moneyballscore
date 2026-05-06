/**
 * 경기별 boxscore 백필 CLI — 시즌 단위로 Naver record 수집.
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../packages/kbo-data/src/pipeline/backfill-records.ts 2025
 *   # 또는 전체
 *   tsx ../../packages/kbo-data/src/pipeline/backfill-records.ts 2023 2024 2025 2026
 *
 * Rate limit: 요청 간 1.5초 (Naver 공식 robots 없지만 예의상).
 * Idempotent: 이미 저장된 경기는 덮어씀 (updated_at 갱신).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertSelectOk } from '@moneyball/shared';
import { fetchNaverRecord, toNaverGameId } from '../scrapers/naver-record';
import { saveGameRecord } from './save-game-record';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

const DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function createAdminClient(): DB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('env missing');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface GameRow {
  id: number;
  game_date: string;
  external_game_id: string;
}

async function loadDecidedGames(db: DB, season: number): Promise<GameRow[]> {
  const out: GameRow[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const result = await db
      .from('games')
      .select('id, game_date, external_game_id')
      .gte('game_date', `${season}-01-01`)
      .lte('game_date', `${season}-12-31`)
      .not('winner_team_id', 'is', null)
      .not('external_game_id', 'is', null)
      .order('game_date', { ascending: true })
      .range(from, from + pageSize - 1);
    const { data } = assertSelectOk<
      { id: number; game_date: string; external_game_id: string }[]
    >(result, 'backfill-records.loadDecidedGames');
    if (!data || data.length === 0) break;
    for (const r of data) {
      out.push({
        id: r.id as number,
        game_date: r.game_date as string,
        external_game_id: r.external_game_id as string,
      });
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

async function loadAlreadyCovered(db: DB, season: number): Promise<Set<number>> {
  // 해당 시즌 games 의 game_records 조회 — 이미 저장된 건 skip 옵션 제공
  const result = await db
    .from('game_records')
    .select('game_id, game:games!inner(game_date)')
    .gte('game.game_date', `${season}-01-01`)
    .lte('game.game_date', `${season}-12-31`);
  const { data } = assertSelectOk<{ game_id: number }[]>(
    result,
    'backfill-records.loadAlreadyCovered',
  );
  const s = new Set<number>();
  for (const r of data || []) s.add(r.game_id as number);
  return s;
}

async function processSeason(
  db: DB,
  season: number,
  opts: { skipCovered: boolean },
): Promise<void> {
  console.log(`\n=== Season ${season} ===`);
  const games = await loadDecidedGames(db, season);
  console.log(`  decided games: ${games.length}`);
  const covered = opts.skipCovered ? await loadAlreadyCovered(db, season) : new Set<number>();
  if (opts.skipCovered) console.log(`  already covered: ${covered.size}`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (covered.has(g.id)) {
      skipped++;
      continue;
    }
    const naverGameId = toNaverGameId(g.external_game_id, season);
    try {
      const rec = await fetchNaverRecord(naverGameId);
      if (!rec) {
        failed++;
        errors.push(`${naverGameId}: not found`);
        if (i % 20 === 0) console.log(`  [${i + 1}/${games.length}] ${naverGameId} 404`);
      } else {
        const r = await saveGameRecord(db, g.id, rec);
        if (r.error) {
          failed++;
          errors.push(`${naverGameId}: ${r.error}`);
        } else if (r.skipped) {
          skipped++;
        } else {
          ok++;
        }
        if (i % 20 === 0) {
          console.log(
            `  [${i + 1}/${games.length}] ${naverGameId} ${r.error ? '✗' : r.skipped ? '—' : '✓'} (p=${rec.pitchersHome.length + rec.pitchersAway.length}, b=${rec.battersHome.length + rec.battersAway.length})`,
          );
        }
      }
    } catch (e) {
      failed++;
      errors.push(`${naverGameId}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(
    `  season ${season} done: ok=${ok} skipped=${skipped} failed=${failed}`,
  );
  if (errors.length > 0) {
    console.log(`  first 5 errors:`);
    for (const e of errors.slice(0, 5)) console.log(`    ${e}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const seasons = args
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n >= 2020 && n <= 2030);
  if (seasons.length === 0) {
    console.error('Usage: tsx backfill-records.ts 2024 2025 [--force]');
    process.exit(1);
  }
  const skipCovered = !args.includes('--force');

  const db = createAdminClient();
  for (const s of seasons) {
    await processSeason(db, s, { skipCovered });
  }
  console.log('\n=== 완료 ===');
}

main().catch((err) => {
  console.error('BACKFILL FAILED:', err);
  process.exit(1);
});
