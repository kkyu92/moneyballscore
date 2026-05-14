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

  // cycle 386 fix-incident heavy — pre_game path reasoning.debate JSONB 에
  // agentsFailed/agentError 박제. cycle 384 postview path schema parity 대응.
  // mv 라벨 강등 (cycle 384 fix) 은 작동했으나 reasoning.debate 직접 read 하는
  // 곳 silent drift. ANTHROPIC credit 소진 fallback 5/14 5건 evidence (W22).
  it('cycle 386 — debate.agentsFailed/agentError 가 reasoning.debate 에 박제 보존', () => {
    const fallbackDebate: DebatePayload = {
      ...debate,
      agentsFailed: true,
      agentError: 'ANTHROPIC credit exhausted',
      totalTokens: 0,
    };
    const out = buildFinalReasoning({
      quantResult: baseQuant,
      finalHomeProb: baseQuant.homeWinProb,
      debate: fallbackDebate,
    });
    expect(out.debate?.agentsFailed).toBe(true);
    expect(out.debate?.agentError).toBe('ANTHROPIC credit exhausted');
    expect(out.debate?.totalTokens).toBe(0);
  });

  it('cycle 386 — debate succeed 시 agentsFailed=false / agentError=null 박제 보존', () => {
    const successDebate: DebatePayload = {
      ...debate,
      agentsFailed: false,
      agentError: null,
    };
    const out = buildFinalReasoning({
      quantResult: baseQuant,
      finalHomeProb: debate.verdict.homeWinProb,
      debate: successDebate,
    });
    expect(out.debate?.agentsFailed).toBe(false);
    expect(out.debate?.agentError).toBeNull();
  });

  it('cycle 386 — agentsFailed/agentError 미설정 시 키 부재 (옵션 필드 보존)', () => {
    const out = buildFinalReasoning({
      quantResult: baseQuant,
      finalHomeProb: debate.verdict.homeWinProb,
      debate,
    });
    expect(out.debate?.agentsFailed).toBeUndefined();
    expect(out.debate?.agentError).toBeUndefined();
  });
});
