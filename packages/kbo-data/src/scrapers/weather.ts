/**
 * Open-Meteo 날씨 scraper — backfill (archive) + forward (forecast) 공용.
 *
 * games.weather JSONB 에 저장되는 스냅샷 생성. UI 는 /src/lib/weather.ts 의 동일
 * WMO code → 이모지 매핑 유지 (렌더링 측만).
 *
 * Source flag:
 *   - 'open-meteo-archive':  archive-api.open-meteo.com/v1/archive (과거 실측)
 *   - 'open-meteo-forecast': api.open-meteo.com/v1/forecast      (미래 예보)
 *
 * 스키마 (archive 는 precipMm, forecast 는 precipPct — 데이터 소스 특성 보존):
 *   {
 *     tempC: number,
 *     precipMm?: number,      // archive 전용 (실측 mm)
 *     precipPct?: number,     // forecast 전용 (예보 확률 %)
 *     windSpeedKmh: number,
 *     windDirDeg: number,
 *     code: number,
 *     icon: string,
 *     label: string,
 *     source: 'open-meteo-archive' | 'open-meteo-forecast'
 *   }
 */

export interface WeatherSnapshot {
  tempC: number;
  precipMm?: number;
  precipPct?: number;
  windSpeedKmh: number;
  windDirDeg: number;
  code: number;
  icon: string;
  label: string;
  source: 'open-meteo-archive' | 'open-meteo-forecast';
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

interface ForecastResponse {
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
  };
}

/** WMO code → 이모지 + 한국어 라벨. UI weather.ts 와 동일 매핑 (duplication 허용). */
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

interface BaseHourly {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
}

/** hourly.time 배열에서 `${date}T${HH}:00` 매칭 인덱스. archive/forecast 공용. */
function findHourIndex(time: string[], date: string, hour: number): number {
  const targetPrefix = `${date}T${String(hour).padStart(2, '0')}:00`;
  return time.findIndex((t) => t === targetPrefix);
}

/** archive/forecast 공통 snapshot 필드. precip 계열은 호출자가 variant 별로 add. */
function buildBaseSnapshot(
  hourly: BaseHourly,
  idx: number,
): Pick<WeatherSnapshot, 'tempC' | 'windSpeedKmh' | 'windDirDeg' | 'code' | 'icon' | 'label'> {
  const code = hourly.weather_code[idx];
  const meta = mapWeatherCode(code);
  return {
    tempC: Math.round(hourly.temperature_2m[idx] * 10) / 10,
    windSpeedKmh: Math.round(hourly.wind_speed_10m[idx] * 10) / 10,
    windDirDeg: Math.round(hourly.wind_direction_10m[idx]),
    code,
    icon: meta.icon,
    label: meta.label,
  };
}

// Open-Meteo fetch fail 4 분기 — http_error / no_hourly / idx_not_found / fetch_error.
// archive + forecast 두 fetcher 가 동일 4 분기 silent return null 반복하던 패턴을
// 단일 helper 로 derive — silent drift family scrapers 차원 19번째 진입. 호출 site 가
// 어느 분기로 fail 했는지 console.warn 으로 가시화 (이전: 4 fail mode 모두 silent null).
export type WeatherFetchFailReason = 'http_error' | 'no_hourly' | 'idx_not_found' | 'fetch_error';

export type OpenMeteoFetchResult<H extends BaseHourly> =
  | { ok: true; hourly: H; idx: number }
  | { ok: false; reason: WeatherFetchFailReason; status?: number };

/**
 * Open-Meteo hourly 응답을 fetch + 인덱스 lookup 단일 helper.
 * archive (`/v1/archive`) + forecast (`/v1/forecast`) 양쪽 공유 — URL 만 차이.
 * fail 시 4 분기 reason 박제 (silent return null → 가시화).
 */
export async function fetchOpenMeteoHourly<H extends BaseHourly>(
  url: string,
  date: string,
  hour: number,
): Promise<OpenMeteoFetchResult<H>> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, reason: 'http_error', status: res.status };
    const json = (await res.json()) as { hourly?: H };
    const hourly = json.hourly;
    if (!hourly?.time) return { ok: false, reason: 'no_hourly' };
    const idx = findHourIndex(hourly.time, date, hour);
    if (idx < 0) return { ok: false, reason: 'idx_not_found' };
    return { ok: true, hourly, idx };
  } catch {
    return { ok: false, reason: 'fetch_error' };
  }
}

function logWeatherFail(
  source: 'archive' | 'forecast',
  fail: Exclude<OpenMeteoFetchResult<BaseHourly>, { ok: true }>,
): void {
  const suffix = fail.status ? ` (HTTP ${fail.status})` : '';
  console.warn(`[weather] ${source} fetch failed: ${fail.reason}${suffix}`);
}

/** 과거 실측 — 경기 종료 후 또는 당일 몇 시간 지난 이후. */
export async function fetchArchiveWeather(
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
  const result = await fetchOpenMeteoHourly<NonNullable<ArchiveResponse['hourly']>>(url, date, hour);
  if (!result.ok) {
    logWeatherFail('archive', result);
    return null;
  }
  const { hourly, idx } = result;
  return {
    ...buildBaseSnapshot(hourly, idx),
    precipMm: Math.round((hourly.precipitation[idx] ?? 0) * 10) / 10,
    source: 'open-meteo-archive',
  };
}

/** 예보 — 오늘 or 미래 경기. 예측 엔진이 저장 시점 호출. */
export async function fetchForecastWeather(
  lat: number,
  lng: number,
  date: string,
  hour: number,
): Promise<WeatherSnapshot | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${date}&end_date=${date}` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m` +
    `&timezone=Asia/Seoul`;
  const result = await fetchOpenMeteoHourly<NonNullable<ForecastResponse['hourly']>>(url, date, hour);
  if (!result.ok) {
    logWeatherFail('forecast', result);
    return null;
  }
  const { hourly, idx } = result;
  return {
    ...buildBaseSnapshot(hourly, idx),
    precipPct: hourly.precipitation_probability[idx] ?? 0,
    source: 'open-meteo-forecast',
  };
}
