/**
 * Weather historical backfill — games.weather JSONB 채우기.
 *
 * 사용:
 *   tsx backfill-weather.ts 2026-03-22 2026-04-20           # 실행
 *   tsx backfill-weather.ts 2026-03-22 2026-04-20 --dry-run # 시뮬
 *
 * 소스: Open-Meteo **Historical Archive** API (key-free, 무제한 free tier).
 *   https://archive-api.open-meteo.com/v1/archive
 *
 * Forward 날씨 (미래 경기) 는 /src/lib/weather.ts 의 forecast API 로 계속
 * 처리. 이 스크립트는 **과거 경기 전용**.
 *
 * Idempotent: weather IS NULL 인 games 만 처리.
 * Rate limit: games 당 ~250ms delay. 720 경기 (2025 풀시즌) ≈ 3분.
 *
 * 저장 스키마 (JSONB):
 *   {
 *     tempC: 18.5,
 *     precipMm: 0,          // 실측 강수량 (archive) — probability 대신
 *     windSpeedKmh: 12.3,
 *     windDirDeg: 270,
 *     code: 2,              // WMO code
 *     icon: "🌤️",
 *     label: "구름조금",
 *     source: "open-meteo-archive"
 *   }
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { KBO_STADIUM_COORDS, assertSelectOk, type TeamCode } from '@moneyball/shared';
import { fetchArchiveWeather } from '../scrapers/weather';

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

interface GameRow {
  id: number;
  game_date: string;
  game_time: string | null;
  home_team: { code: string } | null;
}

async function fetchGamesMissingWeather(
  db: DB,
  startDate: string,
  endDate: string,
): Promise<GameRow[]> {
  const result = await db
    .from('games')
    .select('id, game_date, game_time, home_team:teams!games_home_team_id_fkey(code)')
    .is('weather', null)
    .gte('game_date', startDate)
    .lte('game_date', endDate)
    .order('game_date', { ascending: true });
  // join shape 은 supabase TypeScript 가 array 로 추론 — runtime 은 단일 객체.
  // postview-daily / live 와 동일하게 any[] generic + cast 패턴 적용.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = assertSelectOk<any[]>(result, 'backfill-weather.fetchGamesMissingWeather');
  return (data as unknown as GameRow[]) ?? [];
}

async function main() {
  const args = process.argv.slice(2);
  const startDate = args[0];
  const endDate = args[1];
  const dryRun = args.includes('--dry-run');

  if (!startDate || !endDate) {
    console.error('Usage: tsx backfill-weather.ts <start-date> <end-date> [--dry-run]');
    console.error('  e.g. tsx backfill-weather.ts 2026-03-22 2026-04-20');
    process.exit(1);
  }

  const db = createAdminClient();
  const games = await fetchGamesMissingWeather(db, startDate, endDate);

  console.log(`📅 Range: ${startDate} ~ ${endDate}`);
  console.log(`⚾ Games missing weather: ${games.length}`);
  if (dryRun) console.log('🔍 DRY RUN — no writes');
  console.log('');

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const g of games) {
    const code = g.home_team?.code as TeamCode | undefined;
    if (!code || !(code in KBO_STADIUM_COORDS)) {
      console.log(`  ⏭  game ${g.id} ${g.game_date} — unknown home team code: ${code}`);
      skipped++;
      continue;
    }
    const coords = KBO_STADIUM_COORDS[code];

    // 경기 시작 시각: game_time 이 "18:30:00" 이면 18 사용. null 이면 기본 18 (KBO 표준).
    const hourStr = g.game_time?.slice(0, 2);
    const hour = hourStr ? parseInt(hourStr, 10) : 18;

    const snap = await fetchArchiveWeather(coords.lat, coords.lng, g.game_date, hour);
    if (!snap) {
      console.log(`  ❌ game ${g.id} ${g.game_date} ${hour}:00 @ ${code} — no data`);
      failed++;
      continue;
    }

    if (!dryRun) {
      const { error } = await db.from('games').update({ weather: snap }).eq('id', g.id);
      if (error) {
        console.log(`  ❌ game ${g.id} — DB update failed: ${error.message}`);
        failed++;
        continue;
      }
    }

    console.log(
      `  ✓ game ${g.id} ${g.game_date} ${hour}:00 @ ${code}: ` +
        `${snap.tempC}°C ${snap.label} wind ${snap.windSpeedKmh}km/h`,
    );
    ok++;

    // Polite delay — archive API 제한 없다지만 과속 지양.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log('');
  console.log(`📊 Total: ${games.length} · ok: ${ok} · skipped: ${skipped} · failed: ${failed}`);
  if (dryRun) console.log('(dry run — DB unchanged)');
}

main().catch((err) => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
