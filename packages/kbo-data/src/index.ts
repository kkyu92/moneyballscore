// KBO 데이터 수집 + 예측 엔진 모듈

// 타입
export type {
  ScrapedGame,
  PitcherStats,
  BatterStats,
  TeamStats,
  EloRating,
  PredictionInput,
  PredictionResult,
  PipelineResult,
} from './types';
export { TEAM_NAME_MAP } from './types';

// 스크래퍼
export { fetchGames, fetchRecentForm, fetchHeadToHead, DEFAULT_PARK_FACTORS, fetchStandings } from './scrapers/kbo-official';
export type { StandingRow } from './scrapers/kbo-official';
export { fetchPitcherStats, fetchTeamStats, fetchEloRatings, fetchBatterStats, findPitcher } from './scrapers/fancy-stats';
export { fetchBatterLeaders } from './scrapers/fangraphs';

// 예측 엔진
export { predict } from './engine/predictor';

// 파이프라인
export { runDailyPipeline } from './pipeline/daily';
export { runLiveUpdate } from './pipeline/live';
export { runPostviewDaily } from './pipeline/postview-daily';
export type { PostviewDailyResult } from './pipeline/postview-daily';
export { syncBatterStats } from './pipeline/sync-batter-stats';
export type { SyncBatterStatsResult } from './pipeline/sync-batter-stats';
export { snapshotPitcherStats } from './pipeline/snapshot-pitchers';
export type { SnapshotOptions, SnapshotResult } from './pipeline/snapshot-pitchers';

// 빅매치 선정 (v4-4)
export {
  selectBigMatch,
  scoreGame,
  WEIGHTS as BIG_MATCH_WEIGHTS,
  BIG_MATCH_THRESHOLD,
} from './big-match';
export type { BigMatchCandidate, BigMatchResult, BigMatchMode } from './big-match';

// 라이브
export { fetchLiveGames, adjustWinProbability } from './scrapers/kbo-live';

// 에이전트
export { runDebate } from './agents/debate';
export type { DebateResult, GameContext, TeamArgument, JudgeVerdict, CalibrationHint } from './agents/types';

// 알림
export { notifyPredictions, notifyResults, notifyError, notifyPipelineStatus } from './notify/telegram';

// 공유 re-export
export { KBO_TEAMS, DEFAULT_WEIGHTS, HOME_ADVANTAGE } from '@moneyball/shared';
export {
  CURRENT_SCORING_RULE,
  QUANT_PREGAME_VERSION,
  QUANT_POSTVIEW_VERSION,
  QUANT_LIVE_VERSION,
} from '@moneyball/shared';
export type { ScoringRule, ModelVersion, DebateVersion } from '@moneyball/shared';
