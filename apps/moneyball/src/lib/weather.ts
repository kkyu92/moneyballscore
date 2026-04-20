/**
 * Open-Meteo (key-free) 기반 구장 날씨 조회.
 *
 * 홈 empty-state 에서 다음 경기 카드마다 기온/강수확률/아이콘 노출.
 * key 불필요, rate limit 10,000/일 (free tier) — 10분 ISR + revalidate 로 충분.
 *
 * API: https://api.open-meteo.com/v1/forecast
 */

export interface WeatherSlot {
  tempC: number;
  precipPct: number; // 0-100
  icon: string;      // 이모지
  label: string;     // "맑음" / "흐림" / "비" / ...
}

interface OpenMeteoResponse {
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
}

/**
 * WMO weather code → 이모지 + 한국어 라벨.
 * https://open-meteo.com/en/docs 의 Weather variable documentation 참조.
 */
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

/**
 * 특정 구장의 경기 시작 시간대 날씨.
 *
 * @param lat   위도
 * @param lng   경도
 * @param date  YYYY-MM-DD
 * @param hour  경기 시작 시 (0-23)
 * @returns WeatherSlot 또는 null (API 실패·시간 대응 데이터 없음)
 */
export async function fetchStadiumWeather(
  lat: number,
  lng: number,
  date: string,
  hour: number,
): Promise<WeatherSlot | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=temperature_2m,precipitation_probability,weather_code` +
    `&timezone=Asia/Seoul` +
    `&start_date=${date}&end_date=${date}`;

  try {
    const res = await fetch(url, {
      // 서버 컴포넌트 fetch — Next.js 가 자동 dedupe/cache.
      // revalidate 1800s = 30분. 과도한 호출 방지.
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as OpenMeteoResponse;
    const hourly = json.hourly;
    if (!hourly?.time) return null;

    // hourly.time 은 "2026-04-21T18:00" 형식. hour 와 매칭.
    const targetPrefix = `${date}T${String(hour).padStart(2, '0')}:00`;
    const idx = hourly.time.findIndex((t) => t === targetPrefix);
    if (idx < 0) return null;

    const meta = mapWeatherCode(hourly.weather_code[idx]);
    return {
      tempC: Math.round(hourly.temperature_2m[idx] * 10) / 10,
      precipPct: hourly.precipitation_probability[idx] ?? 0,
      icon: meta.icon,
      label: meta.label,
    };
  } catch {
    return null;
  }
}
