import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../agents/validator', () => ({
  validateTeamArgument: vi.fn(() => ({ ok: true, violations: [] })),
  resolveValidationMode: vi.fn(() => 'lenient'),
  captureTeamParseFallback: vi.fn(),
}));
vi.mock('../agents/validator-logger', () => ({
  logValidatorEvent: vi.fn(),
}));

import { parseResponse } from '../agents/team-agent';
import { captureTeamParseFallback } from '../agents/validator';
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

describe('team-agent parseResponse — silent fallback Sentry capture (cycle 2885)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('JSON 없는 text — fallback 객체 반환 + captureTeamParseFallback 호출', () => {
    const arg = parseResponse('LLM 응답 텍스트 그대로', 'LG', makeContext());

    expect(arg.strengths).toEqual(['데이터 분석 중']);
    expect(arg.keyFactor).toBe('종합 전력');

    expect(captureTeamParseFallback).toHaveBeenCalledTimes(1);
    const call = vi.mocked(captureTeamParseFallback).mock.calls[0][0];
    expect(call.team).toBe('LG');
    expect(call.gameId).toBe('KBOG20260627LGT0');
    expect(call.textExcerpt).toContain('LLM 응답');
    expect(call.errorMessage).toContain('No JSON');
  });

  it('JSON 깨진 형식 — fallback + capture 호출', () => {
    parseResponse('{"strengths": [', 'OB', makeContext());
    expect(captureTeamParseFallback).toHaveBeenCalledTimes(1);
  });

  it('정상 JSON — capture 미호출', () => {
    const arg = parseResponse(
      '{"strengths": ["a"], "opponentWeaknesses": [], "keyFactor": "x", "confidence": 0.6, "reasoning": "y"}',
      'LG',
      makeContext()
    );
    expect(arg.keyFactor).toBe('x');
    expect(captureTeamParseFallback).not.toHaveBeenCalled();
  });

  it('context 없음 — gameId null 로 capture', () => {
    parseResponse('not json', 'LG');
    expect(captureTeamParseFallback).toHaveBeenCalledTimes(1);
    expect(vi.mocked(captureTeamParseFallback).mock.calls[0][0].gameId).toBeNull();
  });
});
