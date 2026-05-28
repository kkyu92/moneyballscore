/**
 * M-F1 park_weather factor (factor 11).
 *
 * 야외 KBO 구장 기상 영향 (저온 HR 억제 / 외야 방향 바람 HR 부스트 / 강수 점수 억제).
 * 돔구장 (WO 고척스카이돔) + weather null 시 noop.
 *
 * production 가중치 = 0 (DEFAULT_WEIGHTS), shadow cohort (v2.1-B-shadow) 에서만 weight>0.
 *
 * 임계값:
 *   - tempC < 10°C       → HR -15% (양팀 동일)
 *   - precipMm ≥ 5       → 양팀 점수 -8%
 *   - windDirDeg 90~270  ∧ windSpeedKmh ≥ 10 → HR +10% (양팀 동일)
 *
 * 비대칭 미적용 — 라인업 HR 파워 / 구장 orientation 데이터 없음. 양팀 동일 adj 반환.
 * shadow cohort scoring 안 factor → [0, 1] 변환 시 0.5 (neutral) 가 정상.
 * reason 필드는 UI / 디버그 surface 용 (FactorBreakdown).
 */

import type { WeatherSnapshot } from '../scrapers/weather';

export interface ParkWeatherScore {
  /** 홈팀 공격 offence multiplicative adj (-0.15 ~ +0.10) */
  homeAdj: number;
  /** 원정팀 공격 offence multiplicative adj */
  awayAdj: number;
  /** 사람용 reason (UI / 디버그) */
  reason: string;
}

const COLD_TEMP_C = 10;
const COLD_HR_ADJ = -0.15;

const RAIN_PRECIP_MM = 5;
const RAIN_SCORE_ADJ = -0.08;

const WIND_OUTFIELD_MIN_DEG = 90;
const WIND_OUTFIELD_MAX_DEG = 270;
const WIND_MIN_SPEED_KMH = 10;
const WIND_HR_BOOST = 0.10;

/**
 * 야외 KBO 구장 기상 영향 스코어링.
 *
 * @param weather  Open-Meteo snapshot — null 시 noop (결측 fallback)
 * @param parkFactor  구장 보정 계수 (1.0 = 중립, >1 = 타자 유리) — 현 buildouts symmetric 이라 사용 X (장래 확장 reserve)
 * @param isDome  돔구장 여부 — true 시 noop (KBO = WO 고척만 dome)
 */
export function scoreParkWeather(
  weather: WeatherSnapshot | null,
  parkFactor: number,
  isDome: boolean,
): ParkWeatherScore {
  // 돔구장 → 기상 영향 0 (parkFactor 인자는 장래 확장 reserve, 현재 사용 X)
  void parkFactor;

  if (isDome) {
    return { homeAdj: 0, awayAdj: 0, reason: '돔구장 (날씨 영향 없음)' };
  }

  // weather 결측 → noop
  if (!weather) {
    return { homeAdj: 0, awayAdj: 0, reason: '날씨 데이터 결측' };
  }

  let homeAdj = 0;
  let awayAdj = 0;
  const reasons: string[] = [];

  // 저온 — HR 억제 (양팀 동일)
  if (weather.tempC < COLD_TEMP_C) {
    homeAdj += COLD_HR_ADJ;
    awayAdj += COLD_HR_ADJ;
    reasons.push(`저온 ${weather.tempC}°C (HR 억제)`);
  }

  // 강수 — 양팀 점수 억제 (archive precipMm 기준)
  // forecast precipPct 는 확률 기반이라 본 임계 미적용 (실측 데이터로만 판정)
  const precip = weather.precipMm ?? 0;
  if (precip >= RAIN_PRECIP_MM) {
    homeAdj += RAIN_SCORE_ADJ;
    awayAdj += RAIN_SCORE_ADJ;
    reasons.push(`강수 ${precip}mm (점수 억제)`);
  }

  // 외야 방향 바람 — HR 부스트
  // 90~270° = 남풍 계열 (홈플레이트 → 외야 방향, 대부분 KBO 구장 north 향 기준 근사)
  const dir = weather.windDirDeg;
  const speed = weather.windSpeedKmh;
  if (
    speed >= WIND_MIN_SPEED_KMH &&
    dir >= WIND_OUTFIELD_MIN_DEG &&
    dir <= WIND_OUTFIELD_MAX_DEG
  ) {
    homeAdj += WIND_HR_BOOST;
    awayAdj += WIND_HR_BOOST;
    reasons.push(`외야 바람 ${speed}km/h (HR 부스트)`);
  }

  return {
    homeAdj,
    awayAdj,
    reason: reasons.length > 0 ? reasons.join(', ') : '날씨 중립',
  };
}

/**
 * scoreParkWeather → predictor factor [0, 1] 변환.
 *
 * 현 buildouts 양팀 adj 가 동일 (symmetric) → factor = 0.5 (neutral) 반환.
 * 라인업 HR 파워 / 구장 orientation 별도 input 으로 비대칭 도입 시 (homeAdj - awayAdj) 기반 분기.
 *
 * production 가중치 0 → factor 값 무관. shadow cohort 측정 시 동일 input 양쪽 동일 factor.
 */
export function parkWeatherFactor(score: ParkWeatherScore): number {
  const diff = score.homeAdj - score.awayAdj;
  // 대칭 (diff=0) → 0.5. 비대칭 도입 시 ±0.5 범위로 clamp.
  return Math.max(0, Math.min(1, 0.5 + diff));
}
