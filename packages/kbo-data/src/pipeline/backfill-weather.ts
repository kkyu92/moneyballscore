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
import { KBO_STADIUM_COORDS, type TeamCode } from '@moneyball/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

interface WeatherSnapshot {
  tempC: number;
  precipMm: number;
  windSpeedKmh: number;
  windDirDeg: number;
  code: number;
  icon: string;
  label: string;
  source: 'open-meteo-archive';
}

interface ArchiveResponse {
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
  };
}

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

/** WMO weather code → 이모지 + 한국어 라벨. UI weather.ts 와 동일 매핑. */
function mapWeatherCode(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: '☀️', label: '맑음' };
  if (code <= 3) return { icon: '🌤️', label: '구름조금' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: '안개' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: '이슬비' };
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: '비' };
  if (code >= 71 && code <= 77) return { icon: '❄️', label: '눈' };
  if (code >= 80 && code <= 82) return { icon: '🌧️', label: '소나기' };
  if (code >= 85 && code <= 86) return { icon: '🌨️', label: '눈발' };
  if (code >= 95) return { icon: '⛈️', label: '뇌우' };
  return { icon: '🌡️', label: '—' };
}

async function fetchArchive(
  lat: number,
  lng: number,
  date: string,
  hour: number,
): Promise<WeatherSnapshot | null> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${date}&end_date=${date}` +
    `&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
    `&timezone=Asia/Seoul`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ⚠ archive fetch failed ${res.status} for ${date} ${hour}:00`);
      return null;
    }
    const json = (await res.json()) as ArchiveResponse;
    const hourly = json.hourly;
    if (!hourly?.time) return null;

    const targetPrefix = `${date}T${String(hour).padStart(2, '0')}:00`;
    const idx = hourly.time.findIndex((t) => t === targetPrefix);
    if (idx < 0) return null;

    const code = hourly.weather_code[idx];
    const meta = mapWeatherCode(code);

    return {
      tempC: Math.round(hourly.temperature_2m[idx] * 10) / 10,
      precipMm: Math.round((hourly.precipitation[idx] ?? 0) * 10) / 10,
      windSpeedKmh: Math.round(hourly.wind_speed_10m[idx] * 10) / 10,
      windDirDeg: Math.round(hourly.wind_direction_10m[idx]),
      code,
      icon: meta.icon,
      label: meta.label,
      source: 'open-meteo-archive',
    };
  } catch (err) {
    console.warn(`  ⚠ archive fetch error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
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
  const { data, error } = await db
    .from('games')
    .select('id, game_date, game_time, home_team:teams!games_home_team_id_fkey(code)')
    .is('weather', null)
    .gte('game_date', startDate)
    .lte('game_date', endDate)
    .order('game_date', { ascending: true });
  if (error) throw error;
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

    const snap = await fetchArchive(coords.lat, coords.lng, g.game_date, hour);
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
