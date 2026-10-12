export type {
  BacktestGame,
  GameFeatures,
  Model,
  MetricsSummary,
  CalibrationBucket,
} from './types';

export { computeMetrics, buildCalibration } from './metrics';
export {
  parseEloHistory,
  getEloAt,
  fetchEloHistory,
} from './elo-history';
export type { EloHistory } from './elo-history';

export {
  modelCoinFlip,
  modelEloHomeAdv,
  makeRestricted,
  teamHomeAdvantagesInEloPt,
  DEFAULT_RESTRICTED,
  HOME_ADV_ELO_DEFAULT,
} from './models';
export type { RestrictedParams } from './models';

export { loadDecidedGames, loadGameRecords, buildFeatures, computeHomeWinRates } from './loader';
export { runBacktest } from './runner';
export type { RunnerInput, RunnerOutput } from './runner';

export {
  parseEloTable,
  fetchAllSeasonTeamStats,
} from './wayback-team-stats';
export type { SeasonStatsMap } from './wayback-team-stats';
