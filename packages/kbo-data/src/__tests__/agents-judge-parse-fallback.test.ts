import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../agents/postview', () => ({
  getZeroWeightRuleJudgePregame: vi.fn(() => ''),
}));
vi.mock('../agents/validator', () => ({
  validateJudgeReasoning: vi.fn(() => ({ ok: true, violations: [] })),
  maskViolatedReasoning: vi.fn((text: string) => text),
  notifyValidationViolations: vi.fn(),
  resolveValidationMode: vi.fn(() => 'lenient'),
  captureJudgeParseFallback: vi.fn(),
}));
vi.mock('../agents/validator-logger', () => ({
  logValidatorEvent: vi.fn(),
}));

import { parseResponse } from '../agents/judge-agent';
import { captureJudgeParseFallback } from '../agents/validator';
import type { GameContext } from '../agents/types';

function makeContext(): GameContext {
  return {
    game: {
      date: '2026-06-27',
      homeTeam: 'LG',
      awayTeam: 'OB',
      gameTime: '18:30',
      stadium: '잠실',
      homeSP: '임찬규',
      awaySP: '곽빈',
      status: 'scheduled',
      externalGameId: 'KBOG20260627LGT0',
    },
    homeSPStats: null,
    awaySPStats: null,
    homeTeamStats: { team: 'LG', woba: 0.34, bullpenFip: 3.8, totalWar: 18.5, sfr: 2.5 },
    awayTeamStats: { team: 'OB', woba: 0.32, bullpenFip: 4.2, totalWar: 15.0, sfr: -1.0 },
    homeElo: { team: 'LG', elo: 1550, winPct: 0.58 },
    awayElo: { team: 'OB', elo: 1480, winPct: 0.48 },
    headToHead: { wins: 7, losses: 5 },
    homeRecentForm: 0.7,
    awayRecentForm: 0.4,
    parkFactor: 1.02,
  };
}

describe('judge parseResponse — silent fallback Sentry capture (cycle 1402)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('JSON 없는 text — fallback 객체 반환 + captureJudgeParseFallback 호출', () => {
    const verdict = parseResponse('LLM 응답 텍스트 그대로', 'LG', 'OB', makeContext());

    expect(verdict.confidence).toBe(0.3);
    expect(verdict.homeWinProb).toBe(0.5);
    expect(verdict.predictedWinner).toBe('LG');

    expect(captureJudgeParseFallback).toHaveBeenCalledTimes(1);
    const call = vi.mocked(captureJudgeParseFallback).mock.calls[0][0];
    expect(call.homeTeam).toBe('LG');
    expect(call.awayTeam).toBe('OB');
    expect(call.gameId).toBe('KBOG20260627LGT0');
    expect(call.textExcerpt).toContain('LLM 응답');
    expect(call.errorMessage).toContain('No JSON');
  });

  it('JSON 깨진 형식 — fallback + capture 호출', () => {
    parseResponse('{"homeWinProb": 0.6', 'LG', 'OB', makeContext());
    expect(captureJudgeParseFallback).toHaveBeenCalledTimes(1);
  });

  it('정상 JSON — capture 미호출', () => {
    const verdict = parseResponse(
      '{"homeWinProb": 0.62, "confidence": 0.7, "homeArgSummary": "x", "awayArgSummary": "y", "reasoning": "z"}',
      'LG',
      'OB',
      makeContext()
    );
    expect(verdict.confidence).toBeCloseTo(0.7, 2);
    expect(captureJudgeParseFallback).not.toHaveBeenCalled();
  });

  it('context 없음 — gameId null 로 capture', () => {
    parseResponse('not json', 'LG', 'OB');
    expect(captureJudgeParseFallback).toHaveBeenCalledTimes(1);
    expect(vi.mocked(captureJudgeParseFallback).mock.calls[0][0].gameId).toBeNull();
  });
});
