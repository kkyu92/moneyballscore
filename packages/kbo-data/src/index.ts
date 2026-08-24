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
export {
  computeShadowPrediction,
  shadowBrierDelta,
  insertShadowRow,
  type ShadowComputeResult,
  type ShadowRowInsertInput,
  type ShadowRowInsertResult,
} from './pipeline/shadow-cohort';
export {
  captureFactorAnomalyAlert,
  type FactorAnomalyAlertMeta,
} from './pipeline/silent-drift-alert';
export { runPostviewDaily } from './pipeline/postview-daily';
export type { PostviewDailyResult } from './pipeline/postview-daily';
export { buildAccuracyUpdates } from './pipeline/accuracy-update';
export { computeWinnerTeamId } from './pipeline/winner-id';
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

// MLB 14팩터 본선
export {
  MLB_BASE_WEIGHTS,
  MLB_KBO_FACTOR_KEYS,
  MLB_STATCAST_FACTOR_KEYS,
  MLB_FACTOR_COUNTS,
  MLB_PLACEHOLDER_FACTOR_KEYS,
  HOME_ELO_BONUS_VALUE,
  computeMlbProbability,
} from './factors/mlb-base';
export type { MlbFactorInputs } from './factors/mlb-base';

// MLB 개별 경기 waterfall (analysis/game parity — cycle 2104)
export { computeMlbWaterfall } from './factors/mlb-waterfall';
export type { MlbWaterfallInput, MlbWaterfallBar, MlbWaterfallPair } from './factors/mlb-waterfall';

// MLB 개별 경기 AI 종합 분석 요약 prose (analysis/game GameAnalysisProse parity — cycle 2110)
export { buildMlbGameOverview } from './factors/mlb-overview';
export type { MlbGameOverviewNarrative } from './factors/mlb-overview';

// MLB 개별 경기 팩터별 상세 해설 (analysis/game DetailedFactorAnalysis parity — cycle 2171)
export { buildMlbFactorDetailRows } from './factors/mlb-factor-detail';
export type { MlbFactorDetailRow } from './factors/mlb-factor-detail';

// MLB Shadow C 학습 milestone (walk-forward expanding window)
export { MILESTONE_TRIGGERS as MLB_SHADOW_C_MILESTONES } from './factors/mlb-shadow-c';

// MLB Elo K-factor 갱신 엔진 (plan #25 Phase 1-2b)
export {
  MLB_ELO_K,
  MLB_ELO_K_POSTSEASON,
  MLB_ELO_INITIAL_RATING,
  expectedHomeWinProb,
  updateMlbElo,
  computeMlbEloRatings,
  computeMlbEloHistory,
} from './factors/mlb-elo';
export type {
  MlbEloUpdateResult,
  MlbFinalGameForElo,
  MlbTeamEloState,
  MlbEloHistoryEntry,
} from './factors/mlb-elo';

// MLB 파이프라인
export { runMlbPipeline } from './pipeline/mlb-pipeline';
export type { MlbPipelineMode, MlbPipelineResult } from './pipeline/mlb-pipeline';

// 라이브
export { fetchLiveGames, adjustWinProbability } from './scrapers/kbo-live';

// 에이전트
export { runDebate } from './agents/debate';
export type { DebateResult, GameContext, TeamArgument, JudgeVerdict, CalibrationHint } from './agents/types';

// LLM Agent context layer (plan #23 Step 1, cycle 1225)
export {
  MetricRegistry,
  FANGRAPHS_AUX_METRICS,
  getProductionMetrics,
  isMetricValueValid,
  renderMetricForLLM,
} from './context/metrics';
export type {
  MetricDefinition,
  MetricSlug,
  MetricUnit,
  MetricSource,
  MetricDirection,
} from './context/metrics';

// LLM Agent KBO Domain KB (plan #23 Step 2, cycle 1226)
export {
  KBO_PARKS,
  KBO_DOMAIN_KB,
  SEASON_PHASES,
  TIME_WINDOWS,
  getSeasonPhase,
  renderParkForLLM,
  renderRivalryForLLM,
  renderSeasonForLLM,
  renderTimeWindowsForLLM,
} from './context/domain';
export type {
  ParkContext,
  SeasonPhase,
  TimeWindowKey,
} from './context/domain';

// LLM Agent 표준 ContextPayload (plan #23 Step 3, cycle 1227)
export {
  buildAgentContext,
  renderContextForLLM,
} from './context/agent-context';
export type {
  AgentContext,
  AgentGameMeta,
  MetricObservation,
} from './context/agent-context';

// LLM Agent 회귀 가드 + 측정 harness (plan #23 Step 4, cycle 1228 / 1235 Brier delta)
export {
  extractMetricPairsFromText,
  measureHallucinations,
  estimatePromptTokens,
  measureContextTokenBudget,
  measureBrierStats,
  measureContextLayerBrierDelta,
} from './context/measurement';
export type {
  HallucinationStats,
  TokenBudgetStats,
  JudgmentRecord,
  BrierStats,
  ContextLayerBrierDelta,
} from './context/measurement';

// 알림
export { notifyPredictions, notifyResults, notifyError, notifyPipelineStatus } from './notify/telegram';

// DB UNIQUE constraint 단일 소스 (silent drift 방어)
export { DB_CONSTRAINTS } from './pipeline/db-constraints';
export type { DbConstraintKey } from './pipeline/db-constraints';

// 공유 re-export
export { KBO_TEAMS, DEFAULT_WEIGHTS, HOME_ADVANTAGE } from '@moneyball/shared';
export {
  CURRENT_SCORING_RULE,
  QUANT_PREGAME_VERSION,
  QUANT_POSTVIEW_VERSION,
  QUANT_LIVE_VERSION,
} from '@moneyball/shared';
export type { ScoringRule, ModelVersion, DebateVersion } from '@moneyball/shared';
