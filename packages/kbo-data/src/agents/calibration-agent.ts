import { KBO_TEAMS } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { callLLM } from './llm';
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

function buildUserMessage(
  homeTeam: TeamCode,
  awayTeam: TeamCode,
  history: PredictionHistory
): string {
  const homeName = KBO_TEAMS[homeTeam].name;
  const awayName = KBO_TEAMS[awayTeam].name;

  let msg = `오늘 경기: ${awayName} @ ${homeName}\n\n`;

  msg += `[모델 성과 요약]\n`;
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
      msg += `${mark} ${r.date} ${KBO_TEAMS[r.awayTeam].name.split(' ')[0]}@${KBO_TEAMS[r.homeTeam].name.split(' ')[0]} → ${KBO_TEAMS[r.predictedWinner].name.split(' ')[0]} ${Math.round(r.homeWinProb * 100)}%\n`;
    }
  }

  msg += '\n이 데이터를 바탕으로 오늘 경기 예측에 적용할 보정 힌트를 제공하세요.';
  return msg;
}

function parseResponse(text: string): CalibrationHint {
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
  } catch {
    return {
      recentBias: null,
      teamSpecific: null,
      modelWeakness: null,
      adjustmentSuggestion: 0,
    };
  }
}

/**
 * 회고 에이전트: 과거 예측 성과 → 보정 힌트
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

  return callLLM<CalibrationHint>(
    {
      model: 'haiku',
      systemPrompt: SYSTEM_PROMPT,
      userMessage: buildUserMessage(homeTeam, awayTeam, history),
      maxTokens: 500,
    },
    parseResponse
  );
}

export type { PredictionHistory };
