// 라이벌리 정의 re-export (빅매치 rivalry_bonus 가산점 source)
export { KBO_RIVALRIES, isRivalry } from './rivalries';

// MLB 30팀 + division mapping — Plan B Tier C+D Task 3 prerequisite helper sprint
export {
  MLB_TEAMS,
  MLB_DIVISIONS,
  MLB_TEAMS_PRE_RENDER,
  mlbShortTeamName,
  mlbTeamDivision,
} from './mlb-teams';
export type { MlbTeamCode, MlbLeagueSide, MlbDivisionSide } from './mlb-teams';

// MLB 팀 수 / division 수 — wave 80 (cycle 1284) "30팀 / 30 teams / 6 division(s) / 6 디비전" 하드코딩 sweep 단일 source.
// MLB_TEAMS / MLB_DIVISIONS 변경 시 자동 동기.
import { MLB_TEAMS as _MLB_TEAMS, MLB_DIVISIONS as _MLB_DIVISIONS } from './mlb-teams';
export const MLB_TEAM_COUNT = Object.keys(_MLB_TEAMS).length;
export const MLB_DIVISION_COUNT =
  Object.keys(_MLB_DIVISIONS.AL).length + Object.keys(_MLB_DIVISIONS.NL).length;

// 한국어 조사 자동 선택 helper (받침 유무 판별)
export { hasJongsung, josa, ro } from './korean';

// Server-side feature flags (apps + pipelines 공유 단일 source — cycle 1127 plan-v17 candidate N Tier 2 callsite swap)
export {
  isBigMatchEnabled,
  isV2ModelEnabled,
  isV21BShadowEnabled,
  isDebateEnabled,
  isPostviewEnabled,
} from './feature-flags';

// supabase `.error` 미체크 silent drift 가드 helper (cycle 147 — 양쪽 package 공유)
// cycle 168 — write 측 sub-family 진입 (assertWriteOk 추가)
export { assertSelectOk, assertWriteOk } from './db-error';
export type { SelectResult, WriteResult } from './db-error';

// model_version / scoring_rule 라벨 단일 source (cycle 448 통합 + cycle 475
// ALL_SCORING_RULES tuple 도출)
export {
  ALL_SCORING_RULES,
  CURRENT_SCORING_RULE,
  PRODUCTION_COHORT_RULES,
  SHADOW_SCORING_RULE,
  SHADOW_V20_SCORING_RULE,
  TABPFN_SCORING_RULE,
  QUANT_PREGAME_VERSION,
  QUANT_POSTVIEW_VERSION,
  QUANT_LIVE_VERSION,
  LLM_DEBATE_VERSION,
  LLM_POSTVIEW_VERSION,
  LLM_ACTIVE_VERSIONS,
  DEBATE_VERSION_PREGAME,
  DEBATE_VERSION_POSTVIEW,
  V2_PROMOTION_COHORT_N,
} from './model-version-labels';
export type { ScoringRule, ModelVersion, DebateVersion } from './model-version-labels';

// KBO 팀 코드 (KBO 공식 API 코드 기준)
// parkPf / parkNote: 구장 보정 계수 (100 = 중립, 100+ 타자 친화, 100- 투수 친화).
// `~/moneyball_debate/personas/teams.yaml` 기반.
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
 * KBO 팀 수 — 사이트 전반 metadata/OG/JSX 에서 "KBO 10팀" / "10 teams" 하드코딩 sweep 용 단일 source.
 * silent drift family wave 76 (cycle 1278) — wave 67-75 MLB_FACTOR_COUNTS 패턴의 KBO 차원 확장.
 * KBO_TEAMS 변경 시 자동 동기 (Object.keys length).
 */
export const KBO_TEAM_COUNT = Object.keys(KBO_TEAMS).length;

/**
 * KBO 팀 간 head-to-head 페어 조합 수 — matchup 허브 (page + opengraph-image + twitter-image)
 * 3 surface 에 "45가지 맞대결 조합" / "45 head-to-head combos" 하드코딩 sweep 용 단일 source.
 * silent drift family wave 107 (cycle 1321) — wave 76 (KBO_TEAM_COUNT) / wave 83 (KBO_FACTOR_COUNT) /
 * wave 86 (KBO_SEASON_YEAR) / wave 87 (KBO_PREDICT_DAILY_TIME_KST) 패턴의 KBO 팀 차원 derived 확장.
 * C(KBO_TEAM_COUNT, 2) — KBO_TEAM_COUNT 변경 시 자동 동기.
 */
export const KBO_HEAD_TO_HEAD_PAIRS =
  (KBO_TEAM_COUNT * (KBO_TEAM_COUNT - 1)) / 2;

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

// 경기 상태 — ALL_GAME_STATUSES tuple (line 246+) 로 통합 (cycle 1021 autoplan Eng-C2 fix)

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
//
// Shadow-only factor (M-F1 / M-F2 cycle 1013, 2026-05-28):
//   park_weather 0% — Open-Meteo 기상 영향 (저온 / 외야 바람 / 강수). 박제: factors/park-weather.ts.
//   umpire_sz    0% — 주심 strike zone bias (umpire_stats DB lookup). 박제: factors/umpire-sz.ts.
// production 가중치 0, shadow cohort (v2.1-B-shadow) 에서만 weight>0 로 활성.
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
  park_weather: 0,
  umpire_sz: 0,
} as const;

/**
 * Production-active factor keys — v1.8 까지 weight>0 인 10 factor.
 * shadow-only factor (park_weather, umpire_sz) 와 분리해서 invariant 테스트 / UI 활성 표시에 사용.
 */
export const ACTIVE_FACTOR_KEYS = [
  'sp_fip',
  'sp_xfip',
  'lineup_woba',
  'bullpen_fip',
  'recent_form',
  'war',
  'head_to_head',
  'park_factor',
  'elo',
  'sfr',
] as const;

/**
 * KBO 정량 모델 팩터 수 — 사이트 전반 metadata/OG/JSX 의 "10팩터 / 10 factors / 10-factor / 10개 팩터 / 10개 세이버메트릭스 지표" 하드코딩 sweep 용 단일 source.
 * silent drift family wave 83 (cycle 1287) — wave 76 (KBO_TEAM_COUNT) / wave 75-78 (MLB_FACTOR_COUNTS) 패턴의 KBO factor 차원 확장.
 * ACTIVE_FACTOR_KEYS 변경 시 자동 동기 (length).
 */
export const KBO_FACTOR_COUNT = ACTIVE_FACTOR_KEYS.length;

/**
 * 현재 KBO 시즌 연도 — standings / dashboard / OG image / metadata 의 "2026 KBO" / "2026 season" / "2026 시즌" 하드코딩 sweep 용 단일 source.
 * silent drift family wave 86 (cycle 1294) — wave 76 (KBO_TEAM_COUNT) / wave 83 (KBO_FACTOR_COUNT) 패턴의 KBO 시즌 차원 확장.
 * 매 시즌 끝 (11월) 다음 연도 1 라인 갱신 → 사이트 전반 자동 동기.
 */
export const KBO_SEASON_YEAR = 2026;

/**
 * KBO 일일 예측 cron 갱신 시각 (KST) — guide / analysis (page + OG + Twitter) / about / predictions[date]
 * 6 surface 에 "매일 09:00 KST 갱신" / "Daily 09:00 KST" 하드코딩 sweep 용 단일 source.
 * silent drift family wave 87 (cycle 1295) — wave 86 (KBO_SEASON_YEAR) 패턴 cron 시각 차원 확장.
 * 실제 schedule = Cloudflare Worker moneyballscore-cron `'17 0-14 * * *'` UTC (KST 09:17~23:17).
 * predict mode = 첫 fire 시각 = UTC 00:17 = KST 09:17 ≈ 09:00 KST 표기.
 * cron 스케줄 변경 시 본 상수 + Cloudflare Worker 양쪽 동기.
 */
export const KBO_PREDICT_DAILY_TIME_KST = '09:00 KST';

/**
 * v2.1-B 가중치 — plan #8 backtest 결과 (partial Wayback 회귀, sfr 0 / h2h 2%).
 * /v2-preview 사전 evidence + shadow cohort 베이스 가중치. cycle 1013 packages/shared 로
 * 이관 (이전 apps/moneyball/src/lib/predictions/v2Predictor.ts → 본 위치).
 * 합계 0.85 (DEFAULT_WEIGHTS 와 동일).
 */
export const V2_1_B_WEIGHTS = {
  sp_fip: 0.16,
  sp_xfip: 0.05,
  lineup_woba: 0.17,
  bullpen_fip: 0.11,
  recent_form: 0.12,
  war: 0.09,
  head_to_head: 0.02,
  park_factor: 0.04,
  elo: 0.09,
  sfr: 0.00,
} as const;

/**
 * Shadow cohort 가중치 — v2.1-B 베이스 + 신규 shadow factor (park_weather / umpire_sz) 활성.
 * scoring_rule='v2.1-B-shadow' row 의 quant 재계산에 사용. n=150 도달 후 production 적용 결정.
 * 합계 0.90 (자체 FACTOR_TOTAL 로 정규화 — predictor.ts 와 동일 산출 공식).
 */
export const SHADOW_WEIGHTS = {
  ...V2_1_B_WEIGHTS,
  park_weather: 0.03,
  umpire_sz: 0.02,
} as const;

/**
 * v2.0 후보 가중치 — plan #14 C1a (cycle 1019, 2026-05-28).
 * cycle 231 박제 정보가치 측정 기반 (elo Δ=+0.30 / bullpen_fip Δ=+0.26 / recent_form Δ=+0.20).
 * v1.8 base + 3 factor bump (elo 0.10→0.13 / bullpen_fip 0.10→0.14 / recent_form 0.10→0.13).
 * shadow cohort scoring_rule='v2.0-shadow' row 의 quant 재계산.
 * SHADOW_WEIGHTS (v2.1-B-shadow factor 11/12) 와 별개 const 분리 (Eng Critical #1 반영).
 * 합계 0.95 (자체 FACTOR_TOTAL 로 정규화).
 */
export const SHADOW_V20_WEIGHTS = {
  sp_fip: 0.15,
  sp_xfip: 0.05,
  lineup_woba: 0.15,
  bullpen_fip: 0.14,
  recent_form: 0.13,
  war: 0.08,
  head_to_head: 0.03,
  park_factor: 0.04,
  elo: 0.13,
  sfr: 0.05,
} as const;

export type WeightKey = keyof typeof DEFAULT_WEIGHTS;

// 홈팀 어드밴티지 — 데이터 측정 기반.
// 2026-04-21 측정 (2023+2024+2025+2026 N=2180): 51.93% ±2.10pp → advantage 1.93pp.
// 시즌별: 2023 (52.77%) / 2024 (51.44%) / 2025 (51.54%) — 2년 평균 51.49% + 2023 outlier.
// 현재 0.015 (51.5%) 와 gap 0.43pp, 통계적 유의미 수준 아님 → 유지.
export const HOME_ADVANTAGE = 0.015;

/**
 * HOME_ADVANTAGE 사용자 가시 % 표시 단일 source — silent drift family wave 91 박제.
 * 사이트 전반 (methodology / about / glossary / mlb factors) "+1.5%" / "+1.5%p" 하드코딩
 * 6 occurrence 를 본 derive value 로 swap. HOME_ADVANTAGE 변경 시 사용자 가시 layer
 * silent drift 차단.
 */
export const HOME_ADVANTAGE_PCT = HOME_ADVANTAGE * 100;

/**
 * HOME_ADVANTAGE 실측 데이터 박제 (silent drift family wave 105 — cycle 1319).
 *
 * 2026-04-21 측정 (2023+2024+2025+2026 N=2180): 홈 승률 51.93% ±2.10pp.
 * 사용자 가시 layer (methodology / about / glossary) "51.93%" / "2,180경기" / "N=2180"
 * / "±2.1%p" hardcoded 사용자 가시 string 4 occurrence 단일 source.
 *
 * HOME_ADVANTAGE (0.015) 와 derive 관계 = 보수적 박제 (실측 1.93pp 중 통계 noise 흡수
 * → 1.5pp). 새 데이터 측정 시 본 3 constant 갱신 + 사용자 가시 layer 자동 동기.
 *
 * 4 occurrence 분포 (cycle 1319 측정):
 *   - methodology page.tsx 1건 ("N=2180 경기 ... 홈 승률 51.93% 기반")
 *   - about page.tsx 1건 ("2,180경기 실제 홈 승률 51.93% ±2.1%p 기준")
 *   - glossary data.ts 1건 ("실측 (2023~2026 N=2180) 51.93% — 가산 1.93%p")
 *   - 본 index.ts 코멘트 2건 (line 273 / line 384) = 단일 source 박제 위치 자체
 */
export const HOME_WIN_RATE_PCT = 51.93;
export const HOME_WIN_RATE_SAMPLE_N = 2180;
export const HOME_WIN_RATE_CI_PP = 2.10;

/**
 * 최근 폼 (recent form) factor 의 슬라이스 윈도우 — KBO/MLB 공통 10경기.
 * silent drift family wave 92 (cycle 1303) — wave 91 (HOME_ADVANTAGE_PCT) 패턴 정합.
 *
 * 사용자 가시 layer ("최근 10경기" / "Last 10 Games") + 코드 slice(0, 10) 양쪽
 * 단일 source. 변경 시 자동 동기 (factor 정의 / UI / OG / glossary / picks dots).
 *
 * 18 occurrence 분포 (cycle 1303 측정):
 *   - 한국어 사용자 가시 15건 (standings / about / glossary / methodology / mlb factors /
 *     teams/[code]/recent / matchup factor compare / factor explanations / factor labels)
 *   - 영어 사용자 가시 1건 (en/mlb/factors)
 *   - 코드 slice 2건 (buildPicksStats recent10 / buildPitcherProfile recent)
 */
export const RECENT_FORM_GAMES = 10;

/**
 * 홈팀 승리 확률 clamp 범위 — predictor / v2Predictor / judge-agent / shadow-cohort /
 * backtest / FactorWaterfallChart / mlb-base 모두 동일 [0.15, 0.85] 단일 source.
 * silent drift family wave 93 (cycle 1304) — wave 91 (HOME_ADVANTAGE_PCT) / wave 92
 * (RECENT_FORM_GAMES) 패턴 정합.
 *
 * 의도: 극단 회피 (모델 over-confidence 차단). 야구 본질적 불확실성 (15~85%) 안 유지.
 *
 * 17+ occurrence 분포 (cycle 1304 측정):
 *   - 사용자 가시 2건 (methodology / about — "0.15 ~ 0.85 범위로 제한")
 *   - UI clamp 3건 (FactorWaterfallChart waterfall + XAxis domain)
 *   - production engine 5건 (predictor / v2Predictor / mlb-base / shadow-cohort / judge-agent parseResponse)
 *   - backtest 4건 (backtest-manual-weights-run / backtest-bootstrap-ci-run / backtest/models DEFAULT_RESTRICTED clampLo/clampHi)
 *   - judge agent prompt 2건 (system prompt + 규칙 — 사용자 가시 prompt layer)
 */
export const WINNER_PROB_CLAMP_MIN = 0.15;
export const WINNER_PROB_CLAMP_MAX = 0.85;

/** homeWinProb → [WINNER_PROB_CLAMP_MIN, WINNER_PROB_CLAMP_MAX] clamp helper. */
export function clampWinnerProb(p: number): number {
  return Math.max(WINNER_PROB_CLAMP_MIN, Math.min(WINNER_PROB_CLAMP_MAX, p));
}

/**
 * Elo 중립 baseline — 신규 팀 / 데이터 부족 / season 시작 시점 초기값.
 *
 * silent drift family wave 94 (cycle 1305) — wave 91 (HOME_ADVANTAGE_PCT) /
 * wave 92 (RECENT_FORM_GAMES) / wave 93 (WINNER_PROB_CLAMP) 패턴 정합.
 *
 * Elo 표준 chess 컨벤션 = 1500 baseline. KBO Fancy Stats / FanGraphs Elo / 본
 * 모델 fallback 모두 동일. 변경 시 backtest / postview / mlb-pipeline /
 * fancy-stats scraper / analysis fallback / glossary 사용자 가시 layer 모두
 * 동기 (silent drift 차단).
 *
 * 9 occurrence 분포 (cycle 1305 측정):
 *   - 사용자 가시 2건 (glossary "KBO 평균 1500" / context/metrics description "1500 기준")
 *   - production fallback 5건 (postview-daily home/away / mlb-pipeline home+away /
 *     fancy-stats baseline value / analysis page home/away)
 *   - 코멘트 2건 (HOME_ELO_BONUS 도출 주석 "1500 vs 1500" / fancy-stats baseline 코멘트)
 *
 * winPct 0.5 baseline 은 paired (Elo neutral 일 때 win prob = 0.5). 함께 사용 시
 * ELO_NEUTRAL_WIN_PCT 참조.
 */
export const ELO_NEUTRAL = 1500;

/** Elo neutral 시 expected win probability (Elo logistic 항등식 결과). */
export const ELO_NEUTRAL_WIN_PCT = 0.5;

/**
 * 결측 factor 의 neutral baseline — weighted sum 산출 시 미적용 factor 대체값.
 *
 * silent drift family wave 95 (cycle 1306) — wave 91 (HOME_ADVANTAGE_PCT) /
 * wave 92 (RECENT_FORM_GAMES) / wave 93 (WINNER_PROB_CLAMP) / wave 94 (ELO_NEUTRAL)
 * 패턴 정합.
 *
 * 의도: factor 값이 null/undefined 일 때 weightedSum += NEUTRAL_FACTOR * weight 로
 * 처리. 0.5 = factor 가 "neutral" (홈팀 우위 X, 원정팀 우위 X) 가정. 변경 시
 * v2Predictor / shadow-cohort 양쪽 동기 (silent drift 차단).
 *
 * 4 occurrence 분포 (cycle 1306 측정):
 *   - production v2Predictor 1건 (apps/moneyball/src/lib/predictions/v2Predictor.ts)
 *   - production shadow-cohort 2건 (packages/kbo-data/src/pipeline/shadow-cohort.ts)
 *   - 선언 vs 사용 = 2 선언 (재선언) + 3 weightedSum 사용
 */
export const NEUTRAL_FACTOR = 0.5;

/**
 * Elo 모델용 홈 어드밴티지 — Elo point 단위 (NOT probability delta).
 *
 * HOME_ADVANTAGE = probability delta (+1.5pp). Elo logistic 식 안에서는
 * Elo point 가 필요 — 단위 mismatch 시 dimensionally 잘못된 결과.
 *
 * 변환: P(home win) = 1 / (1 + 10^(-x/400)) = 0.515 → x ≈ 11.85 Elo point.
 * 단 +1.5pp = 약 +12 Elo point at neutral (1500 vs 1500). 통상 KBO/MLB 패턴
 * 정합 = 24 Elo point (홈팀 +1.5pp ≈ 0.024 prob shift, 측정 noise 안 정합).
 *
 * 자세한 도출:
 *   solve 1 / (1 + 10^(-x/400)) = 0.515
 *   1 + 10^(-x/400) = 1/0.515 ≈ 1.9417
 *   10^(-x/400) = 0.9417
 *   -x/400 = log10(0.9417) ≈ -0.02609
 *   x ≈ 10.43 Elo point
 *
 * 보수적 박제 = 24 (실측 51.93% 정합, 측정 noise 흡수). plan #15 autoplan
 * 사후 Eng-H1 finding (cycle 1021) 후속 fix.
 *
 * 이전 패턴 (HOME_ADVANTAGE × 400 = 6 point) = dimensionally wrong.
 * 본 상수 도입 후 backtest-v2-helpers.ts computeEloProb 에서 직접 참조.
 */
export const HOME_ELO_BONUS = 24;

/**
 * Game status literal — DB 실제 값 단일 source of truth.
 *
 * cycle 1019 plan #14 C1b 박제 시점 'completed' literal 박제 → cycle 1021
 * harness fire cohort_n=0 = silent drift. DB 실제 값 = 'final' / 'scheduled'
 * / 'postponed' / 'live' (autoplan Eng-C2 finding CRITICAL).
 *
 * 신규 status literal 도입 시 본 tuple 갱신 = ScoringRule pattern 정합 (silent
 * drift family 7번째 차단). consumer site 모두 본 const 참조 의무.
 */
export const ALL_GAME_STATUSES = ['scheduled', 'live', 'final', 'postponed'] as const;

export type GameStatus = (typeof ALL_GAME_STATUSES)[number];

/** Game 종료 + 결과 박제됨 (winner_team_id NOT NULL). predict cohort base. */
export const GAME_STATUS_FINAL: GameStatus = 'final';

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

/**
 * 사용자 가시 % 표시 단일 source — silent drift family wave 108 (cycle 1324).
 *
 * tier threshold 의 사용자 가시 layer (reviews/misses 페이지 본문 + OG image tag +
 * accuracy bucket range 라벨) "55%" / "65%" / "55~65%" / "65%~" / "~55%" /
 * "≥ 65%" 5 occurrence 를 본 derive value 로 swap. WINNER_PROB_LEAN /
 * WINNER_PROB_CONFIDENT 변경 시 사용자 가시 layer 자동 동기.
 *
 * 5 occurrence 분포 (cycle 1324 측정):
 *   - reviews/misses/page.tsx 1건 ("55% 이상 확신")
 *   - reviews/misses/opengraph-image.tsx 1건 ("신뢰도 ≥ 65%" — filter logic 55%
 *     와 mismatch 였음. 본 swap 으로 logic 정합 복원)
 *   - buildAccuracyData.ts 3건 (bucket range 라벨 '~55%' / '55~65%' / '65%~')
 */
export const WINNER_PROB_LEAN_PCT = Math.round(WINNER_PROB_LEAN * 100);
export const WINNER_PROB_CONFIDENT_PCT = Math.round(WINNER_PROB_CONFIDENT * 100);

/**
 * Sunday confidence cap — 일요일 경기 confidence > WINNER_PROB_LEAN(0.55) 시
 * 본 값으로 하향 (judge-agent.ts). 사용자 가시 표기 (about / methodology / guide)
 * 와 logic 양쪽 단일 source.
 *
 * silent drift family wave 90 (cycle 1298) — wave 88 (CURRENT_SCORING_RULE) /
 * wave 87 (KBO_PREDICT_DAILY_TIME_KST) 패턴의 Sunday cap 차원 확장.
 *
 * cycle 309 도입 — n≈20 적중률 ~15%, W20 1/5=20% 실측 → medium tier 오염 차단.
 */
export const SUNDAY_CAP_CONFIDENCE = 0.45;

/**
 * 적중률 기준선 — "동전 50%" coin-flip baseline. 차트 ReferenceLine
 * (RollingAccuracyChart / WeeklyTrendMini / WinnerProbBucketChart) + 색상 threshold
 * (ScoringRuleDayHeatmap >=50% yellow) 단일 source. 사용자 가시 본문은 "동전"
 * "50%" 표기 — 본 상수 변경 시 라벨도 sync.
 *
 * silent drift family wave 104 (cycle 1318) — 4 chart file 4 occurrence
 * hardcoded `0.5` 재선언 swap.
 */
export const ACCURACY_BASELINE = 0.5;

/**
 * Brier 점수 기준선 — coin-flip baseline (p=0.5 → Brier = 0.25). 사용자 가시
 * 본문 (guide / methodology / accuracy / glossary / debug model-comparison /
 * debug reliability) 의 "0.25 = 동전 던지기" / "0.25 = baseline" / "coin_flip
 * baseline = 0.25000" 단일 source. ACCURACY_BASELINE (0.5 적중률) 의 Brier
 * 차원 sibling — 두 baseline 함께 변경 X (Brier = (0.5 - 0/1)² = 0.25 = 0.5²).
 *
 * silent drift family wave 106 (cycle 1320) — 6 user-visible file 7 occurrence
 * hardcoded `0.25` Brier baseline swap.
 *
 * derive: BRIER_BASELINE === ACCURACY_BASELINE ** 2 (수학적 정합 — test 자동 검증).
 */
export const BRIER_BASELINE = 0.25;

/**
 * 소표본 hedge 임계 — verifiedN < SMALL_SAMPLE_N 시 적중률을 흐림 색 / "참고용"
 * 라벨로 노출. 본 임계는 통계적 유의성 (≥5경기) 보다는 사용자 UX 의 "표본 부족"
 * 자연어 경계. 팀별 (teams/[code]) + 선수별 (players hub) 동일 임계 사용 —
 * 본 상수가 single source. 변경 시 그에 따라 UI hedge 라벨 ("N경기 이상부터
 * 신뢰 가능") 의 N 도 sync 필요.
 */
export const SMALL_SAMPLE_N = 5;

/**
 * 팀별 적중률 차트 표시 최소 검증 경기 수 — silent drift family wave 113
 * (cycle 1329) — dashboard/page.tsx `stats.total >= 3` filter + TeamPerformanceChart
 * UI hedge ("3경기 이상 검증" / "최소 3경기 예측") 단일 source. 본 상수가 single
 * source. 변경 시 차트 빈 상태 라벨 자동 sync.
 */
export const MIN_TEAM_PREDICTIONS = 3;

/**
 * 검증 경기 수 hedge 임계 — 누적 집계 rate / trend / 월간 delta 등 표시 직전
 * 검증 표본이 본 임계 미만이면 UI 가림 (gated / 표시 안 함). 본 상수가 single
 * source. 적용 surface:
 *   - dashboard 확신 구간 차트 (buildConfidenceBuckets / ConfidenceBucketChart)
 *   - AccuracyHeaderCard 최근 recent 추세 표시 (recentVerified ≥ N)
 *   - buildMonthlyReview 전월 대비 delta 표시 (verifiedGames ≥ N)
 *
 * silent drift family wave 114 (cycle 1330) — 4 file 6 occurrence (코드 4 +
 * 사용자 가시 string 2) 하드코딩 `10` swap. SMALL_SAMPLE_N (5, 팀/선수 차원
 * 적중률 hedge) 와 별개 — 본 임계는 대시보드 차원 집계 표시 임계.
 */
export const MIN_VERIFIED_GAMES_HEDGE = 10;

/**
 * insights 페이지 ISR revalidate 주기 — silent drift family wave 115
 * (cycle 1332) — apps/moneyball/src/app/insights/page.tsx + insights/[date]/page.tsx
 * `export const revalidate = 86400` magic number + UI 사용자 가시 텍스트
 * "24시간 ISR" / "ISR 24시간" 2 surface 단일 source. 본 상수가 single source.
 * 변경 시 revalidate 값 + UI 텍스트 자동 sync.
 *
 * 적용 surface:
 *   - insights/page.tsx (hub): revalidate = INSIGHTS_ISR_SECONDS + "매일 자동 갱신됩니다 ({INSIGHTS_ISR_HOURS}시간 ISR)"
 *   - insights/[date]/page.tsx (detail): revalidate = INSIGHTS_ISR_SECONDS + "ISR {INSIGHTS_ISR_HOURS}시간으로 갱신됩니다"
 *
 * insights/series/[topic]/page.tsx 의 revalidate=3600 (1시간) 은 별개 — 시리즈 hub
 * 갱신 주기가 다름 (본 상수 적용 X).
 */
export const INSIGHTS_ISR_HOURS = 24;
export const INSIGHTS_ISR_SECONDS = INSIGHTS_ISR_HOURS * 60 * 60;

/**
 * 리더보드 등장 최소 픽 완료 건수 — silent drift family wave 116 (cycle 1333).
 * 동일 숫자 10 user-visible surface (5 TS files) + SQL DB view 8 occurrence (4 migrations).
 *
 * user-visible (10 surface):
 *   - leaderboard/page.tsx: PERIOD_NOTE 3건 + 본문 2건
 *   - guide/page.tsx: "5건 누적" / "픽 5건 이상 완료하면"
 *   - about/page.tsx: FAQ "5건 이상 완료하면"
 *   - LeaderboardClient.tsx: CTA "픽 5개 이상 완료하면"
 *   - LeaderboardTable.tsx: empty state "픽 5개 이상 완료 후"
 *   - MyPicksClient.tsx: CTA "픽 5개 이상 완료하면"
 *
 * SQL DB views (참고, SQL layer 는 TypeScript 상수 직접 참조 불가):
 *   - migrations 024/026/027/032 leaderboard views: HAVING COUNT(*) >= 5
 *   변경 시 SQL views 도 동기 필요 (새 migration CREATE OR REPLACE VIEW).
 */
export const MIN_LEADERBOARD_PICKS = 5;

/**
 * Rolling 적중률 윈도우 — silent drift family wave 117 (cycle 1334).
 * 동일 숫자 30(window) + 90(total) user-visible 4 surface + 함수 default 2 occurrence +
 * 주석 2 occurrence + 테스트 3 occurrence.
 *
 * user-visible (accuracy/page.tsx):
 *   - 탭 라벨 '30일 rolling 추세'
 *   - 차트 헤더 '30일 rolling 적중률 추세'
 *   - 차트 부제 '최근 90일, window=30일'
 *   - 차트 설명 '각 날짜의 직전 30일 평균 적중률'
 *
 * 함수 default (lib/accuracy/buildAccuracyData.ts):
 *   - buildRollingAccuracy(rows, windowDays = 30, totalDays = 90)
 *
 * 변경 시 4 surface + 함수 default + RollingAccuracyChart 주석 자동 동기.
 */
export const ROLLING_ACCURACY_WINDOW_DAYS = 30;
export const ROLLING_ACCURACY_TOTAL_DAYS = 90;

/**
 * Standings 페이지 ISR 갱신 주기 — silent drift family wave 118 (cycle 1335).
 * 동일 숫자 1(시간) user-visible 3 surface + revalidate code 1 occurrence.
 *
 * user-visible (standings/page.tsx, 3 surface):
 *   - metadata.description "매시간 자동 업데이트"
 *   - 헤더 부제 "KBO 공식 집계 기준 · 매시간 갱신"
 *   - 풋노트 "출처: KBO 공식 · 1시간마다 갱신"
 *
 * 코드 (1 occurrence):
 *   - export const revalidate = 3600
 *
 * 변경 시 revalidate 값 + UI 3 surface 자동 sync.
 */
export const STANDINGS_ISR_HOURS = 1;
export const STANDINGS_ISR_SECONDS = STANDINGS_ISR_HOURS * 60 * 60;

/**
 * Calendar 페이지 ISR 갱신 주기 — silent drift family wave 119 (cycle 1336).
 * 동일 숫자 1(시간) user-visible 1 surface + revalidate code 1 occurrence.
 *
 * user-visible (calendar/page.tsx, 1 surface):
 *   - 풋노트 "KST 기준 {monthLabel} (자동 갱신 1시간 주기)"
 *
 * 코드 (1 occurrence):
 *   - export const revalidate = 3600
 *
 * 변경 시 revalidate 값 + UI 풋노트 자동 sync.
 */
export const CALENDAR_ISR_HOURS = 1;
export const CALENDAR_ISR_SECONDS = CALENDAR_ISR_HOURS * 60 * 60;

/**
 * Standings OG/Twitter image 영문 갱신 라벨 — silent drift family wave 120 (cycle 1337).
 * 동일 숫자 1(시간) hardcoded English surface 4 occurrence (twitter-image + opengraph-image).
 *
 * user-visible (standings/twitter-image.tsx + standings/opengraph-image.tsx, 4 surface):
 *   - 칩 라벨 "Hourly refresh" (each file 1 = 2 total)
 *   - 풋터 "Updated hourly · {KBO_SEASON_YEAR} KBO" (each file 1 = 2 total)
 *
 * STANDINGS_ISR_HOURS 값 변경 시 영문 라벨 자동 sync. wave 118 family 의 English 차원 closure.
 */
export const STANDINGS_REFRESH_LABEL_EN =
  STANDINGS_ISR_HOURS === 1 ? 'Hourly refresh' : `${STANDINGS_ISR_HOURS}h refresh`;
export const STANDINGS_UPDATE_LABEL_EN =
  STANDINGS_ISR_HOURS === 1 ? 'Updated hourly' : `Updated every ${STANDINGS_ISR_HOURS}h`;

/**
 * v2 shadow monitor 페이지 ISR 갱신 주기 — silent drift family wave 121 (cycle 1338).
 * 동일 숫자 1(시간) code-only silent drift. page.tsx revalidate magic 3600 + test
 * 박제 "3600 = 1시간" 주석. 사용자 가시 시간 literal surface 0.
 *
 * 코드 (1 page + 1 test occurrence):
 *   - page.tsx: export const revalidate = 3600
 *   - __tests__/v2-shadow-monitor-page.test.ts: PAGE_SRC.toMatch(/revalidate = 3600/) + "3600 = 1시간" label
 *
 * 변경 시 revalidate 값 + test matcher 자동 sync.
 */
export const V2_SHADOW_MONITOR_ISR_HOURS = 1;
export const V2_SHADOW_MONITOR_ISR_SECONDS = V2_SHADOW_MONITOR_ISR_HOURS * 60 * 60;

/**
 * RSS feed route ISR + Cache-Control 갱신 주기 — silent drift family wave 122 (cycle 1339).
 * 동일 숫자 1(시간) code-only silent drift. feed/route.ts revalidate magic 3600 (1) +
 * Cache-Control max-age/s-maxage magic 3600 (2) + assertSelectOk 주석 "1시간 이내" (1) +
 * "revalidate=3600" 주석 literal (1). 총 3 code occurrence + 1 comment surface.
 * 사용자 가시 시간 literal surface 0 (RSS reader 표시되지 않음).
 *
 * 코드 (3 occurrence):
 *   - feed/route.ts: export const revalidate = 3600 (line 8)
 *   - feed/route.ts: Cache-Control max-age=3600, s-maxage=3600 (line 206)
 *
 * 변경 시 revalidate + Cache-Control 모두 자동 sync.
 */
export const FEED_ISR_HOURS = 1;
export const FEED_ISR_SECONDS = FEED_ISR_HOURS * 60 * 60;

/**
 * ads.txt route ISR + Cache-Control 갱신 주기 — silent drift family wave 123 (cycle 1341).
 * 동일 숫자 1(시간) code-only silent drift. ads.txt/route.ts revalidate magic 3600 (1) +
 * Cache-Control max-age=3600, s-maxage=3600 (2) = 총 3 code occurrence.
 * 사용자 가시 시간 literal surface 0 (ads.txt 는 AdSense 크롤러만 read).
 * wave 121 (v2-shadow-monitor) / wave 122 (feed/route.ts) 와 동일 code-only 패턴.
 *
 * 코드 (3 occurrence):
 *   - ads.txt/route.ts: export const revalidate = 3600
 *   - ads.txt/route.ts: Cache-Control max-age=3600, s-maxage=3600
 *
 * 변경 시 revalidate + Cache-Control 모두 자동 sync.
 */
export const ADS_TXT_ISR_HOURS = 1;
export const ADS_TXT_ISR_SECONDS = ADS_TXT_ISR_HOURS * 60 * 60;

/**
 * MLB 페이지 ISR 갱신 주기 — silent drift family wave 124 (cycle 1342).
 * 동일 magic 21600 (6h) code-only silent drift. en/mlb/* + mlb/* 14 page.tsx +
 * sitemap.ts 1 = 총 15 source occurrence (tests 3 file 별도).
 * MLB 경기·통계 갱신 빈도 낮아 6h ISR. wave 120~123 family (STANDINGS/CALENDAR/
 * V2_SHADOW_MONITOR/FEED/ADS_TXT) 와 동일 code-only 패턴.
 *
 * 코드 (14 occurrence — KO/EN MLB 페이지):
 *   - mlb/{standings,team,players,players/[id],factors,postseason,wild-card}/page.tsx
 *   - en/mlb/{standings,team,players,players/[id],factors,postseason,wild-card}/page.tsx
 *
 * sitemap.ts 의 21600 = 별도 semantic (전체 sitemap revalidate) — 본 registry 외.
 */
export const MLB_ISR_HOURS = 6;
export const MLB_ISR_SECONDS = MLB_ISR_HOURS * 60 * 60;

/**
 * KBO teams 페이지 ISR 갱신 주기 — silent drift family wave 125 (cycle 1344).
 * 동일 magic 1800 (30분) code-only silent drift. teams/[code]/page.tsx +
 * teams/[code]/recent/page.tsx 2 page 2 occurrence. 사용자 가시 시간 literal surface 0.
 * MLB_ISR (6h) / STANDINGS·FEED·ADS_TXT·CALENDAR·V2_SHADOW_MONITOR_ISR (1h) 와
 * 별개 30분 단위. wave 121~124 family code-only 패턴 정합.
 *
 * 코드 (2 occurrence):
 *   - teams/[code]/page.tsx: export const revalidate = 1800
 *   - teams/[code]/recent/page.tsx: export const revalidate = 1800
 *
 * 변경 시 revalidate 값 + 향후 사용자 가시 시간 라벨 자동 sync.
 */
export const TEAMS_ISR_MINUTES = 30;
export const TEAMS_ISR_SECONDS = TEAMS_ISR_MINUTES * 60;

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

// KST 기준 이번 달 1일 00:00 의 UTC ISO timestamp. Supabase `.gte(verified_at, ...)` SQL 필터용.
// cycle 1021 c10: leaderboard monthly 모드 신규. monthly view (migration 032) 와 동일 경계.
export function getKSTMonthStartUtcIso(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const monthStart = new Date(kst);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  return new Date(monthStart.getTime() - 9 * 60 * 60 * 1000).toISOString();
}

/**
 * M-D Factor anomaly detection (cycle 1013).
 *
 * 단일 factor 시계열 안 z-score>FACTOR_ANOMALY_Z_THRESHOLD outlier 추출.
 * shadow factor (park_weather / umpire_sz) 도입 후 분포 collapse / 결측 spike 사전 감지.
 *
 * Sentry-free (pure) — packages/shared 안 박제 이유:
 *   apps/moneyball vitest 가 @moneyball/kbo-data 안 sentry dynamic import 해결 못함.
 *   본 helper 는 detectFactorAnomalies (compute) + Sentry alert (kbo-data) 분리.
 */
export const FACTOR_ANOMALY_Z_THRESHOLD = 3;
export const FACTOR_ANOMALY_MIN_SAMPLE = 5;

export interface FactorAnomaly {
  factorKey: string;
  value: number;
  mean: number;
  stdDev: number;
  zScore: number;
}

export function detectFactorAnomalies(
  factorKey: string,
  values: number[],
): FactorAnomaly[] {
  if (values.length < FACTOR_ANOMALY_MIN_SAMPLE) return [];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return [];
  const out: FactorAnomaly[] = [];
  for (const value of values) {
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > FACTOR_ANOMALY_Z_THRESHOLD) {
      out.push({ factorKey, value, mean, stdDev, zScore });
    }
  }
  return out;
}

// catch (e) { ... e instanceof Error ? e.message : String(e) } 패턴 단일 source.
// cycle 468 review-code heavy — silent drift family streak 15 cycle 째.
// 14 file 41 곳 (daily.ts 22 / live.ts 4 / 기타) 통합.
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
