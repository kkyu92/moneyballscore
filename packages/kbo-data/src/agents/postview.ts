/**
 * Postview — 경기 종료 후 "왜 틀렸나" 분석 오케스트레이터
 *
 * Phase v4-3 Task 4.
 *
 * 프리뷰(pre_game)와 구조는 비슷하지만 입력·프롬프트가 다름:
 *   - 입력: GameContext + actualResult + originalPrediction (pre_game 예측)
 *   - 홈/원정 에이전트: "우리 팀이 왜 이겼/졌는지, pre_game이 무엇을 놓쳤는지"
 *   - 심판: 가장 편향된 factor를 이름으로 지목 (factor-level attribution)
 *
 * 출력은 predictions 테이블에 `prediction_type='post_game'` row로 insert.
 * 기존 `pre_game` row는 절대 update 금지 (이력 보존).
 */

import { KBO_TEAMS, DEFAULT_WEIGHTS } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { callLLM } from './llm';
import {
  validateFactorAttribution,
  validateJudgeReasoning,
  maskViolatedReasoning,
  notifyValidationViolations,
  resolveValidationMode,
} from './validator';
import type { GameContext, AgentResult } from './types';

// 가중치 > 0% 인 factor 만 factorErrors 후보 (cycle 11: head_to_head/sfr 가중치 0% 가 LLM reasoning 의 70% 차지하던 silent drift 차단)
const WEIGHTED_FACTOR_BASES = new Set(
  Object.entries(DEFAULT_WEIGHTS)
    .filter(([, w]) => w > 0)
    .map(([k]) => k)
);

// cycle 131 — production factor 키는 home_/away_ prefix 없음 (predictor.ts 가 factors.sp_fip /
// factors.bullpen_fip 등 normalized single key 로 박제). 단 LLM 이 legacy 예시 또는 user message 의
// home/away 어휘 보고 'home_bullpen_fip' 같은 prefixed key 박제할 가능성 존재 → strip 후 canonicalize.
// downstream factor-bias-bootstrap-ci.ts 가 prefixed key 를 grouping 못해 silent skip 되던 drift 차단.
export function canonicalizeFactorKey(factor: string): string {
  return factor.replace(/^(home_|away_)/, '');
}

export function isWeightedFactor(factor: string): boolean {
  return WEIGHTED_FACTOR_BASES.has(canonicalizeFactorKey(factor));
}

// cycle 15 — LLM prompt-level constraint 용. cycle 12 (사후 filter) 는 factorErrors 배열만 막고
// reasoning 본문에서 0% factor 거론은 통과시켰음. prompt 자체에 0% factor 명시 + 추론 금지 규칙
// 박제 → 모델 가중치 ↔ LLM reasoning 일관성 prompt-level 보장.
const ZERO_WEIGHT_FACTOR_LABELS_KO: Record<string, string> = {
  head_to_head: '상대전적',
  park_factor: '구장보정',
  sfr: '수비SFR',
};

export function getZeroWeightFactorPromptList(
  weights: Record<string, number> = DEFAULT_WEIGHTS,
): string {
  return Object.entries(weights)
    .filter(([, w]) => (w as number) === 0)
    .map(([k]) => {
      const ko = ZERO_WEIGHT_FACTOR_LABELS_KO[k];
      return ko ? `${k} (${ko})` : k;
    })
    .join(', ');
}

// cycle 126 silent drift 가드 — DEFAULT_WEIGHTS 안 weight=0 factor 0건이면 helper 가
// 빈 문자열 반환. 이전 코드는 prompt template 안 `(${ZERO_WEIGHT_FACTOR_LIST_PROMPT})`
// 가 빈 괄호 `()` 로 출력되어 LLM 추론 noise + cycle 17 주석에 "vacuous" 박제만 있고 fix 부재.
// 본 helper 들은 list 가 비어있을 때 규칙 줄 자체를 skip → DEFAULT_WEIGHTS 변경 시 prompt 자동 정합.
export function getZeroWeightRuleTeamPostview(
  weights: Record<string, number> = DEFAULT_WEIGHTS,
): string {
  const list = getZeroWeightFactorPromptList(weights);
  if (!list) return '';
  return `\n4. 가중치 0% factor (${list}) 는 정량 모델 가중치가 0이라\n   pre_game 확률에 기여하지 않습니다. keyFactor 로 지목 금지 + summary 핵심 근거로도 사용 금지.`;
}

export function getZeroWeightRuleJudgePostview(
  weights: Record<string, number> = DEFAULT_WEIGHTS,
): string {
  const list = getZeroWeightFactorPromptList(weights);
  if (!list) return '';
  return `\n- 가중치 0% factor (${list}) 는 정량 모델 가중치가 0이라\n  pre_game 확률 형성에 기여하지 않습니다. factorErrors 후보에서 제외하고 reasoning\n  핵심 근거로도 사용 금지. (cycle 11 발견 — 0% factor 가 LLM reasoning 70% 차지)`;
}

export function getZeroWeightRuleJudgePregame(
  weights: Record<string, number> = DEFAULT_WEIGHTS,
): string {
  const list = getZeroWeightFactorPromptList(weights);
  if (!list) return '';
  return `\n- 가중치 0% factor (${list}) 는 정량 모델 가중치가 0이라\n  확률 형성에 기여하지 않습니다. 양쪽 에이전트의 keyFactor 가 이에 해당해도 reasoning\n  핵심 근거로 사용 금지. (cycle 11 발견 — 0% factor 가 LLM reasoning 70% 차지하던 silent drift 차단)`;
}

const ZERO_WEIGHT_RULE_TEAM_POSTVIEW = getZeroWeightRuleTeamPostview();
const ZERO_WEIGHT_RULE_JUDGE_POSTVIEW = getZeroWeightRuleJudgePostview();

// ============================================
// 타입
// ============================================

export interface ActualResult {
  homeScore: number;
  awayScore: number;
  winnerCode: TeamCode;
}

export interface OriginalPrediction {
  predictedWinner: TeamCode;
  homeWinProb: number;
  factors: Record<string, number>;
  reasoning: string; // pre_game reasoning (블로그 글)
}

export interface FactorError {
  factor: string;
  predictedBias: number; // pre_game 편향 (0.5 대비)
  diagnosis: string; // 왜 틀렸는지 한 줄
}

export interface TeamPostview {
  team: TeamCode;
  summary: string; // 왜 이겼/졌는지 3-4문장
  keyFactor: string; // 가장 결정적이었던 factor
  missedBy: string; // pre_game이 놓친 것
}

export interface PostviewResult {
  game: GameContext['game'];
  actual: ActualResult;
  homePostview: TeamPostview;
  awayPostview: TeamPostview;
  factorErrors: FactorError[];
  judgeReasoning: string; // 블로그용 종합 분석 (300-500자)
  totalTokens: number;
  totalDurationMs: number;
}

// ============================================
// 팀 postview 에이전트 (Haiku)
// ============================================

export const TEAM_POSTVIEW_SYSTEM = `당신은 KBO 팀의 사후 분석가입니다. 경기가 끝난 뒤 우리 팀의 관점에서
"왜 이겼/졌는지"를 담담하고 데이터 기반으로 설명합니다.

규칙:
1. 주입된 실제 결과와 팩터 수치만 인용하세요. 새 숫자·선수명 금지.
2. pre_game 예측이 무엇을 놓쳤는지 구체적으로 지적하세요 (예: "home_bullpen_fip이 +0.08 편향됐지만 실제로 7회 역전").
3. 감정·심리·내러티브·운 금지.${ZERO_WEIGHT_RULE_TEAM_POSTVIEW}

반드시 JSON:
{
  "summary": "3-4문장. 왜 이 결과가 나왔는지.",
  "keyFactor": "가장 결정적이었던 pre_game factor 키 (예: home_bullpen_fip)",
  "missedBy": "pre_game 예측이 놓친 한 줄"
}`;

function buildTeamPostviewMessage(
  team: TeamCode,
  isWinner: boolean,
  context: GameContext,
  actual: ActualResult,
  original: OriginalPrediction
): string {
  const isHome = context.game.homeTeam === team;
  const myName = KBO_TEAMS[team].name;
  const homeName = KBO_TEAMS[context.game.homeTeam].name;
  const awayName = KBO_TEAMS[context.game.awayTeam].name;

  const factorLines = Object.entries(original.factors)
    .map(([k, v]) => `  ${k}: ${v.toFixed(3)} (편향 ${(v - 0.5).toFixed(3)})`)
    .join('\n');

  return `경기: ${awayName} @ ${homeName}
최종 스코어: ${homeName} ${actual.homeScore} - ${actual.awayScore} ${awayName}
승리: ${KBO_TEAMS[actual.winnerCode].name}

[pre_game 예측]
예측 승자: ${KBO_TEAMS[original.predictedWinner].name}
홈 승리확률: ${Math.round(original.homeWinProb * 100)}%
factor 분해:
${factorLines}
pre_game 논거: ${original.reasoning.slice(0, 400)}

[${myName} 입장]
${isHome ? '홈' : '원정'}팀. 이 경기 ${isWinner ? '승리' : '패배'}.

${myName}의 관점에서 왜 ${isWinner ? '이겼는지' : '졌는지'}, pre_game 예측이 무엇을 놓쳤는지 분석하세요.`;
}

function parseTeamPostview(text: string, team: TeamCode): TeamPostview {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      team,
      summary: String(parsed.summary || '').slice(0, 500),
      keyFactor: String(parsed.keyFactor || ''),
      missedBy: String(parsed.missedBy || '').slice(0, 300),
    };
  } catch {
    return {
      team,
      summary: text.slice(0, 300),
      keyFactor: '',
      missedBy: '',
    };
  }
}

async function runTeamPostviewAgent(
  team: TeamCode,
  isWinner: boolean,
  context: GameContext,
  actual: ActualResult,
  original: OriginalPrediction
): Promise<AgentResult<TeamPostview>> {
  return callLLM<TeamPostview>(
    {
      model: 'haiku',
      systemPrompt: TEAM_POSTVIEW_SYSTEM,
      userMessage: buildTeamPostviewMessage(team, isWinner, context, actual, original),
      maxTokens: 600,
    },
    (text) => parseTeamPostview(text, team)
  );
}

// ============================================
// 심판 factor-attribution 에이전트 (Sonnet)
// ============================================

export const JUDGE_POSTVIEW_SYSTEM = `당신은 KBO 사후 분석 심판입니다. pre_game 예측이 실제 결과와
왜 달랐는지 factor 단위로 진단합니다.

역할:
1. factor-level attribution: pre_game factor들 중 어느 것이 가장 크게 틀렸는지 이름으로 지목
2. 양쪽 팀 postview를 종합해 블로그용 분석문 작성
3. 어떤 factor를 다음 예측에서 재검토해야 하는지 제안

반드시 JSON:
{
  "factorErrors": [
    { "factor": "bullpen_fip", "predictedBias": 0.08, "diagnosis": "한 줄 진단" },
    { "factor": "recent_form", "predictedBias": -0.05, "diagnosis": "한 줄" }
  ],
  "reasoning": "블로그용 300-500자 종합 분석. 왜 pre_game이 틀렸고 어떤 factor를 재검토해야 하는지."
}

규칙:
- factor 키는 [pre_game 예측] 의 factors 블록에 박제된 그대로 사용 (예: bullpen_fip, recent_form, sp_fip). home_/away_ prefix 금지 — 정규화된 단일 키만 박제됨.
- factorErrors는 편향 절댓값 내림차순 상위 3개까지만
- predictedBias는 pre_game factors의 (값 - 0.5) 수치 (홈 유리 편향 = +, 원정 유리 편향 = -)
- diagnosis는 실제 결과와 연결 (예: "불펜 편향 +0.08 (홈 유리)이지만 실제로는 9회 블론 세이브")
- reasoning에 새 숫자·선수명 금지. 주입된 데이터만 사용.${ZERO_WEIGHT_RULE_JUDGE_POSTVIEW}`;

function buildJudgePostviewMessage(
  context: GameContext,
  actual: ActualResult,
  original: OriginalPrediction,
  homePv: TeamPostview,
  awayPv: TeamPostview
): string {
  const homeName = KBO_TEAMS[context.game.homeTeam].name;
  const awayName = KBO_TEAMS[context.game.awayTeam].name;

  const factorLines = Object.entries(original.factors)
    .map(([k, v]) => `  ${k}: ${v.toFixed(3)} (편향 ${(v - 0.5).toFixed(3)})`)
    .join('\n');

  return `경기: ${awayName} @ ${homeName}
스코어: ${homeName} ${actual.homeScore} - ${actual.awayScore} ${awayName}
실제 승자: ${KBO_TEAMS[actual.winnerCode].name}

[pre_game 예측]
승자: ${KBO_TEAMS[original.predictedWinner].name} (홈 ${Math.round(original.homeWinProb * 100)}%)
factors:
${factorLines}

[${homeName} postview]
${homePv.summary}
핵심 factor: ${homePv.keyFactor}
pre_game이 놓친 것: ${homePv.missedBy}

[${awayName} postview]
${awayPv.summary}
핵심 factor: ${awayPv.keyFactor}
pre_game이 놓친 것: ${awayPv.missedBy}

양측 postview와 factor 분해를 종합해 factor-level attribution + 블로그용 분석을 작성하세요.`;
}

export function parseJudgePostview(text: string): { factorErrors: FactorError[]; reasoning: string } {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);

    // cycle 131 — LLM 이 'home_bullpen_fip' 같은 prefixed key 박제해도 canonicalize.
    // production factor 키는 prefix 없음 (predictor.ts 단일 normalized key).
    // downstream factor-bias-bootstrap-ci.ts 가 ['sfr', 'head_to_head'] no-prefix 로 grouping →
    // prefixed key 가 박제되면 silent skip 되던 drift 차단.
    // 또한 abs(predictedBias) 내림차순 강제 정렬 — LLM 이 prompt 룰 어겨도 안전.
    const factorErrors: FactorError[] = Array.isArray(parsed.factorErrors)
      ? parsed.factorErrors
          .map((fe: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const f = fe as any;
            return {
              factor: canonicalizeFactorKey(String(f.factor || '')),
              predictedBias: Number(f.predictedBias) || 0,
              diagnosis: String(f.diagnosis || '').slice(0, 200),
            };
          })
          .filter((fe: FactorError) => fe.factor.length > 0 && isWeightedFactor(fe.factor))
          .sort((a: FactorError, b: FactorError) => Math.abs(b.predictedBias) - Math.abs(a.predictedBias))
          .slice(0, 3)
      : [];

    return {
      factorErrors,
      reasoning: String(parsed.reasoning || '').slice(0, 1000),
    };
  } catch {
    return {
      factorErrors: [],
      reasoning: text.slice(0, 500),
    };
  }
}

// ============================================
// 오케스트레이터
// ============================================

/**
 * 경기별 사후 분석 실행
 * 1. 홈/원정 postview 에이전트 병렬 실행
 * 2. 심판 factor-attribution 순차 실행
 * 3. 결과 반환 (DB 저장은 호출자 담당)
 */
export async function runPostview(
  context: GameContext,
  actual: ActualResult,
  original: OriginalPrediction
): Promise<PostviewResult> {
  const { homeTeam, awayTeam } = context.game;
  const startTime = Date.now();
  let totalTokens = 0;

  const homeWon = actual.winnerCode === homeTeam;

  // Step 1: 양팀 postview 병렬
  const [homeResult, awayResult] = await Promise.all([
    runTeamPostviewAgent(homeTeam, homeWon, context, actual, original),
    runTeamPostviewAgent(awayTeam, !homeWon, context, actual, original),
  ]);
  totalTokens += homeResult.tokensUsed + awayResult.tokensUsed;

  const homePv: TeamPostview = homeResult.data || {
    team: homeTeam,
    summary: '데이터 기반 사후 분석',
    keyFactor: '',
    missedBy: '',
  };
  const awayPv: TeamPostview = awayResult.data || {
    team: awayTeam,
    summary: '데이터 기반 사후 분석',
    keyFactor: '',
    missedBy: '',
  };

  // Step 2: 심판 순차 실행
  const judgeResult = await callLLM<{ factorErrors: FactorError[]; reasoning: string }>(
    {
      model: 'sonnet',
      systemPrompt: JUDGE_POSTVIEW_SYSTEM,
      userMessage: buildJudgePostviewMessage(context, actual, original, homePv, awayPv),
      maxTokens: 1200,
    },
    parseJudgePostview
  );
  totalTokens += judgeResult.tokensUsed;

  const judgeData = judgeResult.data || {
    factorErrors: deriveFactorErrorsFallback(original.factors, homeWon),
    reasoning: '사후 분석 LLM 실패. factor 편향 기반 자동 fallback.',
  };

  // cycle 29 (P4) — factor attribution cross-check. low-weight factor 를 결과 요인으로 강조 시 warn.
  // cycle 70 — 사용자 가시 reasoning 에 dev 용어 (factor=foo weight=10% threshold 8%) leak 차단.
  // attribution warning 은 Sentry capture 만 (dev 모니터링 유지). 사용자 가시 텍스트엔 표기 X.
  const attribution = validateFactorAttribution(
    judgeData.factorErrors,
    DEFAULT_WEIGHTS as Record<string, number>
  );
  void notifyValidationViolations(
    { ok: attribution.ok, violations: attribution.violations },
    { agent: 'judge', gameId: context.game.externalGameId ?? null }
  );

  // cycle 83 — judgeReasoning 환각/발명/금칙어 검증 + mask. judge-agent.ts (pre-game)
  // cycle 76 fix 의 카운터파트. postview judgeReasoning 은 /analysis/game/[id] PostviewPanel
  // 에 직접 노출 = 사용자 가시 영역. silent leak 차단.
  const reasoningValidation = validateJudgeReasoning(
    judgeData.reasoning,
    context,
    resolveValidationMode()
  );
  void notifyValidationViolations(reasoningValidation, {
    agent: 'judge',
    gameId: context.game.externalGameId ?? null,
  });
  const finalReasoning =
    reasoningValidation.violations.length > 0
      ? maskViolatedReasoning(judgeData.reasoning, reasoningValidation.violations)
      : judgeData.reasoning;

  console.log(
    `[Postview] ${awayTeam}@${homeTeam} ${actual.homeScore}:${actual.awayScore}: ` +
    `${judgeData.factorErrors.length} factorErrors / ${attribution.violations.length} attribution warns / ${reasoningValidation.violations.length} reasoning violations [${totalTokens} tokens]`
  );

  return {
    game: context.game,
    actual,
    homePostview: homePv,
    awayPostview: awayPv,
    factorErrors: judgeData.factorErrors,
    judgeReasoning: finalReasoning,
    totalTokens,
    totalDurationMs: Date.now() - startTime,
  };
}

/**
 * LLM 실패 시 factor 편향 기반 deterministic fallback
 * 결과와 반대 방향으로 편향된 상위 3 factor 선택
 *
 * cycle 177 — parseJudgePostview 와 동일하게 canonicalizeFactorKey 적용.
 * production factor (predictor.ts) 는 no-prefix 박제이지만 input 이 prefixed key 받아도
 * downstream factor-bias-bootstrap-ci.ts FACTORS_OF_INTEREST=['sfr','head_to_head'] no-prefix
 * grouping 안전망. cycle 131 silent drift family defensive consistency 통일.
 */
export function deriveFactorErrorsFallback(
  factors: Record<string, number>,
  homeWon: boolean
): FactorError[] {
  const entries = Object.entries(factors)
    .filter(([k]) => isWeightedFactor(k))
    .map(([k, v]) => ({
      factor: canonicalizeFactorKey(k),
      bias: v - 0.5,
    }));

  // 결과와 반대 방향 편향만 (홈승인데 <0.5 편향, 또는 홈패인데 >0.5 편향)
  const wrong = entries
    .filter(({ bias }) => (homeWon && bias < 0) || (!homeWon && bias > 0))
    .sort((a, b) => Math.abs(b.bias) - Math.abs(a.bias))
    .slice(0, 3);

  return wrong.map(({ factor, bias }) => ({
    factor,
    predictedBias: Number(bias.toFixed(3)),
    diagnosis: `편향 ${bias >= 0 ? '+' : ''}${bias.toFixed(2)}이(가) 실제 결과와 반대 방향`,
  }));
}
