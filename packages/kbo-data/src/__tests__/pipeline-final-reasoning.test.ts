import { describe, expect, it } from 'vitest';
import {
  buildFinalReasoning,
  type DebatePayload,
} from '../pipeline/final-reasoning';
import type { PredictionResult } from '../types';

const baseQuant: PredictionResult = {
  predictedWinner: 'LG',
  homeWinProb: 0.62,
  confidence: 0.24,
  factors: { sp_fip: 0.55, lineup_woba: 0.58, elo: 0.6 },
  reasoning: 'quant fallback narrative',
};

const debate: DebatePayload = {
  homeArgument: { claim: 'home strong' },
  awayArgument: { claim: 'away resilient' },
  calibration: { delta: 0.02 },
  verdict: { predictedWinner: 'LG', homeWinProb: 0.71, confidence: 0.42 },
  quantitativeProb: 0.62,
  totalTokens: 1234,
};

describe('buildFinalReasoning', () => {
  it('정량 only mode — finalHomeProb = quant.homeWinProb 시 reasoning 둘 다 quant 동일', () => {
    const reasoning = buildFinalReasoning({
      quantResult: baseQuant,
      finalHomeProb: baseQuant.homeWinProb,
    });
    expect(reasoning.homeWinProb).toBe(0.62);
    expect(reasoning.quantitativeHomeWinProb).toBe(0.62);
    expect(reasoning.debate).toBeUndefined();
  });

  // cycle 128 silent drift target — debate succeed 시 reasoning.homeWinProb 가
  // verdict 값이어야 buildDailySummary 가 읽어 텔레그램 summary 에 final 확률
  // 표시. 기존 spread 패턴은 quant 원본을 박제해 mismatch.
  it('debate succeed — reasoning.homeWinProb = verdict, quantitativeHomeWinProb = 정량 원본', () => {
    const reasoning = buildFinalReasoning({
      quantResult: baseQuant,
      finalHomeProb: debate.verdict.homeWinProb,
      debate,
    });
    expect(reasoning.homeWinProb).toBe(0.71);
    expect(reasoning.quantitativeHomeWinProb).toBe(0.62);
    expect(reasoning.homeWinProb).not.toBe(reasoning.quantitativeHomeWinProb);
  });

  it('debate payload 동봉 시 reasoning.debate 그대로 박제', () => {
    const reasoning = buildFinalReasoning({
      quantResult: baseQuant,
      finalHomeProb: debate.verdict.homeWinProb,
      debate,
    });
    expect(reasoning.debate).toBe(debate);
    expect(reasoning.debate?.verdict.homeWinProb).toBe(0.71);
    expect(reasoning.debate?.totalTokens).toBe(1234);
  });

  it('debate 인자 부재 시 reasoning.debate 키 부재 (undefined)', () => {
    const reasoning = buildFinalReasoning({
      quantResult: baseQuant,
      finalHomeProb: baseQuant.homeWinProb,
    });
    expect('debate' in reasoning).toBe(false);
  });

  it('quantResult 의 predictedWinner / confidence / factors / reasoning 그대로 보존', () => {
    const out = buildFinalReasoning({
      quantResult: baseQuant,
      finalHomeProb: 0.71,
      debate,
    });
    expect(out.predictedWinner).toBe('LG');
    expect(out.confidence).toBe(0.24);
    expect(out.factors).toEqual({
      sp_fip: 0.55,
      lineup_woba: 0.58,
      elo: 0.6,
    });
    expect(out.reasoning).toBe('quant fallback narrative');
  });

  it('quantitativeHomeWinProb 가 항상 quant 원본 — finalHomeProb 가 quant 와 다른 값이어도', () => {
    const out = buildFinalReasoning({
      quantResult: baseQuant,
      finalHomeProb: 0.85,
    });
    expect(out.quantitativeHomeWinProb).toBe(0.62);
    expect(out.homeWinProb).toBe(0.85);
  });
});
