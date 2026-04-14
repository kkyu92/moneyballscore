import type { TeamCode, GameStatus } from '@moneyball/shared';

// ============================================
// 스크래퍼 반환 타입
// ============================================

export interface ScrapedGame {
  date: string;           // YYYY-MM-DD
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  gameTime: string;       // HH:MM
  stadium: string;
  homeSP?: string;        // 선발투수 이름
  awaySP?: string;
  status: GameStatus;
  homeScore?: number;
  awayScore?: number;
  externalGameId: string; // KBO 공식 게임 ID
}

export interface PitcherStats {
  name: string;
  team: TeamCode;
  fip: number;
  xfip: number;
  era: number;
  innings: number;
  war: number;
  kPer9: number;
}

export interface TeamStats {
  team: TeamCode;
  woba: number;
  wrcPlus?: number;     // FanGraphs
  iso?: number;         // FanGraphs
  bullpenFip: number;
  totalWar: number;
  sfr: number;          // 수비력
}

export interface EloRating {
  team: TeamCode;
  elo: number;
  winPct: number;
}

// ============================================
// 예측 엔진 입출력
// ============================================

export interface PredictionInput {
  game: ScrapedGame;
  homeSPStats: PitcherStats | null;
  awaySPStats: PitcherStats | null;
  homeTeamStats: TeamStats;
  awayTeamStats: TeamStats;
  homeElo: EloRating;
  awayElo: EloRating;
  headToHead: { wins: number; losses: number };
  homeRecentForm: number;  // 최근 10경기 승률 (0-1)
  awayRecentForm: number;
  parkFactor: number;      // 1.0 = 중립, >1 = 타자 유리
}

export interface PredictionResult {
  predictedWinner: TeamCode;
  homeWinProb: number;     // 0-1
  confidence: number;      // 0-1
  factors: Record<string, number>;  // 각 팩터 기여도
  reasoning: string;       // 예측 근거 요약
}

// ============================================
// 파이프라인 결과
// ============================================

export interface PipelineResult {
  date: string;
  gamesFound: number;
  predictionsGenerated: number;
  gamesSkipped: number;    // 선발 미확정 등
  errors: string[];
}

// ============================================
// KBO 공식 API 응답 타입
// ============================================

export interface KBOGameListResponse {
  d: string; // JSON string of game array
}

export interface KBOGameRaw {
  G_ID: string;
  G_DT: string;        // YYYYMMDD
  G_TM: string;        // HHmm
  S_NM: string;        // 구장명
  T_NM_H: string;      // 홈팀명 (한글)
  T_NM_A: string;      // 원정팀명 (한글)
  P_NM_H?: string;     // 홈 선발투수
  P_NM_A?: string;     // 원정 선발투수
  SC_H?: string;       // 홈 점수
  SC_A?: string;       // 원정 점수
  G_ST: string;         // 경기 상태
}

// 팀 한글명 → TeamCode 매핑
export const TEAM_NAME_MAP: Record<string, TeamCode> = {
  'SSG': 'SSG',
  'KIA': 'KIA',
  'LG': 'LGT',
  '두산': 'DSB',
  'KT': 'KTW',
  '삼성': 'SSA',
  '롯데': 'LOT',
  '한화': 'HHE',
  'NC': 'NCB',
  '키움': 'KIW',
};
