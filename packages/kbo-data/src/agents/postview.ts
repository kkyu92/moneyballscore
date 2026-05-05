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
  notifyValidationViolations,
} from './validator';
import type { GameContext, AgentResult } from './types';

// 가중치 > 0% 인 factor 만 factorErrors 후보 (cycle 11: head_to_head/sfr 가중치 0% 가 LLM reasoning 의 70% 차지하던 silent drift 차단)
const WEIGHTED_FACTOR_BASES = new Set(
  Object.entries(DEFAULT_WEIGHTS)
    .filter(([, w]) => w > 0)
    .map(([k]) => k)
);

export function isWeightedFactor(factor: string): boolean {
  const base = factor.replace(/^(home_|away_)/, '');
  return WEIGHTED_FACTOR_BASES.has(base);
}

// cycle 15 — LLM prompt-level constraint 용. cycle 12 (사후 filter) 는 factorErrors 배열만 막고
// reasoning 본문에서 0% factor 거론은 통과시켰음. prompt 자체에 0% factor 명시 + 추론 금지 규칙
// 박제 → 모델 가중치 ↔ LLM reasoning 일관성 prompt-level 보장.
const ZERO_WEIGHT_FACTOR_LABELS_KO: Record<string, string> = {
  head_to_head: '상대전적',
  park_factor: '구장보정',
  sfr: '수비SFR',
};

export function getZeroWeightFactorPromptList(): string {
  return Object.entries(DEFAULT_WEIGHTS)
    .filter(([, w]) => (w as number) === 0)
    .map(([k]) => {
      const ko = ZERO_WEIGHT_FACTOR_LABELS_KO[k];
      return ko ? `${k} (${ko})` : k;
    })
    .join(', ');
}

const ZERO_WEIGHT_FACTOR_LIST_PROMPT = getZeroWeightFactorPromptList();

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
3. 감정·심리·내러티브·운 금지.
4. 가중치 0% factor (${ZERO_WEIGHT_FACTOR_LIST_PROMPT}) 는 정량 모델 가중치가 0이라
   pre_game 확률에 기여하지 않습니다. keyFactor 로 지목 금지 + summary 핵심 근거로도 사용 금지.

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
    { "factor": "home_bullpen_fip", "predictedBias": 0.08, "diagnosis": "한 줄 진단" },
    { "factor": "away_recent_form", "predictedBias": -0.05, "diagnosis": "한 줄" }
  ],
  "reasoning": "블로그용 300-500자 종합 분석. 왜 pre_game이 틀렸고 어떤 factor를 재검토해야 하는지."
}

규칙:
- factorErrors는 편향 절댓값 내림차순 상위 3개까지만
- predictedBias는 pre_game factors의 (값 - 0.5) 수치
- diagnosis는 실제 결과와 연결 (예: "홈 불펜 편향 +0.08이지만 실제로는 9회 블론 세이브")
- reasoning에 새 숫자·선수명 금지. 주입된 데이터만 사용.
- 가중치 0% factor (${ZERO_WEIGHT_FACTOR_LIST_PROMPT}) 는 정량 모델 가중치가 0이라
  pre_game 확률 형성에 기여하지 않습니다. factorErrors 후보에서 제외하고 reasoning
  핵심 근거로도 사용 금지. (cycle 11 발견 — 0% factor 가 LLM reasoning 70% 차지)`;

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

function parseJudgePostview(text: string): { factorErrors: FactorError[]; reasoning: string } {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);

    const factorErrors: FactorError[] = Array.isArray(parsed.factorErrors)
      ? parsed.factorErrors
          .map((fe: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const f = fe as any;
            return {
              factor: String(f.factor || ''),
              predictedBias: Number(f.predictedBias) || 0,
              diagnosis: String(f.diagnosis || '').slice(0, 200),
            };
          })
          .filter((fe: FactorError) => fe.factor.length > 0 && isWeightedFactor(fe.factor))
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

  console.log(
    `[Postview] ${awayTeam}@${homeTeam} ${actual.homeScore}:${actual.awayScore}: ` +
    `${judgeData.factorErrors.length} factorErrors / ${attribution.violations.length} attribution warns [${totalTokens} tokens]`
  );

  return {
    game: context.game,
    actual,
    homePostview: homePv,
    awayPostview: awayPv,
    factorErrors: judgeData.factorErrors,
    judgeReasoning: judgeData.reasoning,
    totalTokens,
    totalDurationMs: Date.now() - startTime,
  };
}

/**
 * LLM 실패 시 factor 편향 기반 deterministic fallback
 * 결과와 반대 방향으로 편향된 상위 3 factor 선택
 */
export function deriveFactorErrorsFallback(
  factors: Record<string, number>,
  homeWon: boolean
): FactorError[] {
  const entries = Object.entries(factors)
    .filter(([k]) => isWeightedFactor(k))
    .map(([k, v]) => ({
      factor: k,
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
