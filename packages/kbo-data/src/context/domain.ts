/**
 * LLM Agent 용 KBO Domain Knowledge Base — plan #23 Step 2 (cycle 1226, 2026-06-19).
 *
 * 단일 source-of-truth — LLM judge / team / postview / personas / debate / calibration /
 * rivalry-memory 7 agent 가 prompt 안에서 KBO 도메인 지식 (구장 특성, 시즌 단계,
 * 시간 윈도우, 라이벌리) 을 반복 정의하던 drift risk 차단.
 *
 * 책임 분리:
 *   - 구장 보정 (`parkPf`) source = `@moneyball/shared` `KBO_TEAMS`. 본 모듈은 ratio
 *     (1.0 = 중립) 로 환산한 LLM 친화 표현만 추가 — parkPf 변경은 shared 에서 일어남.
 *   - 라이벌리 source = `@moneyball/shared` `KBO_RIVALRIES` (`isRivalry`). 본 모듈은
 *     LLM prompt 친화 한 줄 문자열 박제만 — 라이벌리 정의는 shared 에서 일어남.
 *   - 시간 윈도우 = predictor / retro / agent 가 사용하는 기준 (최근 10경기 / 30일 H2H /
 *     180일 시즌) 을 LLM 이 동일 표현으로 참조하도록 박제.
 *
 * Step 3 (buildAgentContext) 에서 본 모듈 + MetricRegistry + AgentContext 결합.
 */

import { KBO_TEAMS, KBO_STADIUM_SHORT, KBO_RIVALRIES, isRivalry, shortTeamName, type TeamCode } from '@moneyball/shared';

/** KBO 구장 단일 context — LLM prompt 안 직접 삽입 가능한 형태. */
export interface ParkContext {
  team_code: TeamCode;
  short_name: string;       // "잠실" / "광주"
  stadium_full: string;     // "서울종합운동장 야구장"
  /** ratio (1.0 = 중립 / >1 = 타고 / <1 = 투고). `KBO_TEAMS[code].parkPf / 100`. */
  park_factor: number;
  /** 한 줄 hint — `KBO_TEAMS[code].parkNote` 그대로. */
  hint_ko: string;
}

function buildParks(): Record<TeamCode, ParkContext> {
  const out = {} as Record<TeamCode, ParkContext>;
  (Object.keys(KBO_TEAMS) as TeamCode[]).forEach((code) => {
    const t = KBO_TEAMS[code];
    out[code] = {
      team_code: code,
      short_name: KBO_STADIUM_SHORT[code],
      stadium_full: t.stadium,
      park_factor: Number((t.parkPf / 100).toFixed(3)),
      hint_ko: t.parkNote,
    };
  });
  return out;
}

/** 10 KBO 홈팀별 구장 context. `KBO_TEAMS` 에서 자동 도출 (drift X). */
export const KBO_PARKS: Readonly<Record<TeamCode, ParkContext>> = Object.freeze(buildParks());

/** KBO 시즌 단계 (월 기준). */
export type SeasonPhase = 'preseason' | 'early' | 'mid' | 'late' | 'postseason' | 'offseason';

/** 시즌 단계별 한글 라벨 + 월 범위. */
export const SEASON_PHASES: Readonly<Record<SeasonPhase, { ko: string; months: ReadonlyArray<number> }>> = Object.freeze({
  preseason: { ko: '시범경기', months: [3] },
  early: { ko: '시즌 초반', months: [4] },
  mid: { ko: '시즌 중반', months: [5, 6, 7] },
  late: { ko: '시즌 후반', months: [8, 9] },
  postseason: { ko: '포스트시즌', months: [10, 11] },
  offseason: { ko: '비시즌', months: [12, 1, 2] },
});

/**
 * 날짜 → 시즌 단계.
 *
 * KBO 정규 시즌: 4~9월. 포스트시즌: 10~11월. 시범경기: 3월. 비시즌: 12~2월.
 * 일자 단위 미세 boundary (예: 9월 30일 정규 마지막) 는 캘린더 변동 큼 — 월 단위만 사용.
 */
export function getSeasonPhase(date: Date): SeasonPhase {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('getSeasonPhase: invalid Date');
  }
  const month = date.getMonth() + 1;
  for (const phase of Object.keys(SEASON_PHASES) as SeasonPhase[]) {
    if (SEASON_PHASES[phase].months.includes(month)) return phase;
  }
  return 'offseason';
}

/**
 * 분석 시간 윈도우 — predictor / retro / LLM agent 가 공유.
 *
 * `recent_form.games = 10` — KBO 공식 ranking 테이블의 "최근10경기" 컬럼 (W/L 카운트)
 * 가 실제 source. scraper (`kbo-official.ts`) + `homeRecentForm` 필드 + 사용자 가시
 * 페이지 (about / standings / glossary / teams/recent) 모두 10경기 기준. cycle 1240
 * silent drift wave 48 = TIME_WINDOWS 가 7 로 박제되어 LLM agent prompt 가 잘못된
 * 윈도우 문구를 받던 패턴 정정.
 */
export const TIME_WINDOWS = Object.freeze({
  recent_form: { games: 10, ko: '최근 10경기' },
  h2h_window: { days: 30, ko: '최근 30일 상대 전적' },
  season: { days: 180, ko: '시즌 누적' },
} as const);

export type TimeWindowKey = keyof typeof TIME_WINDOWS;

/**
 * LLM prompt 안 직접 삽입 가능한 구장 한 줄.
 *
 * `park_factor` 는 항상 소수점 2자리로 박제 — 1.0 / 0.95 / 1.08 표기 일관 (LLM
 * 파싱 안정성).
 *
 * 예: "잠실 (서울종합운동장 야구장): 투수 친화 (장타 억제). park_factor=0.95."
 */
export function renderParkForLLM(code: TeamCode): string {
  const p = KBO_PARKS[code];
  return `${p.short_name} (${p.stadium_full}): ${p.hint_ko}. park_factor=${p.park_factor.toFixed(2)}.`;
}

/**
 * LLM prompt 안 직접 삽입 가능한 라이벌리 한 줄. 라이벌리 X 시 null.
 *
 * 라이벌리는 본질적으로 대칭 (home/away 무관) — 팀 단축명 알파벳 정렬 후 박제하여
 * (a, b) / (b, a) 양방향 동일 문자열 보장.
 *
 * 예: "LG vs 두산 = KBO 라이벌리 매치 — 라이벌리 가산점 활성."
 */
export function renderRivalryForLLM(home: TeamCode, away: TeamCode): string | null {
  if (!isRivalry(home, away)) return null;
  const [first, second] = [shortTeamName(home), shortTeamName(away)].sort();
  return `${first} vs ${second} = KBO 라이벌리 매치 — 라이벌리 가산점 활성, 평소보다 변동성 ↑ 가능.`;
}

/**
 * 시즌 단계 한 줄 — LLM prompt 안 게임 컨텍스트 일부.
 *
 * 예: "현재 시즌 단계: 시즌 중반 (mid, 2026-06)."
 */
export function renderSeasonForLLM(date: Date): string {
  const phase = getSeasonPhase(date);
  const ko = SEASON_PHASES[phase].ko;
  const yyyymm = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `현재 시즌 단계: ${ko} (${phase}, ${yyyymm}).`;
}

/**
 * 시간 윈도우 한 줄 — LLM 이 분석 단위를 mismatch 없이 참조하도록.
 *
 * 예: "분석 윈도우 — 최근 폼: 최근 10경기 / H2H: 최근 30일 상대 전적 / 시즌: 시즌 누적."
 */
export function renderTimeWindowsForLLM(): string {
  const parts = (Object.keys(TIME_WINDOWS) as TimeWindowKey[]).map((k) => `${k}: ${TIME_WINDOWS[k].ko}`);
  return `분석 윈도우 — ${parts.join(' / ')}.`;
}

/**
 * KBO Domain KB 결합 export — LLM 통합 path (Step 3 buildAgentContext) 단일 reference.
 *
 * - `parks` = 10 홈팀별 ParkContext (KBO_TEAMS source)
 * - `season_phases` = 단계별 라벨 + 월 범위 mapping
 * - `time_windows` = 분석 윈도우 단위 (predictor sync)
 * - `rivalries` = `@moneyball/shared` re-export (단일 source, sync 강제)
 */
export const KBO_DOMAIN_KB = Object.freeze({
  parks: KBO_PARKS,
  season_phases: SEASON_PHASES,
  time_windows: TIME_WINDOWS,
  rivalries: KBO_RIVALRIES,
} as const);
