// Phase v4-4: 라이벌리 정의 re-export
export { KBO_RIVALRIES, isRivalry } from './rivalries';

// 한국어 조사 자동 선택 helper (받침 유무 판별)
export { hasJongsung, josa, ro } from './korean';

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

// 예측 엔진 가중치 v1.7-revert (= v1.5 가중치 복원)
//
// 2026-05-04 cycle 17 회귀 결정 — prod 측정이 Wayback 백테스트와 정반대.
//
// v1.5 vs v1.6 prod 측정 (cycle 14, N=62, 2026-04-22 ~ 2026-05-03):
//   v1.5: N=16  hits=12  acc=75.00%  Brier=0.2143  CI95=[53.78, 96.22]
//   v1.6: N=46  hits=17  acc=36.96%  Brier=0.2559  CI95=[23.01, 50.91]
//   격차 38.04pp / CI95 비중첩 (margin 0.03pp) / Brier +0.0416 악화
//   v1.6 high-confidence (≥65%) N=2 둘 다 wrong → calibration 압축 + 망김
//
// 시즌 효과 통제 (cycle 16, 4월 only):
//   4월 v1.5: N=16  acc=75.00%
//   4월 v1.6: N=31  acc=35.48%
//   격차 39.52pp (전체 38.04pp 보다 +1.48pp 더 큼) → H3 (시즌 초 noise) 반증
//
// LLM 갭 통제 (cycle 15 PR #54):
//   가중치 0% factor LLM SYSTEM_PROMPT 추론 금지 박제 후에도 prod 격차 그대로
//
// 결론: v1.6 의 Wayback 백테스트 학습 (lineup_woba 유의미) prod 적용 시 정반대.
// 1 시즌 train / 1 시즌 test 한계 + 시점 distribution shift 의심. 데이터로만
// 이야기 — 측정된 우수 가중치 (v1.5) 로 회귀. cycle 18+ Wayback 신뢰성 재검토.
//
// v1.5 가중치 (CLAUDE.md § 예측 엔진 가중치):
//   선발FIP 15% / 선발xFIP 5% / 타선wOBA 15% / 불펜FIP 10% / 최근폼 10%
//   WAR 8% / 상대전적 5% / 구장보정 4% / Elo 8% / 수비SFR 5%
// 합계 0.85 (v1.6 동일).
export const DEFAULT_WEIGHTS = {
  sp_fip: 0.15,
  sp_xfip: 0.05,
  lineup_woba: 0.15,
  bullpen_fip: 0.10,
  recent_form: 0.10,
  war: 0.08,
  head_to_head: 0.05,
  park_factor: 0.04,
  elo: 0.08,
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
