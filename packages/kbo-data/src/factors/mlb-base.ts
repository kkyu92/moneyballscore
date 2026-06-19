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

export const HOME_ELO_BONUS_VALUE = 24;

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

export function computeMlbProbability(input: MlbFactorInputs): number {
  const homeAdvantage =
    -1 * MLB_BASE_WEIGHTS.sp_fip * (safe(input.sp_fip.home) - safe(input.sp_fip.away))
    + -1 * MLB_BASE_WEIGHTS.sp_xfip * (safe(input.sp_xfip.home) - safe(input.sp_xfip.away))
    + MLB_BASE_WEIGHTS.lineup_woba * (safe(input.lineup_woba.home) - safe(input.lineup_woba.away)) * 5
    + -1 * MLB_BASE_WEIGHTS.bullpen_fip * (safe(input.bullpen_fip.home) - safe(input.bullpen_fip.away))
    + MLB_BASE_WEIGHTS.recent_form * (safe(input.recent_form.home) - safe(input.recent_form.away)) * 0.05
    + MLB_BASE_WEIGHTS.war * (safe(input.war.home) - safe(input.war.away)) * 0.01
    + MLB_BASE_WEIGHTS.head_to_head * (safe(input.head_to_head.homeWinRate, 0.5) - 0.5)
    + MLB_BASE_WEIGHTS.park_factor * (safe(input.park_factor, 1.0) - 1.0)
    + MLB_BASE_WEIGHTS.elo * ((safe(input.elo.home) + HOME_ELO_BONUS_VALUE - safe(input.elo.away)) / 400)
    + MLB_BASE_WEIGHTS.defense_sfr * (safe(input.defense_sfr.home) - safe(input.defense_sfr.away)) * 0.01
    + MLB_BASE_WEIGHTS.lineup_xwoba * (safe(input.lineup_xwoba.home) - safe(input.lineup_xwoba.away)) * 5
    + MLB_BASE_WEIGHTS.lineup_barrel_pct * (safe(input.lineup_barrel_pct.home) - safe(input.lineup_barrel_pct.away)) * 0.01
    + -1 * MLB_BASE_WEIGHTS.sp_xwoba_against * (safe(input.sp_xwoba_against.home) - safe(input.sp_xwoba_against.away)) * 5
    + MLB_BASE_WEIGHTS.woba_std * (safe(input.woba_std.home) - safe(input.woba_std.away)) * 5
    + MLB_BASE_WEIGHTS.home_elo_bonus * 0.5;

  if (!Number.isFinite(homeAdvantage)) return 0.5;

  const p = 0.5 + homeAdvantage;
  return Math.max(0.15, Math.min(0.85, p));
}
