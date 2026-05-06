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
  | 'unclassified_claim'
  | 'low_weight_factor_emphasis';

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
  // v4-4 hotfix: 이닝 수, 아웃 카운트 등 단일 digit은 이미 포함.
  // 일반 % 수치 (50, 60 등)도 false positive 방지
  '50', '20', '30', '40', '60', '70', '80', '90',
]);

// 부동소수점 비교 허용 오차 — 4자리 소수까지 일치로 판단
const NUMERIC_EPSILON = 0.0001;

/**
 * v4-4 hotfix: 주입된 수치들의 산술 파생값(차이·합·비율·percent 변환)을 허용.
 *
 * 문제: LLM이 합리적으로 계산한 차이값(예: FIP 4.1 - 3.42 = 0.68)을 환각으로 분류하던 버그.
 * 해결: 주입 수치 pairwise로 |a-b|, a+b, a/b, a*100 등을 미리 계산해 허용 set에 추가.
 *
 * CEO 리뷰 empirical 발견: Claude와 DeepSeek 둘 다 합리적 파생값을 출력했으나
 * validator가 잘못 reject. 프로덕션에서도 silent 문제 가능성.
 */
function computeArithmeticDerivatives(injectedNums: number[]): Set<string> {
  const derived = new Set<string>();

  // 1. 각 수치의 percent 변환 — 범위 제약 없이 × 100
  //    0.7 → 70, 0.34 → 34, 1.02 → 102 (parkFactor), 3.42 → 342 등
  for (const n of injectedNums) {
    if (n > 0) {
      derived.add(String(Math.round(n * 100)));
    }
    // 백분율 수치 → 소수 변환 (65 → 0.65)
    if (Number.isInteger(n) && n >= 1 && n <= 100) {
      derived.add(normalizeNum(String(n / 100)));
    }
  }

  // 2. Pairwise 차이·합 (중복 제거는 Set이 처리)
  for (let i = 0; i < injectedNums.length; i++) {
    for (let j = i + 1; j < injectedNums.length; j++) {
      const a = injectedNums[i];
      const b = injectedNums[j];
      derived.add(normalizeNum(String(Math.abs(a - b))));
      derived.add(normalizeNum(String(a + b)));
      // 비율 — 소수 4자리까지
      if (b !== 0) {
        derived.add(normalizeNum((a / b).toFixed(4)));
      }
      if (a !== 0) {
        derived.add(normalizeNum((b / a).toFixed(4)));
      }
    }
  }

  return derived;
}

// ============================================
// 일반 한국어 3자 명사 화이트리스트 (선수명 false positive 방지)
// ============================================
// v4-4 hotfix: 선수명 regex가 일반 명사를 잘못 잡는 문제 해결.
// 이 집합은 야구 분석 맥락에서 자주 등장하지만 선수명이 아닌 3자 단어들.
// CEO 리뷰 empirical 발견: "가능성이", "창출력을", "경쟁력이" 등이 false positive로 reject됨.
const COMMON_KOREAN_NOUNS = new Set([
  // 일반 분석 어휘
  '가능성', '생산성', '경쟁력', '창출력', '주도권', '신뢰도', '안정성',
  '효율성', '영향력', '확실성', '우월성', '기대치', '위험도', '균형감',
  '유연성', '변동성', '지속성', '일관성', '적응력', '회복력',
  // -적 접미사 형용사 (자주 등장, 선수명 아님)
  '생산적', '중립적', '효율적', '전략적', '결정적', '상대적', '절대적',
  '압도적', '긍정적', '부정적', '기본적', '구체적', '일반적', '본질적',
  '실질적', '지속적', '합리적', '이성적', '기술적', '통계적', '논리적',
  '공격적', '방어적', '현실적', '이상적', '직접적', '간접적', '점진적',
  '혁신적', '적극적', '소극적', '능동적', '수동적', '자동적', '수치적',
  // 야구 용어 (3자)
  '득점권', '출루율', '장타율', '도루율', '피안타', '피홈런', '삼진율',
  '실점률', '방어율', '자책점', '타격률', '볼넷률', '피칭률',
  // 상황 서술
  '선취점', '결정타', '역전승', '패전처', '경기력', '집중력',
  '기동력', '수비력', '타격력', '투구력', '공격력', '방어력',
  '득점력', '돌파력', '파워력',
  // 외래어·일반 명사
  '데이터', '시스템', '밸런스', '페이스', '모멘텀', '컨디션',
  '스타트', '매치업',
  // 동사 활용형 (3자)
  '어준다', '어간다', '어내다', '어주다', '어가다', '어오다',
  '여진다', '여낸다', '여내다', '여준다', '여간다',
  '해진다', '해낸다', '해본다', '해가다',
  // 조사 접미사 혼동
  '수치가', '모델이', '지표가', '결과가', '분석이',
]);

// 3자 단어가 "-적"으로 끝나면 파생형용사 — 선수명이 아닐 확률 매우 높음
// 한국어 파생접미사 -적은 adjective 생성용. 모든 -적 3자 단어 자동 제외.
function isKoreanAdjectivalSuffix(word: string): boolean {
  return word.length === 3 && word.endsWith('적');
}

// 야구 선수 맥락 동사 (이게 뒤에 오면 진짜 선수명일 가능성 높음)
// 주의: 일반 단어("선발", "마운드", "교체")는 제외. 진짜 "선수+동사" 구조만.
const PLAYER_CONTEXT_VERBS = [
  '등판', '선발로', '투수로', '타자로', '출전', '결장',
  '타격', '삼진', '홈런', '피칭', '완투', '세이브',
];

// 한국 성씨 상위 ~50개. 실제 이름 패턴 매칭에 사용.
// v4-4 hotfix: 일반 3자 단어를 "(1성) + (2이름)"으로 오분류하던 버그 해결.
// 이 성씨로 시작하지 않는 3자 단어는 이름이 아닐 확률 매우 높음.
// cycle 132: 마지막 '유' 중복 제거 (character class 동작 무관, 정확성 박제).
// export = test 회귀 가드 가능하게 하기 위함 (cycle 132 silent drift fix).
export const KOREAN_FAMILY_NAMES =
  '김이박최정강조윤장임한오서신권황안송전홍유고문손양배백허남심노하곽성차주우구민';

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
  const injectedRaw = extractNumbers(injectionText);
  const injectedNums = new Set(injectedRaw.map(normalizeNum));

  // v4-4 hotfix: 주입 수치의 산술 파생값(차이·합·비율·percent) 허용
  const injectedFloats = injectedRaw
    .map((s) => parseFloat(s))
    .filter((n) => Number.isFinite(n));
  const derivedNums = computeArithmeticDerivatives(injectedFloats);

  const hallucinated: string[] = [];
  for (const n of outputNums) {
    if (injectedNums.has(n)) continue;
    if (NUMERIC_WHITELIST.has(n)) continue;
    if (derivedNums.has(n)) continue;

    // 부동소수점 근사 일치 체크 (0.0001 이내 차이면 동일 취급)
    const nFloat = parseFloat(n);
    if (Number.isFinite(nFloat)) {
      const closeMatch = injectedFloats.some(
        (inj) => Math.abs(inj - nFloat) < NUMERIC_EPSILON
      );
      if (closeMatch) continue;
    }

    hallucinated.push(n);
  }

  if (hallucinated.length === 0) return [];
  // cycle 76 — slice(0, 5) 제거. detail = mask 함수의 source (extractDetailValues).
  // 6번째 이상 환각 숫자가 사용자 가시 reasoning 에 silent leak 되던 버그.
  return [
    {
      type: 'hallucinated_number',
      severity: 'hard',
      detail: `주입 블록에 없는 수치 ${hallucinated.length}개: ${hallucinated.join(', ')}`,
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

  // v4-4 hotfix: 한국 성씨 기반 매칭으로 false positive 제거
  //
  // 1단계: 야구 선수 맥락 동사(등판/선발로/출전/타격 등)가 뒤따르는 3자 이름 — 신뢰도 높음
  // 2단계: 한국 성씨로 시작하는 3자 + 주격조사(이/가/은/는) 매칭 — 진짜 이름 패턴만
  //
  // CEO 리뷰 empirical 발견: 일반 3자 단어(과대평가/가능성/창출력) + 조사 조합이 원래
  // regex에 잘못 잡히던 버그. 성씨 접두 매칭으로 근본 해결.
  const verbAlternation = PLAYER_CONTEXT_VERBS.join('|');
  const highConfidencePattern = new RegExp(
    `(?<![가-힣])([가-힣]{3})(?=\\s*(?:${verbAlternation}))`,
    'g'
  );
  const subjectMarkerPattern = new RegExp(
    `(?<![가-힣])([${KOREAN_FAMILY_NAMES}][가-힣]{2})(?=[이가은는])`,
    'g'
  );

  const candidates = new Set<string>();

  // 1단계: 동사 뒤 이름 (high confidence)
  for (const m of outputText.matchAll(highConfidencePattern)) {
    candidates.add(m[1]);
  }

  // 2단계: 조사 뒤 이름 (일반 명사 화이트리스트 + 파생형용사 접미사 필터링)
  for (const m of outputText.matchAll(subjectMarkerPattern)) {
    const word = m[1];
    if (COMMON_KOREAN_NOUNS.has(word)) continue;
    if (isKoreanAdjectivalSuffix(word)) continue;
    candidates.add(word);
  }

  const invented = Array.from(candidates).filter((n) => !allowed.has(n));

  if (invented.length === 0) return [];
  // cycle 76 — slice(0, 5) 제거. detail = mask 함수의 source (extractDetailValues).
  return [
    {
      type: 'invented_player_name',
      severity: 'hard',
      detail: `주입 블록에 없는 3자 이름 후보 ${invented.length}개: ${invented.join(', ')}`,
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

// ============================================
// P1 — validateJudgeReasoning (cycle 27, spec 2026-05-04-llm-output-integrity-cycle25)
// ============================================
//
// JudgeVerdict.reasoning = 블로그 본문 자유 텍스트. validateTeamArgument 가 TeamArgument JSON 만
// 검증하던 갭 (spec § 3.1 갭 A). 환각 숫자 / 발명 선수 / 금칙어 만 재사용 — claim-type signal 은
// reasoning 자유 글에 false positive 위험 (블로그 톤은 stat 신호 분포 다름) 으로 skip.

export function validateJudgeReasoning(
  reasoning: string,
  context: GameContext,
  mode: ValidationMode = 'strict'
): ValidationResult {
  const injectionText = buildInjectionText(context);

  const rawViolations: Violation[] = [
    ...checkHallucinatedNumbers(reasoning, injectionText),
    ...checkInventedPlayerNames(reasoning, context),
    ...checkBannedPhrases(reasoning),
  ];

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

// ============================================
// P1 — maskViolatedReasoning
// ============================================
//
// 위반 reasoning 을 fallback 한 줄로 강제 교체하는 대신 위반 부분만 mask. 사용자 가시 reasoning 의
// 정보 가치를 80% 보존하면서 환각/발명 leak 차단 (spec § 4.1).

const MASK_HALLUCINATED_NUMBER = '[검증실패:환각숫자]';
const MASK_INVENTED_PLAYER = '[검증실패:발명선수]';
const MASK_BANNED_PHRASE = '[검증실패:금칙어]';

function extractDetailValues(detail: string): string[] {
  const m = detail.match(/:\s*([^]+)$/);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function maskViolatedReasoning(
  reasoning: string,
  violations: Violation[]
): string {
  let masked = reasoning;

  for (const v of violations) {
    if (v.type === 'hallucinated_number') {
      for (const num of extractDetailValues(v.detail)) {
        const escaped = num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        masked = masked.replace(new RegExp(`\\b${escaped}\\b`, 'g'), MASK_HALLUCINATED_NUMBER);
      }
    } else if (v.type === 'invented_player_name') {
      for (const name of extractDetailValues(v.detail)) {
        masked = masked.split(name).join(MASK_INVENTED_PLAYER);
      }
    } else if (v.type === 'banned_phrase') {
      for (const { pattern } of BANNED_PATTERNS) {
        masked = masked.replace(pattern, MASK_BANNED_PHRASE);
      }
    }
  }

  return masked;
}

// ============================================
// P4 — validateFactorAttribution (cycle 29, spec § 4.4)
// ============================================
//
// LLM postview 가 지목한 factorErrors 의 factor 가중치를 정량 모델과 cross-check.
// LLM 이 low-weight factor (가중치 < threshold) 를 결과 결정 요인으로 강조할 경우 warn.
// spec § 4.4 의 "±10pp 격차" 추출은 reasoning 자유 텍스트 regex 정확도 한계로 보류 —
// 대신 factorErrors 배열 (구조화된 LLM 출력) 의 factor 가중치 cross-check 로 대응.

export interface FactorAttributionInput {
  factor: string;
  predictedBias: number;
}

export interface FactorAttributionResult {
  ok: boolean;
  violations: Violation[];
}

export function validateFactorAttribution(
  factorErrors: FactorAttributionInput[],
  weights: Record<string, number>,
  options?: { lowWeightThreshold?: number }
): FactorAttributionResult {
  const threshold = options?.lowWeightThreshold ?? 0.08;
  const violations: Violation[] = [];

  for (const fe of factorErrors) {
    const base = fe.factor.replace(/^(home_|away_)/, '');
    const weight = weights[base];
    if (typeof weight !== 'number') continue;
    if (weight === 0) continue;
    if (weight < threshold) {
      violations.push({
        type: 'low_weight_factor_emphasis',
        severity: 'warn',
        detail: `factor=${fe.factor} weight=${Math.round(weight * 100)}% (threshold ${Math.round(threshold * 100)}%)`,
      });
    }
  }

  const hardCount = violations.filter((v) => v.severity === 'hard').length;
  const warnCount = violations.filter((v) => v.severity === 'warn').length;
  const ok = hardCount <= HARD_LIMIT && warnCount <= WARN_LIMIT;
  return { ok, violations };
}

// cycle 70 — annotateLowWeightFactorAttribution 제거.
// 사용자 가시 judgeReasoning 에 dev 용어 (factor=foo weight=10% threshold 8%) leak 차단.
// attribution warning 은 notifyValidationViolations (Sentry) 에서만 capture.

// ============================================
// P2 — notifyValidationViolations (Sentry tag 연계, spec § 4.2)
// ============================================
//
// 위반 발생 시 Sentry capture. near-miss (warn 1~2 건 통과 case) 도 동일 path → silent drift 사전 감지.
// packages/kbo-data 가 @sentry/nextjs 직접 의존 X — 동적 import + try/catch silent fallback 패턴.
// Sentry 미설치 환경 (test / 로컬 ollama) 에선 자동 no-op.

export interface ValidationMeta {
  agent: 'team' | 'judge';
  gameId: string | number | null;
  backend?: string;
}

export async function notifyValidationViolations(
  result: ValidationResult,
  meta: ValidationMeta
): Promise<void> {
  if (result.violations.length === 0) return;
  if (process.env.NODE_ENV === 'test') return;

  // packages/kbo-data 가 @sentry/nextjs 직접 의존 X → 동적 import + unknown 타입.
  // apps/moneyball runtime 에선 module 해석 성공, test/cli 에선 silent 실패.
  type SentryModule = {
    captureMessage?: (msg: string, opts: unknown) => void;
    getClient?: () => unknown;
  };
  let Sentry: SentryModule | null = null;
  try {
    Sentry = (await import('@sentry/nextjs' as string)) as SentryModule;
  } catch {
    return;
  }
  if (!Sentry || typeof Sentry.captureMessage !== 'function') return;
  if (typeof Sentry.getClient === 'function' && !Sentry.getClient()) return;

  const backend = meta.backend ?? process.env.LLM_BACKEND ?? 'unknown';

  for (const v of result.violations) {
    try {
      Sentry.captureMessage('llm_validator_violation', {
        level: v.severity === 'hard' ? 'error' : 'warning',
        tags: {
          violation_type: v.type,
          severity: v.severity,
          agent: meta.agent,
          backend,
          passed: String(result.ok),
        },
        extra: {
          detail: v.detail,
          game_id: meta.gameId ?? 'unknown',
        },
      });
    } catch {
      // Sentry 호출 자체 실패해도 메인 path 보호
    }
  }
}
