import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../agents/llm', () => ({
  callLLM: vi.fn(),
}));
vi.mock('../agents/postview', () => ({
  getZeroWeightRuleJudgePregame: vi.fn(() => ''),
}));
vi.mock('../agents/validator', () => ({
  validateJudgeReasoning: vi.fn(() => ({ ok: true, violations: [] })),
  maskViolatedReasoning: vi.fn((text: string) => text),
  notifyValidationViolations: vi.fn(),
  resolveValidationMode: vi.fn(() => 'lenient'),
}));
vi.mock('../agents/validator-logger', () => ({
  logValidatorEvent: vi.fn(),
}));

import { runJudgeAgent } from '../agents/judge-agent';
import { callLLM } from '../agents/llm';
import type { GameContext, JudgeVerdict, AgentResult, TeamArgument } from '../agents/types';

function makeContext(date: string): GameContext {
  return {
    game: {
      date,
      homeTeam: 'LG',
      awayTeam: 'OB',
      gameTime: '18:30',
      stadium: '잠실',
      homeSP: '임찬규',
      awaySP: '곽빈',
      status: 'scheduled',
      externalGameId: `KBOG${date.replace(/-/g, '')}LGT0`,
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

const homeArg: TeamArgument = {
  team: 'LG',
  strengths: ['FIP 우위'],
  opponentWeaknesses: ['불펜 불안'],
  keyFactor: '선발',
  confidence: 0.62,
  reasoning: 'LG 선발 우위.',
};

const awayArg: TeamArgument = {
  team: 'OB',
  strengths: ['타선'],
  opponentWeaknesses: ['수비'],
  keyFactor: '타격',
  confidence: 0.48,
  reasoning: '두산 타선.',
};

const llmResult: AgentResult<JudgeVerdict> = {
  success: true,
  data: {
    homeWinProb: 0.60,
    confidence: 0.55,
    homeArgSummary: 'LG',
    awayArgSummary: 'OB',
    calibrationApplied: null,
    reasoning: 'LG 우위.',
    predictedWinner: 'LG',
  },
  error: null,
  model: 'sonnet',
  tokensUsed: 100,
  durationMs: 10,
};

describe('runJudgeAgent — plan #23 context layer integration (cycle 1232, wave 43)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(callLLM).mockResolvedValue(llmResult);
  });

  it('context 제공 시 userMessage 에 정량 메트릭 + 도메인 hint prepend', async () => {
    await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-11'));
    const callArgs = vi.mocked(callLLM).mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    const userMessage = callArgs!.userMessage;
    expect(userMessage).toContain('[정량 메트릭 — 10팩터]');
    expect(userMessage).toContain('[도메인 컨텍스트]');
    expect(userMessage).toContain('LG');
    expect(userMessage).toContain('OB');
    // metric 값 본문 확인 (wOBA 0.340 → 34.0% X / 0.340 형식)
    expect(userMessage).toMatch(/woba.*0\.34/i);
  });

  it('context 미제공 시 context block 부재 (legacy path)', async () => {
    await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null);
    const callArgs = vi.mocked(callLLM).mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    const userMessage = callArgs!.userMessage;
    expect(userMessage).not.toContain('[정량 메트릭 — 10팩터]');
    expect(userMessage).not.toContain('[도메인 컨텍스트]');
    expect(userMessage).toContain('경기:');
  });

  it('context 제공 시 game 메타 헤더 포함', async () => {
    await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-11'));
    const userMessage = vi.mocked(callLLM).mock.calls[0]![0].userMessage;
    expect(userMessage).toContain('[경기] 2026-05-11');
    expect(userMessage).toContain('LG(홈) vs OB(원정)');
  });

  it('context 제공 시 H2H + 최근 폼 동봉', async () => {
    await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-11'));
    const userMessage = vi.mocked(callLLM).mock.calls[0]![0].userMessage;
    expect(userMessage).toContain('[상대 전적 + 최근 폼]');
    expect(userMessage).toContain('홈 7승');
    expect(userMessage).toContain('원정 5승');
  });

  it('기존 팀 주장 + 정량 모델 결과는 그대로 유지 (context 추가만, 기존 콘텐츠 손실 X)', async () => {
    await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-11'));
    const userMessage = vi.mocked(callLLM).mock.calls[0]![0].userMessage;
    expect(userMessage).toContain('에이전트 주장');
    expect(userMessage).toContain('정량 모델');
    expect(userMessage).toContain('FIP 우위');
    expect(userMessage).toContain('홈팀 승리확률: 57%');
  });
});
