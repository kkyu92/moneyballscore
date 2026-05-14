/**
 * 예측 row 의 reasoning JSON 빌더.
 *
 * cycle 128 review-code 후속 silent drift fix — daily.ts 가 finalReasoning 을
 * `{ ...quantResult, quantitativeHomeWinProb: quantHomeProb, debate: {...} }`
 * 로 spread 하면, `quantResult.homeWinProb` 가 그대로 reasoning.homeWinProb 로
 * 박제. debate 가 verdict.homeWinProb 로 finalHomeProb 갱신해도 reasoning 안엔
 * 정량 원본 값만 남아 buildDailySummary (`p.reasoning?.homeWinProb`) 가 읽으면
 * 텔레그램 summary 가 debate 무시한 quant 확률 표시.
 *
 * 본 헬퍼는 finalHomeProb 를 reasoning.homeWinProb 로 명시 박제하고,
 * quantitativeHomeWinProb 에 정량 원본을 분리 박제. debate succeed 시도 fail
 * 시도 양쪽 일관.
 */

import type { PredictionResult } from '../types';

export interface DebatePayload {
  homeArgument: unknown;
  awayArgument: unknown;
  calibration: unknown;
  verdict: {
    predictedWinner: string;
    homeWinProb: number;
    confidence: number;
  };
  quantitativeProb: number;
  totalTokens?: number;
  // cycle 386 fix-incident heavy — pre_game path reasoning.debate JSONB 에
  // agentsFailed/agentError 박제 누락 (cycle 384 postview path 만 fix). mv 라벨
  // 강등 (`v1.8`) 은 작동했으나 reasoning.debate 안 직접 flag read 하는 곳
  // (e.g. /debug/model-comparison) silent drift. postview path schema parity.
  agentsFailed?: boolean;
  agentError?: string | null;
}

export interface FinalReasoning {
  predictedWinner: string;
  homeWinProb: number;
  confidence: number;
  factors: Record<string, number>;
  reasoning: string;
  quantitativeHomeWinProb: number;
  debate?: DebatePayload;
}

export function buildFinalReasoning(args: {
  quantResult: PredictionResult;
  finalHomeProb: number;
  debate?: DebatePayload;
}): FinalReasoning {
  const { quantResult, finalHomeProb, debate } = args;
  const { homeWinProb: quantHomeProb, ...rest } = quantResult;
  const out: FinalReasoning = {
    ...rest,
    homeWinProb: finalHomeProb,
    quantitativeHomeWinProb: quantHomeProb,
  };
  if (debate) out.debate = debate;
  return out;
}
