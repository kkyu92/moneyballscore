import type { TeamCode } from '@moneyball/shared';
import { runTeamAgent } from './team-agent';
import { runJudgeAgent } from './judge-agent';
import { runCalibrationAgent, type PredictionHistory } from './calibration-agent';
import { captureAgentFallback } from './validator';
import type { GameContext, DebateResult, TeamArgument, CalibrationHint } from './types';

/**
 * 경기별 에이전트 토론 실행
 *
 * Step 1: 홈/원정 팀 에이전트 + 회고 에이전트 3개 병렬 실행 (Promise.all)
 *   - runTeamAgent(home) / runTeamAgent(away) / runCalibrationAgent
 * Step 2: 심판 에이전트 순차 실행 (Step 1 결과 필요)
 *   - runJudgeAgent(homeArg, awayArg, calibration, ...)
 *
 * cycle 176 — docstring 1/2/3 단계 implies 순차 → 실제 1+2 병렬 + 3 순차 mismatch 정정.
 * silent code drift family detection (cycle 60 predictor.ts 주석 정정 동일 패턴).
 */
export async function runDebate(
  context: GameContext,
  quantitativeProb: number,
  history: PredictionHistory
): Promise<DebateResult> {
  const { homeTeam, awayTeam } = context.game;
  let totalTokens = 0;
  const startTime = Date.now();

  // Step 1: 팀 에이전트 + 회고 에이전트 병렬 실행
  const [homeResult, awayResult, calibResult] = await Promise.all([
    runTeamAgent(homeTeam, context),
    runTeamAgent(awayTeam, context),
    runCalibrationAgent(homeTeam, awayTeam, history),
  ]);

  totalTokens += homeResult.tokensUsed + awayResult.tokensUsed + calibResult.tokensUsed;

  // fallback: 에이전트 실패 시 기본 논거
  const homeArg: TeamArgument = homeResult.data || {
    team: homeTeam,
    strengths: ['데이터 기반 분석'],
    opponentWeaknesses: [],
    keyFactor: '종합 전력',
    confidence: quantitativeProb,
    reasoning: '정량 모델 기반 분석',
  };

  const awayArg: TeamArgument = awayResult.data || {
    team: awayTeam,
    strengths: ['데이터 기반 분석'],
    opponentWeaknesses: [],
    keyFactor: '종합 전력',
    confidence: 1 - quantitativeProb,
    reasoning: '정량 모델 기반 분석',
  };

  const calibration: CalibrationHint = calibResult.data || {
    recentBias: null,
    teamSpecific: null,
    modelWeakness: null,
    adjustmentSuggestion: 0,
  };

  // Step 2: 심판 에이전트 (순차 실행, 앞선 결과 필요)
  // cycle 27 — context 전달로 reasoning 검증 + 위반 mask + Sentry tag 활성화
  const judgeResult = await runJudgeAgent(
    homeTeam,
    awayTeam,
    homeArg,
    awayArg,
    quantitativeProb,
    calibration,
    context
  );

  totalTokens += judgeResult.tokensUsed;

  // fallback: 심판 실패 시 정량 모델 결과 사용
  const verdict = judgeResult.data || {
    homeWinProb: quantitativeProb,
    confidence: 0.3,
    homeArgSummary: homeArg.reasoning,
    awayArgSummary: awayArg.reasoning,
    calibrationApplied: null,
    reasoning: '에이전트 토론 불가. 정량 모델 v1.8 결과 사용.',
    predictedWinner: quantitativeProb >= 0.5 ? homeTeam : awayTeam,
  };

  const agentsFailed = !homeResult.data || !awayResult.data || !judgeResult.data;
  const agentError = (!homeResult.success ? homeResult.error : null)
    ?? (!awayResult.success ? awayResult.error : null)
    ?? (!judgeResult.success ? judgeResult.error : null)
    ?? null;

  if (agentsFailed) {
    console.error(
      `[Debate] ${awayTeam}@${homeTeam}: 에이전트 fallback — ${agentError ?? 'unknown'}`
    );
    // cycle 384 — Cloudflare Workers cron 환경에서 console.error 가 Sentry alert
    // 못 잡음 (드리프트 사례 6 family). 직접 captureException 으로 silent 차단.
    void captureAgentFallback({
      path: 'pre_game',
      homeTeam,
      awayTeam,
      gameId: context.game.externalGameId ?? null,
      agentError,
    });
  }

  console.log(
    `[Debate] ${awayTeam}@${homeTeam}: ` +
    `홈 ${Math.round(homeArg.confidence * 100)}% vs 원정 ${Math.round(awayArg.confidence * 100)}% → ` +
    `심판 ${verdict.predictedWinner} ${Math.round(verdict.homeWinProb * 100)}% ` +
    `(정량 ${Math.round(quantitativeProb * 100)}%) [${totalTokens} tokens]`
  );

  return {
    game: context.game,
    homeArgument: homeArg,
    awayArgument: awayArg,
    calibration,
    verdict,
    quantitativeProb,
    totalTokens,
    totalDurationMs: Date.now() - startTime,
    agentsFailed,
    agentError,
  };
}
