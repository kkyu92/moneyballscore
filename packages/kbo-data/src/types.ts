import type { TeamCode, GameStatus } from '@moneyball/shared';

// KBO 공식 사이트 base URL — kbo-live / kbo-official / kbo-pitcher 공유.
// fangraphs / fancy-stats 는 다른 도메인이라 자체 BASE_URL 유지.
export const KBO_BASE_URL = 'https://www.koreabaseball.com';

// 자체 식별 User-Agent — kbo-official / kbo-pitcher / fangraphs / fancy-stats 공유.
// naver-record 는 모바일 페이지 차단 회피용 Mozilla UA + Referer 조합이라 별개 유지.
export const KBO_USER_AGENT = 'MoneyBall/1.0 (KBO Prediction Engine)';

// KBO API 응답 sanitize — kbo-live / kbo-official 공유.
// KBO API 가 가끔 JSON body 뒤에 HTML 에러 페이지를 concat 해서 리턴 (응답 자체는 200).
// 첫 '}<' 패턴까지 자르면 안전한 JSON 만 추출. 패턴 부재 시 원본 그대로.
export function sanitizeKboJsonResponse(text: string): string {
  const jsonEnd = text.indexOf('}<') !== -1 ? text.indexOf('}<') + 1 : text.length;
  return text.slice(0, jsonEnd);
}

// fetch 결과 res.ok 검증 — 6 scraper 파일 (kbo-live / kbo-official / kbo-pitcher /
// naver-schedule / naver-record / fancy-stats) 공유. 통일 형식: `${label}: ${status} ${statusText}`.
// statusText 가 빈 문자열이면 status 만 포함 (trim). silent drift family scrapers 차원
// 18번째 진입 — 호출 site 가 매번 자체 throw 했을 때 status only / statusText 포함 mismatch
// 박제 패턴. naver-record 등 404→null fallback 케이스는 호출 site 에서 status 분기 후
// 본 helper 호출 (404 외 path).
export function assertResponseOk(res: Response, label: string): void {
  if (res.ok) return;
  const suffix = res.statusText ? `${res.status} ${res.statusText}` : `${res.status}`;
  throw new Error(`${label}: ${suffix}`);
}

// ============================================
// 스크래퍼 반환 타입
// ============================================

/**
 * KBO API raw status fingerprint — status 이상 발생 시 원인 추적용.
 * shouldPredictGame 이 `not_scheduled`/`sp_unconfirmed` 로 skip 할 때
 * pipeline_runs.skipped_detail 에 동봉되어 사후 어느 필드 때문인지 식별.
 */
export interface RawStatusSnapshot {
  state_sc?: string | null;    // GAME_STATE_SC
  inn_no?: number | null;      // GAME_INN_NO
  cancel_sc_id?: string | null;// CANCEL_SC_ID
  cancel_sc_nm?: string | null;// CANCEL_SC_NM
  result_ck?: number | null;   // GAME_RESULT_CK
}

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
  /** KBO API raw status snapshot — skipped_detail 동봉용 (생산 안정성 무관, 관측용) */
  rawStatus?: RawStatusSnapshot;
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

// Phase v4-4 C2-B: 타자 시즌 스탯 (KBO Fancy Stats /leaders/ 파싱)
export interface BatterStats {
  name: string;
  team: TeamCode;
  position: string | null;
  age: number | null;
  war: number;      // WAR, Batters 테이블
  wrcPlus: number;  // wRC+ 테이블
  ops: number;      // OPS 테이블
  iso: number;      // ISO 테이블
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

/**
 * 경기 단위 스킵 사유 — shouldPredictGame 의 reason 을 보존.
 * pipeline_runs.skipped_detail 로 저장되어 사후 분석 가능.
 */
export interface SkippedGame {
  game: string;    // "LTvHH@17:00" — 판독 편의용 포맷
  reason: string;  // 'window_too_early' | 'window_too_late' | 'not_scheduled' | 'sp_unconfirmed' | 'already_predicted'
  /** not_scheduled / sp_unconfirmed 등 KBO API status 이상 케이스에서만 동봉. 재발 시 어느 필드 때문인지 특정. */
  raw?: RawStatusSnapshot;
}

export interface PipelineResult {
  date: string;
  gamesFound: number;
  predictionsGenerated: number;
  gamesSkipped: number;    // 선발 미확정 등
  errors: string[];
  skippedDetail?: SkippedGame[];
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
  G_TM: string;        // HH:mm
  S_NM: string;        // 구장명
  HOME_NM: string;     // 홈팀명 (한글)
  AWAY_NM: string;     // 원정팀명 (한글)
  HOME_ID: string;     // 홈팀 코드
  AWAY_ID: string;     // 원정팀 코드
  B_PIT_P_NM?: string; // 홈 선발투수
  T_PIT_P_NM?: string; // 원정 선발투수
  // 점수 — T=원정(Top), B=홈(Bottom)
  T_SCORE_CN?: string;  // 원정 점수 (문자열)
  B_SCORE_CN?: string;  // 홈 점수 (문자열)
  // 경기 상태
  GAME_STATE_SC?: string;  // "1"=경기전, "2"=진행중, "3"=종료
  GAME_RESULT_CK?: number; // 1=결과 확정
  GAME_INN_NO?: number;    // 현재 이닝
  GAME_TB_SC?: string;     // "T"=초, "B"=말
  CANCEL_SC_ID?: string;   // "0"=정상, "1"/"2"=취소
  CANCEL_SC_NM?: string;   // "정상경기" / "우천취소" / etc. — 관측용
  // deprecated — 실제 API에 없음, 호환성 유지
  HOME_SCORE?: number;
  AWAY_SCORE?: number;
  GAME_SC_HEADER_NM?: string;
  G_ST?: string;
}

// 팀 한글명 → TeamCode 매핑
export const TEAM_NAME_MAP: Record<string, TeamCode> = {
  'SSG': 'SK',
  'KIA': 'HT',
  'LG': 'LG',
  '두산': 'OB',
  'KT': 'KT',
  '삼성': 'SS',
  '롯데': 'LT',
  '한화': 'HH',
  'NC': 'NC',
  '키움': 'WO',
};

// KBO 공식 사이트 + KBO live API scraper 가 받는 한글 팀명 매핑.
// fancy-stats / fangraphs 의 resolveTeamCode 와는 별개 — 그쪽은 영문 매핑 +
// 양방향 includes 로 다른 동작이라 통일 X.
export function resolveKoreanTeamCode(name: string): TeamCode | null {
  if (TEAM_NAME_MAP[name]) return TEAM_NAME_MAP[name];
  for (const [key, code] of Object.entries(TEAM_NAME_MAP)) {
    if (name.includes(key)) return code;
  }
  return null;
}
