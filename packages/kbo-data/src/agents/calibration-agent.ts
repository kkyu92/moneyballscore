import { KBO_TEAMS, LLM_MAX_TOKENS_CALIBRATION, errMsg, shortTeamName } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { renderParkForLLM, renderRivalryForLLM, renderSeasonForLLM, renderTimeWindowsForLLM } from '../context/domain';
import { callLLM } from './llm';
import {
  captureCalibrationParseFallback,
  captureCalibrationApiFallback,
  resolveValidationMode,
  validateCalibrationHint,
  maskViolatedReasoning,
  notifyValidationViolations,
} from './validator';
import { logValidatorEvent } from './validator-logger';
import type { CalibrationHint, AgentResult } from './types';

const SYSTEM_PROMPT = `당신은 MoneyBall 예측 모델의 회고 분석가입니다.
과거 예측 성과 데이터를 보고, 현재 예측에 적용할 보정 힌트를 제공합니다.

역할:
1. 최근 예측에서 반복되는 편향 감지 (홈팀 과대평가, 특정 팀 연속 오답 등)
2. 모델이 잘못 판단하는 영역 지적 (불펜 과대평가, Elo 과신뢰 등)
3. 보정 제안값 산출 (-0.05 ~ +0.05 범위)

반드시 JSON 형식으로 응답하세요:
{
  "recentBias": "최근 편향 (없으면 null)",
  "teamSpecific": "이 경기 팀 관련 특이사항 (없으면 null)",
  "modelWeakness": "모델 약점 (없으면 null)",
  "adjustmentSuggestion": 0.00
}

규칙:
- 데이터가 부족하면 보정하지 마세요 (adjustmentSuggestion: 0)
- 과보정 금지. 최대 ±5%.
- 경기 수가 10개 미만이면 통계적으로 유의하지 않다고 판단.`;

interface PredictionHistory {
  totalPredictions: number;
  correctPredictions: number;
  recentResults: Array<{
    date: string;
    homeTeam: TeamCode;
    awayTeam: TeamCode;
    predictedWinner: TeamCode;
    actualWinner: TeamCode | null;
    isCorrect: boolean | null;
    homeWinProb: number;
  }>;
  homeTeamAccuracy: number | null;   // 홈팀 승리 예측 적중률
  awayTeamAccuracy: number | null;   // 원정팀 승리 예측 적중률
  teamAccuracy: Record<string, { correct: number; total: number }>;
}

/**
 * plan #23 Step 5 wave 47 (cycle 1237): calibration 회고 prompt 에 domain hint
 * (구장 / 라이벌리 / 시즌 / 시간 윈도우) prepend. GameContext 미수신 agent (model
 * 회고 차원) 라 production weight metric 박제 X — domain hints only.
 *
 * `today` 인자 default = `new Date()`. 호출자 변경 없이 후방 호환.
 */
export function buildCalibrationContextBlock(
  homeTeam: TeamCode,
  awayTeam: TeamCode,
  today: Date = new Date()
): string {
  const lines: string[] = ['[도메인 컨텍스트]'];
  lines.push(`  - ${renderParkForLLM(homeTeam)}`);
  const rivalry = renderRivalryForLLM(homeTeam, awayTeam);
  if (rivalry) lines.push(`  - ${rivalry}`);
  lines.push(`  - ${renderSeasonForLLM(today)}`);
  lines.push(`  - ${renderTimeWindowsForLLM()}`);
  return lines.join('\n');
}

/**
 * [모델 성과 요약] + 관련 팀 적중률 + 최근 예측 결과 — buildUserMessage 가 실제로
 * LLM 에 넘기는 수치 전부를 담은 블록. validateCalibrationHint 의 injectionText 로도
 * 재사용 (cycle 2636) — buildCalibrationContextBlock(도메인 hint: 파크팩터/시즌/윈도우
 * 일수 등 decorative 숫자) 는 의도적으로 제외한다. buildInjectionText 의 "[도메인 컨텍스트]"
 * 제외 근거(주석 참조, validator.ts:475)와 동일 — decorative 숫자가 arithmetic
 * derivative pool 에 섞이면 우연히 실제 환각 숫자와 일치해 놓칠 위험.
 */
function buildStatsBlock(
  homeTeam: TeamCode,
  awayTeam: TeamCode,
  history: PredictionHistory
): string {
  const homeName = KBO_TEAMS[homeTeam].name;
  const awayName = KBO_TEAMS[awayTeam].name;

  let msg = `[모델 성과 요약]\n`;
  msg += `총 예측: ${history.totalPredictions}건\n`;
  msg += `적중: ${history.correctPredictions}건 (${history.totalPredictions > 0 ? Math.round(history.correctPredictions / history.totalPredictions * 100) : 0}%)\n`;

  if (history.homeTeamAccuracy != null) {
    msg += `홈팀 승 예측 적중률: ${Math.round(history.homeTeamAccuracy * 100)}%\n`;
  }
  if (history.awayTeamAccuracy != null) {
    msg += `원정팀 승 예측 적중률: ${Math.round(history.awayTeamAccuracy * 100)}%\n`;
  }

  // 관련 팀 적중률
  const homeAcc = history.teamAccuracy[homeTeam];
  const awayAcc = history.teamAccuracy[awayTeam];
  if (homeAcc && homeAcc.total >= 3) {
    msg += `\n${homeName} 관련 예측: ${homeAcc.correct}/${homeAcc.total} 적중 (${Math.round(homeAcc.correct / homeAcc.total * 100)}%)`;
  }
  if (awayAcc && awayAcc.total >= 3) {
    msg += `\n${awayName} 관련 예측: ${awayAcc.correct}/${awayAcc.total} 적중 (${Math.round(awayAcc.correct / awayAcc.total * 100)}%)`;
  }

  // 최근 5경기 결과
  if (history.recentResults.length > 0) {
    msg += '\n\n[최근 예측 결과]\n';
    for (const r of history.recentResults.slice(0, 5)) {
      const mark = r.isCorrect ? 'O' : r.isCorrect === false ? 'X' : '?';
      msg += `${mark} ${r.date} ${shortTeamName(r.awayTeam)}@${shortTeamName(r.homeTeam)} → ${shortTeamName(r.predictedWinner)} ${Math.round(r.homeWinProb * 100)}%\n`;
    }
  }

  return msg;
}

function buildUserMessage(
  homeTeam: TeamCode,
  awayTeam: TeamCode,
  history: PredictionHistory,
  today: Date = new Date()
): string {
  const homeName = KBO_TEAMS[homeTeam].name;
  const awayName = KBO_TEAMS[awayTeam].name;

  let msg = `${buildCalibrationContextBlock(homeTeam, awayTeam, today)}\n\n`;
  msg += `오늘 경기: ${awayName} @ ${homeName}\n\n`;
  msg += buildStatsBlock(homeTeam, awayTeam, history);
  msg += '\n이 데이터를 바탕으로 오늘 경기 예측에 적용할 보정 힌트를 제공하세요.';
  return msg;
}

export function parseResponse(text: string, homeTeam: TeamCode, awayTeam: TeamCode): CalibrationHint {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      recentBias: parsed.recentBias || null,
      teamSpecific: parsed.teamSpecific || null,
      modelWeakness: parsed.modelWeakness || null,
      adjustmentSuggestion: Math.max(-0.05, Math.min(0.05, Number(parsed.adjustmentSuggestion) || 0)),
    };
  } catch (e) {
    // cycle 1400 lesson P2 (judge-agent) 와 동일 family — 여기 누락돼 있던 갭 (cycle 2281 정정).
    // catch 자체가 all-null CalibrationHint 를 정상 데이터처럼 반환 → evaluateAndCaptureAgentFallback
    // (`r.data == null` 검사) 미감지. 별도 Sentry 채널로 명시 capture.
    void captureCalibrationParseFallback({
      homeTeam,
      awayTeam,
      textExcerpt: text.slice(0, 300),
      errorMessage: errMsg(e),
    });
    return {
      recentBias: null,
      teamSpecific: null,
      modelWeakness: null,
      adjustmentSuggestion: 0,
    };
  }
}

/**
 * 보정 에이전트: 과거 예측 성과 회고 → 보정 힌트 (±5%, Haiku)
 *
 * retro.ts (agent_memories 학습) 와 분리.
 * 본 에이전트는 단발 보정값 산출만 담당 — DB write X.
 *
 * Validator Layer 1 (cycle 2636): recentBias/teamSpecific/modelWeakness 는
 * /analysis/game/[id] 페이지에 그대로 노출되는 사용자 가시 텍스트인데도 team-agent /
 * judge-agent 와 달리 검증이 전혀 없던 갭 — validateCalibrationHint 로 hallucinated
 * number / banned phrase 검증 후 위반 부분만 mask (judge-agent 와 동일, 전체 reject X).
 */
export async function runCalibrationAgent(
  homeTeam: TeamCode,
  awayTeam: TeamCode,
  history: PredictionHistory
): Promise<AgentResult<CalibrationHint>> {
  // 데이터 부족하면 API 콜 없이 기본값
  if (history.totalPredictions < 5) {
    return {
      success: true,
      data: { recentBias: null, teamSpecific: null, modelWeakness: null, adjustmentSuggestion: 0 },
      error: null,
      model: 'haiku',
      tokensUsed: 0,
      durationMs: 0,
    };
  }

  const userMessage = buildUserMessage(homeTeam, awayTeam, history);
  const result = await callLLM<CalibrationHint>(
    {
      model: 'haiku',
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: LLM_MAX_TOKENS_CALIBRATION,
    },
    (text) => parseResponse(text, homeTeam, awayTeam)
  );

  if (!result.success || !result.data) {
    // callLLM 이 파싱 단계 도달 전 실패(네트워크/크레딧/4xx) — parseResponse catch 의
    // captureCalibrationParseFallback 은 여기 도달 못하고, debate.ts 의 agentsFailed 집계도
    // calibResult 를 애초 설계부터 미포함(#372) — 이 경로는 여태 완전 무신호였던 gap.
    void captureCalibrationApiFallback({
      homeTeam,
      awayTeam,
      errorMessage: result.error ?? 'unknown',
    });
    return result;
  }

  const outputText = [result.data.recentBias, result.data.teamSpecific, result.data.modelWeakness]
    .filter((s): s is string => Boolean(s))
    .join(' ');
  if (!outputText) return result;

  const mode = resolveValidationMode();
  const statsBlock = buildStatsBlock(homeTeam, awayTeam, history);
  const validation = validateCalibrationHint(outputText, statsBlock, mode);

  void notifyValidationViolations(validation, { agent: 'calibration', gameId: null, backend: result.model });

  if (validation.violations.length > 0) {
    logValidatorEvent({
      gameId: null,
      teamCode: 'CAL',
      agent: 'calibration',
      backend: result.model,
      passed: validation.ok,
      violations: validation.violations,
    }).catch((e) => console.warn('[validator_logs] unexpected error:', errMsg(e)));
  }

  if (validation.violations.length === 0) return result;

  return {
    ...result,
    data: {
      ...result.data,
      recentBias: result.data.recentBias ? maskViolatedReasoning(result.data.recentBias, validation.violations) : null,
      teamSpecific: result.data.teamSpecific ? maskViolatedReasoning(result.data.teamSpecific, validation.violations) : null,
      modelWeakness: result.data.modelWeakness ? maskViolatedReasoning(result.data.modelWeakness, validation.violations) : null,
    },
  };
}

export type { PredictionHistory };
