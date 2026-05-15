// Phase v4-4: 라이벌리 정의 re-export
export { KBO_RIVALRIES, isRivalry } from './rivalries';

// 한국어 조사 자동 선택 helper (받침 유무 판별)
export { hasJongsung, josa, ro } from './korean';

// supabase `.error` 미체크 silent drift 가드 helper (cycle 147 — 양쪽 package 공유)
// cycle 168 — write 측 sub-family 진입 (assertWriteOk 추가)
export { assertSelectOk, assertWriteOk } from './db-error';
export type { SelectResult, WriteResult } from './db-error';

// model_version / scoring_rule 라벨 단일 source (cycle 448 통합 + cycle 475
// ALL_SCORING_RULES tuple 도출)
export {
  ALL_SCORING_RULES,
  CURRENT_SCORING_RULE,
  QUANT_PREGAME_VERSION,
  QUANT_POSTVIEW_VERSION,
  QUANT_LIVE_VERSION,
  LLM_DEBATE_VERSION,
  LLM_POSTVIEW_VERSION,
  LLM_ACTIVE_VERSIONS,
  DEBATE_VERSION_PREGAME,
  DEBATE_VERSION_POSTVIEW,
} from './model-version-labels';
export type { ScoringRule, ModelVersion, DebateVersion } from './model-version-labels';

// KBO 팀 코드 (KBO 공식 API 코드 기준)
// parkPf / parkNote: Phase v4-2에서 추가. ~/moneyball_debate/personas/teams.yaml 기반.
export const KBO_TEAMS = {
  SK: { name: 'SSG 랜더스', stadium: '인천SSG랜더스필드', color: '#CE0E2D', parkPf: 105, parkNote: '타자 친화 (짧은 펜스)' },
  HT: { name: 'KIA 타이거즈', stadium: '광주-기아 챔피언스 필드', color: '#EA0029', parkPf: 100, parkNote: '중립' },
  LG: { name: 'LG 트윈스', stadium: '서울종합운동장 야구장', color: '#C30452', parkPf: 95, parkNote: '투수 친화 (장타 억제)' },
  OB: { name: '두산 베어스', stadium: '서울종합운동장 야구장', color: '#131230', parkPf: 95, parkNote: '투수 친화 (LG와 공유)' },
  KT: { name: 'KT 위즈', stadium: '수원KT위즈파크', color: '#000000', parkPf: 98, parkNote: '중립~약 투수 친화' },
  SS: { name: '삼성 라이온즈', stadium: '대구삼성라이온즈파크', color: '#074CA1', parkPf: 108, parkNote: '극단적 타자 친화 (홈런↑)' },
  LT: { name: '롯데 자이언츠', stadium: '부산사직야구장', color: '#002B5C', parkPf: 103, parkNote: '약 타자 친화' },
  HH: { name: '한화 이글스', stadium: '대전한화생명이글스파크', color: '#FF6600', parkPf: 101, parkNote: '중립~약 타자 친화 (2025 신축, 표본 좁음)' },
  NC: { name: 'NC 다이노스', stadium: '창원NC파크', color: '#315288', parkPf: 100, parkNote: '중립' },
  WO: { name: '키움 히어로즈', stadium: '서울고척스카이돔', color: '#570514', parkPf: 92, parkNote: '극단적 투수 친화 (KBO 유일 돔)' },
} as const;

export type TeamCode = keyof typeof KBO_TEAMS;

/**
 * 구장 짧은 이름 — UI 노출용. KBO_TEAMS.stadium 은 정식 명칭이라 UI 에 길고,
 * KBO 공식 API S_NM 은 짧은 지역명 ("대구", "잠실") 을 리턴. Naver basic
 * 응답처럼 stadium 필드가 비어 있을 때 fallback 용 상수.
 */
export const KBO_STADIUM_SHORT: Record<TeamCode, string> = {
  SK: '인천', HT: '광주', LG: '잠실', OB: '잠실',
  KT: '수원', SS: '대구', LT: '부산', HH: '대전',
  NC: '창원', WO: '고척',
};

/**
 * 팀 단축 이름 — 모든 UI 에서 일관 사용. `KBO_TEAMS[code].name.split(' ')[0]`
 * 로 흩어져 있던 패턴을 중앙 상수로 대체. split 실패 / undefined team code /
 * 한글 공백 등 엣지케이스 방지.
 * 이미지 기준 (사용자 요구): 한화 / 두산 / SSG / KIA / NC / LG / 롯데 / 삼성 / KT / 키움
 */
export const KBO_TEAM_SHORT_NAME: Record<TeamCode, string> = {
  SK: 'SSG', HT: 'KIA', LG: 'LG', OB: '두산', KT: 'KT',
  SS: '삼성', LT: '롯데', HH: '한화', NC: 'NC', WO: '키움',
};

/**
 * 팀 단축 이름 안전 조회. 미지 / null code 는 그대로 문자열 반환 (crash 방지).
 */
export function shortTeamName(code: TeamCode | string | null | undefined): string {
  if (!code) return '';
  if (code in KBO_TEAM_SHORT_NAME) return KBO_TEAM_SHORT_NAME[code as TeamCode];
  return String(code);
}

/**
 * 구장 좌표 — 날씨 API (Open-Meteo) 조회용.
 * 키는 TeamCode (홈팀). 실측 위도/경도 (소수점 4자리 = ~11m 정확).
 */
export const KBO_STADIUM_COORDS: Record<TeamCode, { lat: number; lng: number }> = {
  SK: { lat: 37.4372, lng: 126.6932 }, // 인천SSG랜더스필드
  HT: { lat: 35.1682, lng: 126.8887 }, // 광주-기아 챔피언스 필드
  LG: { lat: 37.5121, lng: 127.0719 }, // 잠실
  OB: { lat: 37.5121, lng: 127.0719 }, // 잠실 (LG/OB 공유)
  KT: { lat: 37.2997, lng: 127.0097 }, // 수원KT위즈파크
  SS: { lat: 35.8414, lng: 128.6811 }, // 대구삼성라이온즈파크
  LT: { lat: 35.1942, lng: 129.0615 }, // 부산사직야구장
  HH: { lat: 36.3172, lng: 127.4292 }, // 대전한화생명이글스파크
  NC: { lat: 35.2225, lng: 128.5827 }, // 창원NC파크
  WO: { lat: 37.4982, lng: 126.8670 }, // 서울고척스카이돔 (돔구장 — 날씨 영향 없음 주의)
};

// 경기 상태
export type GameStatus = 'scheduled' | 'live' | 'final' | 'postponed';

// 포스트 타입
export type PostType = 'preview' | 'review' | 'weekly' | 'monthly';

// 예측 엔진 가중치 v1.8 — head_to_head 노이즈 감축 + Elo 보상
//
// 2026-05-12 cycle 335 변경 — W20/W21 실측 데이터 기반 선제 조정 (Sunday cap 선례).
//
// head_to_head noise 누적 증거:
//   W20: 방향 적중률 35.3% (n=17) — 랜덤(50%) 이하. 역전 패턴 발견
//        낮은 h2h 구간(0.0~0.33)에서 저확신이 오히려 정답 (63.2% vs 37.5%)
//   W21: head_to_head noise 재확인 (cycle 333 lesson)
//   v2.0 후보 (cycle 231 정보가치 분석): head_to_head Δ=-0.10 (음의 기여)
//
// Elo 근거:
//   v2.0 후보 정보가치 Δ=+0.30 (최강). 13% 목표치 대비 단계적 증가.
//
// 변경: head_to_head 5%→3% (-2pp) / elo 8%→10% (+2pp). 합계 0.85 유지.
// Sunday cap (cycle 309) 와 동일 선례 — n=150 전 방향 명확 시 선제 적용.
// n=150 도달 후 full v2.0 (elo 13%, bullpen_fip 14% 등) 재확정 예정.
//
// v1.8 가중치:
//   선발FIP 15% / 선발xFIP 5% / 타선wOBA 15% / 불펜FIP 10% / 최근폼 10%
//   WAR 8% / 상대전적 3% / 구장보정 4% / Elo 10% / 수비SFR 5%
// 합계 0.85.
export const DEFAULT_WEIGHTS = {
  sp_fip: 0.15,
  sp_xfip: 0.05,
  lineup_woba: 0.15,
  bullpen_fip: 0.10,
  recent_form: 0.10,
  war: 0.08,
  head_to_head: 0.03,
  park_factor: 0.04,
  elo: 0.10,
  sfr: 0.05,
} as const;

export type WeightKey = keyof typeof DEFAULT_WEIGHTS;

// 홈팀 어드밴티지 — 데이터 측정 기반.
// 2026-04-21 측정 (2023+2024+2025+2026 N=2180): 51.93% ±2.10pp → advantage 1.93pp.
// 시즌별: 2023 (52.77%) / 2024 (51.44%) / 2025 (51.54%) — 2년 평균 51.49% + 2023 outlier.
// 현재 0.015 (51.5%) 와 gap 0.43pp, 통계적 유의미 수준 아님 → 유지.
export const HOME_ADVANTAGE = 0.015;

/**
 * 예측 승자 적중 확률 (winnerProb = max(hwp, 1-hwp)) 기반 3단계 라벨.
 *
 * 단일 anchor 원칙: "누가 이길지"와 그 적중률을 사용자에게 노출. confidence
 * 축은 debate 심판 LLM 주관값이라 winnerProb 와 de-couple 돼 있어 폐기.
 *
 * 임계값 + 이모지 (Telegram + UI 공통 단일 출처, 고정) —
 *   confident (🔥 적중): winnerProb ≥ 0.65
 *   lean      (📈 유력): 0.55 ≤ winnerProb < 0.65
 *   tossup    (🤔 반반): winnerProb < 0.55
 */
export const WINNER_PROB_CONFIDENT = 0.65;
export const WINNER_PROB_LEAN = 0.55;

export type WinnerConfidenceTier = 'confident' | 'lean' | 'tossup';

/** homeWinProb → 예측 승자 적중 확률. null-safe. */
export function winnerProbOf(homeWinProb: number | null | undefined): number {
  if (homeWinProb == null) return 0.5;
  return Math.max(homeWinProb, 1 - homeWinProb);
}

/** homeWinProb → 3단계 tier. null 은 tossup 으로 간주. */
export function classifyWinnerProb(
  homeWinProb: number | null | undefined,
): WinnerConfidenceTier {
  const wp = winnerProbOf(homeWinProb);
  if (wp >= WINNER_PROB_CONFIDENT) return 'confident';
  if (wp >= WINNER_PROB_LEAN) return 'lean';
  return 'tossup';
}

/** tier → 한글 라벨 (사용자 노출, Telegram + UI 공통). */
export const WINNER_TIER_LABEL: Record<WinnerConfidenceTier, string> = {
  confident: '적중',
  lean: '유력',
  tossup: '반반',
};

/**
 * tier → 이모지 (고정, tier 당 1개).
 *   적중 🔥 / 유력 📈 / 반반 🤔
 *
 * 과거 pool 랜덤이었으나 같은 경기 재발송 시 이모지가 달라지는
 * 혼동이 있어 2026-04-24 고정화. 배열 형태는 pickTierEmoji API 호환성 유지.
 */
export const WINNER_TIER_EMOJI_POOL: Record<WinnerConfidenceTier, readonly string[]> = {
  confident: ['🔥'],
  lean: ['📈'],
  tossup: ['🤔'],
};

/** tier → 이모지 1개. 고정 pool 이라 결정론적. */
export function pickTierEmoji(tier: WinnerConfidenceTier): string {
  const pool = WINNER_TIER_EMOJI_POOL[tier];
  return pool[0] ?? '';
}

// 신뢰도 → Tailwind 색상 클래스
export function getConfidenceColor(pct: number): string {
  if (pct >= 65) return 'text-green-600';
  if (pct >= 55) return 'text-yellow-600';
  return 'text-gray-600';
}

// 적중률 → Tailwind 색상 클래스 (낮은 값에 빨간색)
export function getAccuracyColor(pct: number): string {
  if (pct >= 65) return 'text-green-600';
  if (pct >= 55) return 'text-yellow-600';
  return 'text-red-600';
}

// KST 기준 YYYY-MM-DD 문자열 생성
export function toKSTDateString(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// KST 기준 한국어 날짜 표시 (예: 2026년 04월 14일)
export function toKSTDisplayString(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일`;
}

// KST 기준 이번 주 월요일~일요일 ISO date string range (cycle 457 통합 — picks/leaderboard silent drift family).
// buildPicksStats.getKSTWeekRange + leaderboard/server.fetchAiBaseline weekly KST monday calc 단일 source.
export function getKSTWeekRange(now: Date = new Date()): { start: string; end: string } {
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const monMs = kstMs - ((new Date(kstMs).getUTCDay() + 6) % 7) * 86400000;
  const sunMs = monMs + 6 * 86400000;
  return {
    start: new Date(monMs).toISOString().slice(0, 10),
    end: new Date(sunMs).toISOString().slice(0, 10),
  };
}

// KST 기준 이번 주 월요일 00:00 의 UTC ISO timestamp. Supabase `.gte(verified_at, ...)` SQL 필터용.
export function getKSTMondayUtcIso(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dow = kst.getUTCDay();
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  const monday = new Date(kst);
  monday.setUTCDate(monday.getUTCDate() - mondayOffset);
  monday.setUTCHours(0, 0, 0, 0);
  return new Date(monday.getTime() - 9 * 60 * 60 * 1000).toISOString();
}

// catch (e) { ... e instanceof Error ? e.message : String(e) } 패턴 단일 source.
// cycle 468 review-code heavy — silent drift family streak 15 cycle 째.
// 14 file 41 곳 (daily.ts 22 / live.ts 4 / 기타) 통합.
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
