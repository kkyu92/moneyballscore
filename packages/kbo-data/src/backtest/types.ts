import type { TeamCode } from '@moneyball/shared';

/** DB 에서 로드한 decided 경기 (백테스트 대상). */
export interface BacktestGame {
  id: number;
  date: string; // YYYY-MM-DD (KST game_date)
  season: number;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  homeWon: boolean;
}

/**
 * 경기 시점 직전까지의 관측 가능한 feature 묶음. 모든 값은 game_date 미만
 * 데이터로만 구성 — look-ahead bias 0.
 */
export interface GameFeatures {
  homeElo: number;
  awayElo: number;
  homeForm: number | null; // 최근 10경기 승률
  awayForm: number | null;
  h2hHomeWins: number; // 시즌 내 누적
  h2hAwayWins: number;
  parkPf: number; // 홈 구장 파크팩터
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  /**
   * Wayback 시즌 말 team stats (있으면). logistic 확장 feature 용.
   * Look-ahead bias 있음 — feature selection 검증에만 사용.
   */
  homeWoba?: number;
  awayWoba?: number;
  homeFip?: number;
  awayFip?: number;
  homeSfr?: number;
  awaySfr?: number;

  /**
   * game_records 기반 시점별 feature (look-ahead bias 0).
   * 경기 시점 이전 N일/N경기 데이터로만 구성.
   */
  homeBullpenInningsL3?: number;
  awayBullpenInningsL3?: number;
  homeRunsL5?: number;
  awayRunsL5?: number;
  homeRunsAllowedL5?: number;
  awayRunsAllowedL5?: number;
  homeHomeRunsL5?: number;
  awayHomeRunsL5?: number;
}

/** 모델 = (feature) → p(home win). 순수 함수. */
export type Model = (f: GameFeatures) => number;

/** 단일 모델 × 경기 집합의 집계 성능. */
export interface MetricsSummary {
  n: number;
  brier: number;
  logLoss: number;
  accuracy: number;
  calibration: CalibrationBucket[];
}

export interface CalibrationBucket {
  /** [lo, hi) 확률 구간 */
  lo: number;
  hi: number;
  n: number;
  avgPredicted: number;
  actualRate: number; // 실제 홈 승률
}

/** 실행 결과 한 행 (모델별 × scope 별). */
export interface BacktestRow {
  model: string;
  scope: string; // "2023-2025 all" 등
  metrics: MetricsSummary;
}
