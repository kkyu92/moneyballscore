import { KBO_TEAMS } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { callLLM } from './llm';
import { getZeroWeightFactorPromptList } from './postview';
import type { TeamArgument, CalibrationHint, JudgeVerdict, AgentResult, GameContext } from './types';
import {
  validateJudgeReasoning,
  maskViolatedReasoning,
  notifyValidationViolations,
  resolveValidationMode,
} from './validator';

const ZERO_WEIGHT_FACTOR_LIST_PROMPT = getZeroWeightFactorPromptList();

export const SYSTEM_PROMPT = `당신은 승부예측의 심판 분석가입니다.
두 팀 에이전트의 논거와 정량적 모델 결과를 종합하여 최종 확률을 결정합니다.

역할:
1. 양쪽 논거의 강점/약점을 공정하게 평가
2. 정량 모델(v1.5 가중합산)의 결과를 참고하되 맹신하지 않음
3. 회고 에이전트의 보정 힌트가 있으면 반영
4. 최종 홈팀 승리확률 결정 (0.15 ~ 0.85 범위)

반드시 JSON 형식으로 응답하세요:
{
  "homeWinProb": 0.58,
  "confidence": 0.65,
  "homeArgSummary": "홈팀 에이전트의 핵심 논거 요약 (1-2문장)",
  "awayArgSummary": "원정 에이전트의 핵심 논거 요약 (1-2문장)",
  "calibrationApplied": "적용된 보정 (없으면 null)",
  "reasoning": "최종 판단 근거. 왜 이 확률인지. 사용자가 읽을 글. 300자 이내.",
  "predictedWinner": "팀코드"
}

규칙:
- Steelman 원칙: 상대방의 가장 강한 논거를 먼저 인정한 후 판단
- 정량 모델과 토론 결과가 크게 다르면 (10%+) 이유를 설명
- 확률은 반드시 0.15~0.85 범위 (야구는 불확실하다)
- reasoning은 블로그 프리뷰 글로 바로 사용됩니다. 읽는 사람을 위해 쓰세요.
- 가중치 0% factor (${ZERO_WEIGHT_FACTOR_LIST_PROMPT}) 는 정량 모델 가중치가 0이라
  확률 형성에 기여하지 않습니다. 양쪽 에이전트의 keyFactor 가 이에 해당해도 reasoning
  핵심 근거로 사용 금지. (cycle 11 발견 — 0% factor 가 LLM reasoning 70% 차지하던 silent drift 차단)`;

function buildUserMessage(
  homeTeam: TeamCode,
  awayTeam: TeamCode,
  homeArg: TeamArgument,
  awayArg: TeamArgument,
  quantitativeProb: number,
  calibration: CalibrationHint | null
): string {
  const homeName = KBO_TEAMS[homeTeam].name;
  const awayName = KBO_TEAMS[awayTeam].name;

  let msg = `경기: ${awayName} @ ${homeName}

[${homeName} 에이전트 주장]
강점: ${homeArg.strengths.join(', ')}
상대 약점: ${homeArg.opponentWeaknesses.join(', ')}
핵심 팩터: ${homeArg.keyFactor}
승리 확신: ${Math.round(homeArg.confidence * 100)}%
논거: ${homeArg.reasoning}

[${awayName} 에이전트 주장]
강점: ${awayArg.strengths.join(', ')}
상대 약점: ${awayArg.opponentWeaknesses.join(', ')}
핵심 팩터: ${awayArg.keyFactor}
승리 확신: ${Math.round(awayArg.confidence * 100)}%
논거: ${awayArg.reasoning}

[정량 모델 v1.5 결과]
홈팀 승리확률: ${Math.round(quantitativeProb * 100)}%`;

  if (calibration) {
    msg += `\n\n[회고 에이전트 보정 힌트]`;
    if (calibration.recentBias) msg += `\n편향: ${calibration.recentBias}`;
    if (calibration.teamSpecific) msg += `\n팀 특이사항: ${calibration.teamSpecific}`;
    if (calibration.modelWeakness) msg += `\n모델 약점: ${calibration.modelWeakness}`;
    if (calibration.adjustmentSuggestion !== 0) {
      msg += `\n보정 제안: ${calibration.adjustmentSuggestion > 0 ? '+' : ''}${Math.round(calibration.adjustmentSuggestion * 100)}%`;
    }
  }

  msg += '\n\n양쪽 논거와 정량 모델을 종합하여 최종 판단하세요.';
  return msg;
}

function parseResponse(text: string, homeTeam: TeamCode, awayTeam: TeamCode): JudgeVerdict {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);

    const homeWinProb = Math.max(0.15, Math.min(0.85, Number(parsed.homeWinProb) || 0.5));

    return {
      homeWinProb,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
      homeArgSummary: String(parsed.homeArgSummary || ''),
      awayArgSummary: String(parsed.awayArgSummary || ''),
      calibrationApplied: parsed.calibrationApplied || null,
      reasoning: String(parsed.reasoning || '').slice(0, 1000),
      predictedWinner: homeWinProb >= 0.5 ? homeTeam : awayTeam,
    };
  } catch {
    return {
      homeWinProb: 0.5,
      confidence: 0.3,
      homeArgSummary: '',
      awayArgSummary: '',
      calibrationApplied: null,
      reasoning: text.slice(0, 300),
      predictedWinner: homeTeam,
    };
  }
}

/**
 * 심판 에이전트: 양쪽 논거 + 정량 모델 + 회고 보정 → 최종 확률
 *
 * cycle 27 — context 인자 추가: validateJudgeReasoning 로 reasoning 검증 + 위반 mask + Sentry tag.
 * context 미전달 시 (legacy 호출부) 검증 skip — 후방 호환.
 */
export async function runJudgeAgent(
  homeTeam: TeamCode,
  awayTeam: TeamCode,
  homeArg: TeamArgument,
  awayArg: TeamArgument,
  quantitativeProb: number,
  calibration: CalibrationHint | null,
  context?: GameContext
): Promise<AgentResult<JudgeVerdict>> {
  const result = await callLLM<JudgeVerdict>(
    {
      model: 'sonnet',
      systemPrompt: SYSTEM_PROMPT,
      userMessage: buildUserMessage(homeTeam, awayTeam, homeArg, awayArg, quantitativeProb, calibration),
      maxTokens: 1500,
    },
    (text) => parseResponse(text, homeTeam, awayTeam)
  );

  if (!context || !result.success || !result.data || !result.data.reasoning) {
    return result;
  }

  const mode = resolveValidationMode();
  const validation = validateJudgeReasoning(result.data.reasoning, context, mode);

  void notifyValidationViolations(validation, {
    agent: 'judge',
    gameId: context.game.externalGameId ?? null,
  });

  if (validation.violations.length === 0) return result;

  const maskedReasoning = maskViolatedReasoning(result.data.reasoning, validation.violations);
  return {
    ...result,
    data: { ...result.data, reasoning: maskedReasoning },
  };
}
