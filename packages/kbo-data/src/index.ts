// KBO 데이터 수집 + 예측 엔진 모듈

// 타입
export type {
  ScrapedGame,
  PitcherStats,
  TeamStats,
  EloRating,
  PredictionInput,
  PredictionResult,
  PipelineResult,
} from './types';
export { TEAM_NAME_MAP } from './types';

// 스크래퍼
export { fetchGames, fetchRecentForm, fetchHeadToHead, DEFAULT_PARK_FACTORS } from './scrapers/kbo-official';
export { fetchPitcherStats, fetchTeamStats, fetchEloRatings, findPitcher } from './scrapers/fancy-stats';
export { fetchBatterLeaders } from './scrapers/fangraphs';

// 예측 엔진
export { predict } from './engine/predictor';

// 파이프라인
export { runDailyPipeline } from './pipeline/daily';
export { runLiveUpdate } from './pipeline/live';

// 라이브
export { fetchLiveGames, adjustWinProbability } from './scrapers/kbo-live';

// 에이전트
export { runDebate } from './agents/debate';
export type { DebateResult, GameContext, TeamArgument, JudgeVerdict, CalibrationHint } from './agents/types';

// 알림
export { notifyPredictions, notifyResults, notifyError, notifyPipelineStatus } from './notify/telegram';

// 공유 re-export
export { KBO_TEAMS, DEFAULT_WEIGHTS, HOME_ADVANTAGE } from '@moneyball/shared';
