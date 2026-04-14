import type { TeamCode } from '@moneyball/shared';
import type { PitcherStats, TeamStats, EloRating, ScrapedGame } from '../types';

// 에이전트에 주입되는 경기 데이터
export interface GameContext {
  game: ScrapedGame;
  homeSPStats: PitcherStats | null;
  awaySPStats: PitcherStats | null;
  homeTeamStats: TeamStats;
  awayTeamStats: TeamStats;
  homeElo: EloRating;
  awayElo: EloRating;
  homeRecentForm: number;
  awayRecentForm: number;
  headToHead: { wins: number; losses: number };
  parkFactor: number;
}

// 팀 에이전트의 주장
export interface TeamArgument {
  team: TeamCode;
  strengths: string[];       // 자기 팀 강점
  opponentWeaknesses: string[]; // 상대 약점
  keyFactor: string;         // 가장 결정적 팩터
  confidence: number;        // 0-1, 자기 팀 승리 확신도
  reasoning: string;         // 종합 논거 (200자 내외)
}

// 회고 에이전트의 보정 힌트
export interface CalibrationHint {
  recentBias: string | null;     // "최근 홈팀 5% 과대평가" 등
  teamSpecific: string | null;   // "KIA 예측 3연패 중" 등
  modelWeakness: string | null;  // "불펜 FIP 과대평가 경향" 등
  adjustmentSuggestion: number;  // -0.05 ~ +0.05 보정값
}

// 심판 에이전트의 최종 결정
export interface JudgeVerdict {
  homeWinProb: number;       // 0-1
  confidence: number;        // 0-1
  homeArgSummary: string;    // 홈팀 에이전트 핵심 논거
  awayArgSummary: string;    // 원정 에이전트 핵심 논거
  calibrationApplied: string | null; // 적용된 보정
  reasoning: string;         // 최종 판단 근거 (블로그용)
  predictedWinner: TeamCode;
}

// 에이전트 호출 결과
export interface AgentResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  model: string;
  tokensUsed: number;
  durationMs: number;
}

// 전체 토론 결과
export interface DebateResult {
  game: ScrapedGame;
  homeArgument: TeamArgument;
  awayArgument: TeamArgument;
  calibration: CalibrationHint;
  verdict: JudgeVerdict;
  quantitativeProb: number;  // v1.5 정량 모델 결과
  totalTokens: number;
  totalDurationMs: number;
}
