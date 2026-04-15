/**
 * Validator Layer 1 — 팀 에이전트 JSON 응답 결정론적 검증
 *
 * Phase v4-2 신규. 환각·편향·금칙어·선수명 발명을 차단.
 * 위반 시 AgentResult.success=false로 전환되어 debate.ts의 기존 fallback 경로 사용.
 *
 * 정책 (Q2 + v4-3 mode 도입):
 *   strict (프로덕션/Claude 기본):
 *     - 하드 위반(환각, 선수명 발명) 1건 이상 → reject
 *     - 경고(금칙어, claim-type 분류 불가) 3건 이상 → reject
 *   lenient (로컬 Ollama 개발 전용):
 *     - 선수명 발명은 hard→warn으로 강등 (exaone 환각 허용치)
 *     - 환각 숫자 hard는 유지
 *     - 경고 6건 이상 → reject (WARN_LIMIT_LENIENT=5)
 *
 * 호출부는 NODE_ENV=production이면 무조건 strict. v4-3 eng-review A4.
 */

import type { TeamCode } from '@moneyball/shared';
import { KBO_TEAMS } from '@moneyball/shared';
import type { GameContext, TeamArgument } from './types';

// ============================================
// 타입
// ============================================

export type ViolationSeverity = 'hard' | 'warn';

export type ViolationType =
  | 'hallucinated_number'
  | 'invented_player_name'
  | 'banned_phrase'
  | 'unclassified_claim';

export interface Violation {
  type: ViolationType;
  severity: ViolationSeverity;
  detail: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: Violation[];
}

// ============================================
// 상수
// ============================================

// Q2 임계값 — 운영 1주 dry-run 결과 기반 재조정 가능
export const HARD_LIMIT = 0;
export const WARN_LIMIT = 2; // strict: 3건 이상이면 reject
export const WARN_LIMIT_LENIENT = 5; // lenient: 6건 이상이면 reject

export type ValidationMode = 'strict' | 'lenient';

/**
 * 호출부 mode 결정 헬퍼.
 * 프로덕션에서는 무조건 strict. LLM_BACKEND가 실수로 ollama로 설정돼도 차단.
 * v4-3 eng-review A4 — 블로그 환각 leak 방어.
 */
export function resolveValidationMode(env: NodeJS.ProcessEnv = process.env): ValidationMode {
  if (env.NODE_ENV === 'production') return 'strict';
  if (env.LLM_BACKEND === 'ollama') return 'lenient';
  return 'strict';
}

// 화이트리스트 — 환각 검사에서 제외할 일반 숫자
// (단일 digit, 일반적 이닝·아웃카운트·스트라이크·볼 숫자)
const NUMERIC_WHITELIST = new Set([
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '10', '100', // 100% 같은 표현
]);

// 금칙어 — 내러티브·심리·성격 관련
const BANNED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /왕조/, label: '역사 내러티브(왕조)' },
  { pattern: /무관/, label: '역사 내러티브(무관)' },
  { pattern: /전통적으로/, label: '역사 내러티브(전통)' },
  { pattern: /팬심/, label: '팬심 언급' },
  { pattern: /멘탈/, label: '심리 추측(멘탈)' },
  { pattern: /자신감/, label: '심리 추측(자신감)' },
  { pattern: /프로답지/, label: '성격 평가' },
  { pattern: /컨디션 난조|컨디션난조/, label: '부상·컨디션 추측' },
  { pattern: /게으른|성실한/, label: '성격 평가' },
  { pattern: /집중력/, label: '심리 추측(집중력)' },
];

// claim-type 5개 허용 유형의 신호 단어
// (휴리스틱 — 하나라도 매치되면 해당 유형으로 분류)
const CLAIM_TYPE_SIGNALS: Array<{ type: string; patterns: RegExp[] }> = [
  // 1. 주입 수치 직접 인용 — 숫자 + 지표어
  { type: 'direct_stat', patterns: [/\d+(\.\d+)?\s*(FIP|xFIP|WAR|wOBA|wRC|ISO|ERA|SFR|Elo|BB%|K%)/i, /\d+\.\d+/] },
  // 2. 두 수치 비교 — 비교 연산자 또는 대조 어휘
  { type: 'comparison', patterns: [/[<>]|보다\s*(높|낮|많|적)/, /대비/, /차이/, /격차/] },
  // 3. 팩터 기여도 해석
  { type: 'factor_contribution', patterns: [/팩터|기여|가중치|모델|v1\.5|v2/] },
  // 4. 상대전적 요약
  { type: 'head_to_head', patterns: [/상대전적|최근\s*\d+경기|\d+승\s*\d+패/] },
  // 5. 통계 추론 — 파크팩터·경향 해석
  { type: 'stat_inference', patterns: [/파크팩터|PF|억제|경향|추세/] },
];

// ============================================
// 서브체크: 환각 숫자
// ============================================

function extractNumbers(text: string): string[] {
  const matches = text.match(/\d+(?:\.\d+)?/g);
  return matches ?? [];
}

// "4.20" ↔ "4.2", "0.340" ↔ "0.34" 같은 trailing-zero 차이를 정규화.
// parseFloat로 숫자 비교, 고정 소수 4자리까지 keying.
function normalizeNum(s: string): string {
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return s;
  // 정수 우선, 그 외엔 trailing zero 제거
  if (Number.isInteger(n)) return String(n);
  // toFixed(4) 후 trailing zero 제거
  return n.toFixed(4).replace(/\.?0+$/, '');
}

export function checkHallucinatedNumbers(
  outputText: string,
  injectionText: string
): Violation[] {
  const outputNums = new Set(extractNumbers(outputText).map(normalizeNum));
  const injectedNums = new Set(extractNumbers(injectionText).map(normalizeNum));

  const hallucinated: string[] = [];
  for (const n of outputNums) {
    if (injectedNums.has(n)) continue;
    if (NUMERIC_WHITELIST.has(n)) continue;
    hallucinated.push(n);
  }

  if (hallucinated.length === 0) return [];
  return [
    {
      type: 'hallucinated_number',
      severity: 'hard',
      detail: `주입 블록에 없는 수치 ${hallucinated.length}개: ${hallucinated.slice(0, 5).join(', ')}`,
    },
  ];
}

// ============================================
// 서브체크: 선수명 발명
// ============================================

export function checkInventedPlayerNames(
  outputText: string,
  context: GameContext
): Violation[] {
  // 주입 블록에 포함된 선수명
  const allowed = new Set<string>();
  if (context.homeSPStats?.name) allowed.add(context.homeSPStats.name);
  if (context.awaySPStats?.name) allowed.add(context.awaySPStats.name);

  // 3자 이름 후보: 뒤에 주격/소유격 조사(이/가/은/는) 또는 선수 맥락 동사가 와야 함
  // 이 제약 덕분에 "결정적", "매치업" 같은 일반 3자 명사는 제외됨
  const namePattern = /([가-힣]{3})(?=[이가은는]|\s*(?:등판|선발로|투수로|출전|결장|타격|삼진|홈런))/g;
  const matches = [...outputText.matchAll(namePattern)];

  const invented = matches
    .map((m) => m[1])
    .filter((n) => !allowed.has(n));

  if (invented.length === 0) return [];
  return [
    {
      type: 'invented_player_name',
      severity: 'hard',
      detail: `주입 블록에 없는 3자 이름 후보 ${invented.length}개: ${invented.slice(0, 5).join(', ')}`,
    },
  ];
}

// ============================================
// 서브체크: 금칙어
// ============================================

export function checkBannedPhrases(outputText: string): Violation[] {
  const hits: Violation[] = [];
  for (const { pattern, label } of BANNED_PATTERNS) {
    if (pattern.test(outputText)) {
      hits.push({
        type: 'banned_phrase',
        severity: 'warn',
        detail: label,
      });
    }
  }
  return hits;
}

// ============================================
// 서브체크: claim-type 분류
// ============================================

/**
 * claim-type 검증 (v4-2 단순화 버전)
 *
 * 문장 분할 기반은 소수점 숫자("3.2")를 잘못 끊는 문제가 있어 폐기.
 * 대신 **텍스트 전체에 통계 언어 신호가 충분한지**를 본다:
 *  - 소수점 숫자 개수 (통계 수치 사용 증거)
 *  - claim-type 5개 중 매치되는 유형 개수
 * 합산 ≥ 2이면 통과. 그 미만이면 경고(warn).
 *
 * 이 방식은 문장 수준 분류 정확도는 떨어지지만, v4-2 초기 dry-run에서
 * false positive를 최소화하는 것이 우선. v4-3에서 정교화.
 */
export function checkClaimTypes(outputText: string): Violation[] {
  const decimalCount = (outputText.match(/\d+\.\d+/g) ?? []).length;

  let signalCount = 0;
  for (const { patterns } of CLAIM_TYPE_SIGNALS) {
    if (patterns.some((p) => p.test(outputText))) signalCount++;
  }

  const total = decimalCount + signalCount;
  if (total >= 2) return [];

  return [
    {
      type: 'unclassified_claim',
      severity: 'warn',
      detail: `통계 수치 ${decimalCount}개 + claim-type 신호 ${signalCount}개 = ${total} (최소 2 필요)`,
    },
  ];
}

// ============================================
// 주입 블록 재구성 (team-agent의 buildUserMessage와 동일 소스)
// ============================================

export function buildInjectionText(context: GameContext): string {
  const { game, homeTeamStats, awayTeamStats, homeSPStats, awaySPStats, homeElo, awayElo, homeRecentForm, awayRecentForm, headToHead, parkFactor } = context;
  const homeName = KBO_TEAMS[game.homeTeam].name;
  const awayName = KBO_TEAMS[game.awayTeam].name;

  const spLine = (p: typeof homeSPStats) =>
    p ? `${p.name} FIP ${p.fip} xFIP ${p.xfip} K/9 ${p.kPer9} WAR ${p.war}` : '미확정';

  return [
    `경기: ${awayName} @ ${homeName}`,
    `구장: ${game.stadium} / 파크팩터 ${parkFactor}`,
    `[${homeName}] SP ${spLine(homeSPStats)} | wOBA ${homeTeamStats.woba} | 불펜FIP ${homeTeamStats.bullpenFip} | WAR ${homeTeamStats.totalWar} | SFR ${homeTeamStats.sfr} | Elo ${homeElo.elo} | 최근폼 ${homeRecentForm}`,
    `[${awayName}] SP ${spLine(awaySPStats)} | wOBA ${awayTeamStats.woba} | 불펜FIP ${awayTeamStats.bullpenFip} | WAR ${awayTeamStats.totalWar} | SFR ${awayTeamStats.sfr} | Elo ${awayElo.elo} | 최근폼 ${awayRecentForm}`,
    `상대전적 ${headToHead.wins}승 ${headToHead.losses}패`,
  ].join('\n');
}

// ============================================
// 공개 API
// ============================================

export function validateTeamArgument(
  arg: TeamArgument,
  context: GameContext,
  mode: ValidationMode = 'strict'
): ValidationResult {
  const outputText = [
    arg.reasoning,
    arg.keyFactor,
    ...arg.strengths,
    ...arg.opponentWeaknesses,
  ].join(' ');

  const injectionText = buildInjectionText(context);

  const rawViolations: Violation[] = [
    ...checkHallucinatedNumbers(outputText, injectionText),
    ...checkInventedPlayerNames(outputText, context),
    ...checkBannedPhrases(outputText),
    ...checkClaimTypes(outputText),
  ];

  // lenient: 선수명 발명 hard → warn 강등 (exaone 환각 허용)
  // strict: 원본 severity 유지
  const violations: Violation[] = mode === 'lenient'
    ? rawViolations.map((v) =>
        v.type === 'invented_player_name' ? { ...v, severity: 'warn' as const } : v
      )
    : rawViolations;

  const hardCount = violations.filter((v) => v.severity === 'hard').length;
  const warnCount = violations.filter((v) => v.severity === 'warn').length;

  const warnLimit = mode === 'lenient' ? WARN_LIMIT_LENIENT : WARN_LIMIT;
  const ok = hardCount <= HARD_LIMIT && warnCount <= warnLimit;
  return { ok, violations };
}
