export type {
  BacktestGame,
  GameFeatures,
  Model,
  MetricsSummary,
  CalibrationBucket,
  BacktestRow,
} from './types';

export { computeMetrics, buildCalibration } from './metrics';
export {
  parseEloHistory,
  parseTextBlock,
  getEloAt,
  fetchEloHistory,
} from './elo-history';
export type { EloHistory, EloPoint } from './elo-history';

export {
  modelCoinFlip,
  modelEloHomeAdv,
  makeRestricted,
  teamHomeAdvantagesInEloPt,
  DEFAULT_RESTRICTED,
  HOME_ADV_ELO_DEFAULT,
} from './models';
export type { RestrictedParams } from './models';

export { loadDecidedGames, buildFeatures, computeHomeWinRates } from './loader';
export { runBacktest } from './runner';
export type { RunnerInput, RunnerOutput } from './runner';

export {
  parseEloTable,
  fetchSeasonTeamStats,
  fetchAllSeasonTeamStats,
  SEASON_SNAPSHOTS,
} from './wayback-team-stats';
export type { SeasonTeamStat, SeasonStatsMap } from './wayback-team-stats';
