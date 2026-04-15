/**
 * Validator Layer 1 — 팀 에이전트 JSON 응답 결정론적 검증
 *
 * Phase v4-2 신규. 환각·편향·금칙어·선수명 발명을 차단.
 * 위반 시 AgentResult.success=false로 전환되어 debate.ts의 기존 fallback 경로 사용.
 *
 * 초기 정책 (Q2 결정):
 *   - 하드 위반(환각, 선수명 발명) 1건 이상 → reject
 *   - 경고(금칙어, claim-type 분류 불가) 3건 이상 → reject
 *   - 그 외 통과
 *
 * 한국어 수치 표기("약 3할") 미지원은 의도된 한계. v4-3에서 개선.
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
export const WARN_LIMIT = 2; // 3건 이상이면 reject

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

export function checkHallucinatedNumbers(
  outputText: string,
  injectionText: string
): Violation[] {
  const outputNums = new Set(extractNumbers(outputText));
  const injectedNums = new Set(extractNumbers(injectionText));

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
  // 주입 블록에 포함된 선수명 (2~4자 한글)
  const allowed = new Set<string>();
  if (context.homeSPStats?.name) allowed.add(context.homeSPStats.name);
  if (context.awaySPStats?.name) allowed.add(context.awaySPStats.name);

  // 출력에서 2~4자 한글 이름 후보 추출
  const candidates = outputText.match(/[가-힣]{2,4}/g) ?? [];
  const invented: string[] = [];

  // 한국어 일반 명사 제외용 최소 불용어 (이름으로 오탐하면 곤란한 단어)
  const nonNameTokens = new Set([
    '선발', '투수', '타자', '불펜', '타선', '팀', '경기', '승리', '패배',
    '홈팀', '원정', '파크팩터', '상대전적', '최근', '수비', '공격', '반박',
    '주장', '약점', '강점', '논거', '화이트', '데이터', '분석', '수치',
    '예측', '모델', '확률', '가능성', '결론', '근거', '편향',
  ]);

  for (const c of candidates) {
    if (allowed.has(c)) continue;
    if (nonNameTokens.has(c)) continue;
    // 한국어 이름 패턴 휴리스틱: 2~3자는 엄격히 이름 후보로 간주. 4자는 일반 명사 많음 → 제외
    if (c.length === 4) continue;
    // 2자 이름은 false positive 위험 → 3자만 강력 체크
    if (c.length === 3) invented.push(c);
  }

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

function classifySentence(sentence: string): string | null {
  for (const { type, patterns } of CLAIM_TYPE_SIGNALS) {
    if (patterns.some((p) => p.test(sentence))) return type;
  }
  return null;
}

export function checkClaimTypes(outputText: string): Violation[] {
  // 문장 분할 (마침표/느낌표/물음표/쉼표)
  const sentences = outputText
    .split(/[.!?,]|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 5); // 너무 짧은 조각은 제외

  let unclassified = 0;
  for (const s of sentences) {
    if (classifySentence(s) === null) unclassified++;
  }

  // 문장 수 대비 분류 불가 비율 체크
  // 전체 문장 중 50% 이상 분류 불가면 warning
  if (sentences.length > 0 && unclassified / sentences.length > 0.5) {
    return [
      {
        type: 'unclassified_claim',
        severity: 'warn',
        detail: `${sentences.length}문장 중 ${unclassified}개가 허용 claim-type 5개 중 어느 것에도 분류 안 됨`,
      },
    ];
  }
  return [];
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
  context: GameContext
): ValidationResult {
  const outputText = [
    arg.reasoning,
    arg.keyFactor,
    ...arg.strengths,
    ...arg.opponentWeaknesses,
  ].join(' ');

  const injectionText = buildInjectionText(context);

  const violations: Violation[] = [
    ...checkHallucinatedNumbers(outputText, injectionText),
    ...checkInventedPlayerNames(outputText, context),
    ...checkBannedPhrases(outputText),
    ...checkClaimTypes(outputText),
  ];

  const hardCount = violations.filter((v) => v.severity === 'hard').length;
  const warnCount = violations.filter((v) => v.severity === 'warn').length;

  const ok = hardCount <= HARD_LIMIT && warnCount <= WARN_LIMIT;
  return { ok, violations };
}
