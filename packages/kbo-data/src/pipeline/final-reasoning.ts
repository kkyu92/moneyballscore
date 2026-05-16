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
 *
 * ⚠️ cycle 503 review-code heavy — root vs debate.verdict 의도된 비대칭 명시
 * (cycle 502 lesson Finding 3 carry-over: "reasoning_jsonb root vs verdict 모순"
 * = silent drift X = 의도 설계):
 *
 *   - root `homeWinProb`         = verdict (cycle 128 fix, buildDailySummary 읽음)
 *   - root `predictedWinner`     = quant 그대로 (의도)
 *   - root `confidence`          = quant 그대로 (의도)
 *   - root `reasoning` (text)    = quant 그대로 (의도, quant fallback narrative)
 *   - root `factors`             = quant 그대로 (의도, factor breakdown)
 *   - root `debate.verdict.*`    = verdict source of truth
 *   - predictions row column     = verdict (daily.ts line 644-647 result spread)
 *
 * UI 는 row column (confidence / predicted_winner) + root.homeWinProb 만 읽음.
 * 다른 root 필드는 quant fallback 시각화 source 로 의도 보존. test
 * pipeline-final-reasoning.test.ts line 69-83 가 본 설계 명시 박제.
 *
 * 향후 review-code cycle 에서 "root 모순 = silent drift" 빠른 결론 차단.
 * 진짜 silent drift = UI 가 root.predictedWinner / confidence / reasoning 직접
 * 읽고 표시하는 코드 새로 추가될 때만 (현재 0건, cycle 503 grep 확인).
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
