import { clampWinnerProb, ELO_DIVIDER, HOME_ELO_BONUS } from '@moneyball/shared';

export const MLB_BASE_WEIGHTS = {
  // KBO 10 동등
  sp_fip: 0.12,
  sp_xfip: 0.03,
  lineup_woba: 0.10,
  bullpen_fip: 0.10,
  recent_form: 0.10,
  war: 0.08,
  head_to_head: 0.03,
  park_factor: 0.04,
  elo: 0.10,
  defense_sfr: 0.05,
  // Statcast 4 추가
  lineup_xwoba: 0.05,
  lineup_barrel_pct: 0.03,
  sp_xwoba_against: 0.04,
  woba_std: 0.03,
  // 보너스
  home_elo_bonus: 0.10,
} as const;

export const MLB_KBO_FACTOR_KEYS = [
  "sp_fip",
  "sp_xfip",
  "lineup_woba",
  "bullpen_fip",
  "recent_form",
  "war",
  "head_to_head",
  "park_factor",
  "elo",
  "defense_sfr",
] as const satisfies readonly (keyof typeof MLB_BASE_WEIGHTS)[];

export const MLB_STATCAST_FACTOR_KEYS = [
  "lineup_xwoba",
  "lineup_barrel_pct",
  "sp_xwoba_against",
  "woba_std",
] as const satisfies readonly (keyof typeof MLB_BASE_WEIGHTS)[];

export const MLB_FACTOR_COUNTS = {
  kbo: MLB_KBO_FACTOR_KEYS.length,
  statcast: MLB_STATCAST_FACTOR_KEYS.length,
  total: MLB_KBO_FACTOR_KEYS.length + MLB_STATCAST_FACTOR_KEYS.length,
} as const;

// mlb-pipeline.ts computeMlbProbability 호출부가 home/away 에 항상 동일 상수를 넣어
// homeAdvantage 기여도가 구조적으로 always diff=0 인 키들 (cycle 2402 발견, MLB 전용
// 데이터 소스 부재 — 신규 스크레이퍼 필요, 별도 스코프). recent_form/head_to_head 는
// cycle 2353, elo 는 cycle 2349 에 이미 실측 연결됨 — 이 배열에서 제외.
// factors/methodology 페이지 배너가 이 배열을 단일 source 로 참조 — 실측 연결 시
// 이 배열만 갱신하면 두 페이지 자동 동기 (cycle 2512 silent drift 정정 후속).
export const MLB_PLACEHOLDER_FACTOR_KEYS = [
  "defense_sfr",
  "sp_xwoba_against",
  "woba_std",
] as const satisfies readonly (keyof typeof MLB_BASE_WEIGHTS)[];

export const HOME_ELO_BONUS_VALUE = HOME_ELO_BONUS;

export interface MlbFactorInputs {
  sp_fip: { home: number; away: number };
  sp_xfip: { home: number; away: number };
  lineup_woba: { home: number; away: number };
  bullpen_fip: { home: number; away: number };
  recent_form: { home: number; away: number };
  war: { home: number; away: number };
  head_to_head: { homeWinRate: number };
  park_factor: number;
  elo: { home: number; away: number };
  defense_sfr: { home: number; away: number };
  lineup_xwoba: { home: number; away: number };
  lineup_barrel_pct: { home: number; away: number };
  sp_xwoba_against: { home: number; away: number };
  woba_std: { home: number; away: number };
}

function safe(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

type MlbFactorContributions = Record<Exclude<keyof typeof MLB_BASE_WEIGHTS, 'home_elo_bonus'>, number>;

/**
 * homeAdvantage 를 이루는 14개 term 을 개별 노출 (cycle 2169 explore-idea —
 * MLB rivalry-memory parity 위해 "어느 팩터가 이 예측의 bias 를 이끌었나" 재구성
 * 필요, computeMlbProbability 는 합산값만 반환해 재사용 불가 → 순수 추출 리팩터).
 * computeMlbProbability 는 본 함수 합산 + home_elo_bonus 고정항으로 동일 결과 유지.
 */
export function computeMlbFactorContributions(input: MlbFactorInputs): MlbFactorContributions {
  return {
    sp_fip: -1 * MLB_BASE_WEIGHTS.sp_fip * (safe(input.sp_fip.home) - safe(input.sp_fip.away)),
    sp_xfip: -1 * MLB_BASE_WEIGHTS.sp_xfip * (safe(input.sp_xfip.home) - safe(input.sp_xfip.away)),
    lineup_woba: MLB_BASE_WEIGHTS.lineup_woba * (safe(input.lineup_woba.home) - safe(input.lineup_woba.away)) * 5,
    bullpen_fip: -1 * MLB_BASE_WEIGHTS.bullpen_fip * (safe(input.bullpen_fip.home) - safe(input.bullpen_fip.away)),
    recent_form: MLB_BASE_WEIGHTS.recent_form * (safe(input.recent_form.home) - safe(input.recent_form.away)) * 0.05,
    war: MLB_BASE_WEIGHTS.war * (safe(input.war.home) - safe(input.war.away)) * 0.01,
    head_to_head: MLB_BASE_WEIGHTS.head_to_head * (safe(input.head_to_head.homeWinRate, 0.5) - 0.5),
    park_factor: MLB_BASE_WEIGHTS.park_factor * (safe(input.park_factor, 1.0) - 1.0),
    elo: MLB_BASE_WEIGHTS.elo * ((safe(input.elo.home) + HOME_ELO_BONUS_VALUE - safe(input.elo.away)) / ELO_DIVIDER),
    defense_sfr: MLB_BASE_WEIGHTS.defense_sfr * (safe(input.defense_sfr.home) - safe(input.defense_sfr.away)) * 0.01,
    lineup_xwoba: MLB_BASE_WEIGHTS.lineup_xwoba * (safe(input.lineup_xwoba.home) - safe(input.lineup_xwoba.away)) * 5,
    lineup_barrel_pct: MLB_BASE_WEIGHTS.lineup_barrel_pct * (safe(input.lineup_barrel_pct.home) - safe(input.lineup_barrel_pct.away)) * 0.01,
    sp_xwoba_against: -1 * MLB_BASE_WEIGHTS.sp_xwoba_against * (safe(input.sp_xwoba_against.home) - safe(input.sp_xwoba_against.away)) * 5,
    woba_std: MLB_BASE_WEIGHTS.woba_std * (safe(input.woba_std.home) - safe(input.woba_std.away)) * 5,
  };
}

export function computeMlbProbability(input: MlbFactorInputs): number {
  const contributions = computeMlbFactorContributions(input);
  const homeAdvantage =
    Object.values(contributions).reduce((sum, v) => sum + v, 0) + MLB_BASE_WEIGHTS.home_elo_bonus * 0.5;

  if (!Number.isFinite(homeAdvantage)) return 0.5;

  return clampWinnerProb(0.5 + homeAdvantage);
}
