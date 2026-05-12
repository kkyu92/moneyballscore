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

function llmOk(confidence: number, calibrationApplied: string | null = null): AgentResult<JudgeVerdict> {
  return {
    success: true,
    data: {
      homeWinProb: 0.60,
      confidence,
      homeArgSummary: 'LG 선발',
      awayArgSummary: 'OB 타선',
      calibrationApplied,
      reasoning: 'LG가 유리하다.',
      predictedWinner: 'LG',
    },
    error: null,
    model: 'sonnet',
    tokensUsed: 100,
    durationMs: 10,
  };
}

describe('runJudgeAgent — Sunday confidence cap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('일요일: confidence 0.70 → 0.55 캡', async () => {
    vi.mocked(callLLM).mockResolvedValue(llmOk(0.70));
    // 2026-05-10 = 일요일
    const result = await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-10'));
    expect(result.data!.confidence).toBe(0.55);
    expect(result.data!.calibrationApplied).toBe('일요일 상한 0.55');
  });

  it('일요일: confidence 0.55 이하면 캡 미적용', async () => {
    vi.mocked(callLLM).mockResolvedValue(llmOk(0.50));
    const result = await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-10'));
    expect(result.data!.confidence).toBe(0.50);
    expect(result.data!.calibrationApplied).toBeNull();
  });

  it('일요일: confidence 정확히 0.55이면 캡 미적용', async () => {
    vi.mocked(callLLM).mockResolvedValue(llmOk(0.55));
    const result = await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-10'));
    expect(result.data!.confidence).toBe(0.55);
    expect(result.data!.calibrationApplied).toBeNull();
  });

  it('일요일: 기존 calibrationApplied 있으면 세미콜론 append', async () => {
    vi.mocked(callLLM).mockResolvedValue(llmOk(0.70, '최근 홈팀 편향'));
    const result = await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-10'));
    expect(result.data!.calibrationApplied).toBe('최근 홈팀 편향; 일요일 상한 0.55');
  });

  it('월요일: confidence 0.70 → 변경 없음', async () => {
    vi.mocked(callLLM).mockResolvedValue(llmOk(0.70));
    // 2026-05-11 = 월요일
    const result = await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-11'));
    expect(result.data!.confidence).toBe(0.70);
    expect(result.data!.calibrationApplied).toBeNull();
  });

  it('토요일: confidence 0.70 → 변경 없음', async () => {
    vi.mocked(callLLM).mockResolvedValue(llmOk(0.70));
    // 2026-05-09 = 토요일
    const result = await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-09'));
    expect(result.data!.confidence).toBe(0.70);
  });

  it('context 없음: Sunday cap 미적용 (legacy path)', async () => {
    vi.mocked(callLLM).mockResolvedValue(llmOk(0.80));
    const result = await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null);
    expect(result.data!.confidence).toBe(0.80);
  });

  it('LLM 실패: Sunday cap 미적용 (result 그대로 반환)', async () => {
    vi.mocked(callLLM).mockResolvedValue({
      success: false, data: null, error: 'network error', model: 'sonnet', tokensUsed: 0, durationMs: 5,
    });
    const result = await runJudgeAgent('LG', 'OB', homeArg, awayArg, 0.57, null, makeContext('2026-05-10'));
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });
});
