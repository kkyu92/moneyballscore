/**
 * 예측 row 의 reasoning JSON 빌더.
 *
 * finalHomeProb 를 reasoning.homeWinProb 로 명시 박제하고,
 * quantitativeHomeWinProb 에 정량 원본을 분리 박제. debate succeed/fail 양쪽 일관.
 *
 * ⚠️ root vs debate.verdict 의도된 비대칭 (reasoning_jsonb root vs verdict 모순 ≠ silent drift):
 *
 *   - root `homeWinProb`         = verdict (buildDailySummary 읽음)
 *   - root `predictedWinner`     = quant 그대로 (의도)
 *   - root `confidence`          = quant 그대로 (의도)
 *   - root `reasoning` (text)    = quant 그대로 (의도, quant fallback narrative)
 *   - root `factors`             = quant 그대로 (의도, factor breakdown)
 *   - root `debate.verdict.*`    = verdict source of truth
 *   - predictions row column     = verdict (daily.ts result spread)
 *
 * UI 는 row column (confidence / predicted_winner) + root.homeWinProb 만 읽음.
 * 다른 root 필드는 quant fallback 시각화 source 로 의도 보존. test
 * pipeline-final-reasoning.test.ts 가 본 설계 명시 박제.
 *
 * "root 모순 = silent drift" 빠른 결론 차단.
 * 진짜 silent drift = UI 가 root.predictedWinner / confidence / reasoning 직접
 * 읽고 표시하는 코드 새로 추가될 때만 (현재 0건).
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
  // pre_game path reasoning.debate JSONB 에 agentsFailed/agentError 박제.
  // postview path schema parity — /debug/model-comparison 등 flag 직접 read.
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
