import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameContext, TeamArgument, JudgeVerdict, CalibrationHint, AgentResult } from '../agents/types';
import type { PredictionHistory } from '../agents/calibration-agent';

vi.mock('../agents/team-agent', () => ({
  runTeamAgent: vi.fn(),
}));
vi.mock('../agents/judge-agent', () => ({
  runJudgeAgent: vi.fn(),
}));
vi.mock('../agents/calibration-agent', () => ({
  runCalibrationAgent: vi.fn(),
}));

import { runDebate } from '../agents/debate';
import { runTeamAgent } from '../agents/team-agent';
import { runJudgeAgent } from '../agents/judge-agent';
import { runCalibrationAgent } from '../agents/calibration-agent';

function makeContext(): GameContext {
  return {
    game: {
      date: '2026-04-15',
      homeTeam: 'LG',
      awayTeam: 'OB',
      gameTime: '18:30',
      stadium: '잠실',
      homeSP: '임찬규',
      awaySP: '곽빈',
      status: 'scheduled',
      externalGameId: 'KBOG20260415LGT0',
    },
    homeSPStats: { name: '임찬규', team: 'LG', fip: 3.2, xfip: 3.5, era: 3.1, innings: 85, war: 2.5, kPer9: 8.5 },
    awaySPStats: { name: '곽빈', team: 'OB', fip: 4.1, xfip: 4.3, era: 4.2, innings: 70, war: 1.2, kPer9: 6.8 },
    homeTeamStats: { team: 'LG', woba: 0.340, bullpenFip: 3.80, totalWar: 18.5, sfr: 2.5 },
    awayTeamStats: { team: 'OB', woba: 0.320, bullpenFip: 4.20, totalWar: 15.0, sfr: -1.0 },
    homeElo: { team: 'LG', elo: 1550, winPct: 0.58 },
    awayElo: { team: 'OB', elo: 1480, winPct: 0.48 },
    headToHead: { wins: 7, losses: 5 },
    homeRecentForm: 0.7,
    awayRecentForm: 0.4,
    parkFactor: 1.02,
  };
}

function makeHistory(): PredictionHistory {
  return {
    totalPredictions: 20,
    correctPredictions: 12,
    recentResults: [],
    homeTeamAccuracy: 0.60,
    awayTeamAccuracy: 0.55,
    teamAccuracy: {},
  };
}

function ok<T>(data: T, tokens = 100): AgentResult<T> {
  return { success: true, data, error: null, model: 'haiku', tokensUsed: tokens, durationMs: 10 };
}

function fail<T>(): AgentResult<T> {
  return { success: false, data: null, error: 'mock fail', model: 'haiku', tokensUsed: 0, durationMs: 5 };
}

const homeArg: TeamArgument = {
  team: 'LG',
  strengths: ['선발 FIP 우위', '홈 이점'],
  opponentWeaknesses: ['두산 불펜 불안'],
  keyFactor: '선발 매치업',
  confidence: 0.62,
  reasoning: 'LG 선발 임찬규 FIP 3.2가 결정적. 홈 잠실에서 최근폼 70%.',
};

const awayArg: TeamArgument = {
  team: 'OB',
  strengths: ['타선 폭발력'],
  opponentWeaknesses: ['LG 최근 수비 SFR 감소'],
  keyFactor: '타격 상대성',
  confidence: 0.48,
  reasoning: '두산 타선 wOBA 0.320. LG 선발 상대 약함.',
};

const calibZero: CalibrationHint = {
  recentBias: null,
  teamSpecific: null,
  modelWeakness: null,
  adjustmentSuggestion: 0,
};

const verdict: JudgeVerdict = {
  homeWinProb: 0.60,
  confidence: 0.70,
  homeArgSummary: 'LG 선발 FIP 우위',
  awayArgSummary: 'OB 타선 폭발력',
  calibrationApplied: null,
  reasoning: 'LG 선발이 결정적 이점. 홈 어드밴티지 반영하여 60%.',
  predictedWinner: 'LG',
};

describe('runDebate 오케스트레이션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('홈/원정/회고 병렬 + 심판 순차 호출. 성공 시 verdict 그대로 반환', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? ok(homeArg, 120) : ok(awayArg, 110)
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(ok(verdict, 250));

    const result = await runDebate(makeContext(), 0.57, makeHistory());

    expect(runTeamAgent).toHaveBeenCalledTimes(2);
    expect(runCalibrationAgent).toHaveBeenCalledTimes(1);
    expect(runJudgeAgent).toHaveBeenCalledTimes(1);

    // 심판은 팀 에이전트 결과를 인자로 받아야 함 (순차성 증거)
    const judgeCall = vi.mocked(runJudgeAgent).mock.calls[0];
    expect(judgeCall[0]).toBe('LG');       // homeTeam
    expect(judgeCall[1]).toBe('OB');       // awayTeam
    expect(judgeCall[2]).toEqual(homeArg); // homeArg
    expect(judgeCall[3]).toEqual(awayArg); // awayArg
    expect(judgeCall[4]).toBeCloseTo(0.57, 5); // quantitativeProb
    expect(judgeCall[5]).toEqual(calibZero);   // calibration

    expect(result.verdict).toEqual(verdict);
    expect(result.homeArgument).toEqual(homeArg);
    expect(result.awayArgument).toEqual(awayArg);
    expect(result.quantitativeProb).toBeCloseTo(0.57, 5);
  });

  it('totalTokens = 홈 + 원정 + 회고 + 심판 합산', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? ok(homeArg, 120) : ok(awayArg, 110)
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(ok(verdict, 250));

    const result = await runDebate(makeContext(), 0.57, makeHistory());

    expect(result.totalTokens).toBe(120 + 110 + 60 + 250);
  });

  it('홈 팀 에이전트 실패 시 fallback 논거로 심판 호출', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? fail<TeamArgument>() : ok(awayArg, 110)
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(ok(verdict, 250));

    const result = await runDebate(makeContext(), 0.62, makeHistory());

    const judgeCall = vi.mocked(runJudgeAgent).mock.calls[0];
    const fallbackHomeArg = judgeCall[2];
    expect(fallbackHomeArg.team).toBe('LG');
    expect(fallbackHomeArg.confidence).toBeCloseTo(0.62, 5); // quantitativeProb로 대체
    expect(fallbackHomeArg.reasoning).toContain('정량 모델');

    expect(result.homeArgument.team).toBe('LG');
    expect(result.homeArgument.confidence).toBeCloseTo(0.62, 5);
  });

  it('원정 팀 에이전트 실패 시 awayArg.confidence = 1 - quantitativeProb', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? ok(homeArg, 120) : fail<TeamArgument>()
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(ok(verdict, 250));

    const result = await runDebate(makeContext(), 0.62, makeHistory());

    expect(result.awayArgument.confidence).toBeCloseTo(1 - 0.62, 5);
  });

  it('회고 에이전트 실패 시 기본 CalibrationHint(adjustment=0)로 심판 호출', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? ok(homeArg, 120) : ok(awayArg, 110)
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(fail<CalibrationHint>());
    vi.mocked(runJudgeAgent).mockResolvedValue(ok(verdict, 250));

    const result = await runDebate(makeContext(), 0.57, makeHistory());

    const judgeCall = vi.mocked(runJudgeAgent).mock.calls[0];
    expect(judgeCall[5]).toEqual({
      recentBias: null,
      teamSpecific: null,
      modelWeakness: null,
      adjustmentSuggestion: 0,
    });
    expect(result.calibration.adjustmentSuggestion).toBe(0);
  });

  it('심판 실패 시 정량 모델 결과로 fallback verdict 생성 (홈 승 ≥0.5)', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? ok(homeArg, 120) : ok(awayArg, 110)
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(fail<JudgeVerdict>());

    const result = await runDebate(makeContext(), 0.62, makeHistory());

    expect(result.verdict.homeWinProb).toBeCloseTo(0.62, 5);
    expect(result.verdict.predictedWinner).toBe('LG');
    expect(result.verdict.confidence).toBe(0.3);
    expect(result.verdict.reasoning).toContain('정량 모델');
  });

  it('심판 실패 시 정량 모델 결과로 fallback verdict 생성 (홈 승 <0.5 → 원정 승리자)', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? ok(homeArg, 120) : ok(awayArg, 110)
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(fail<JudgeVerdict>());

    const result = await runDebate(makeContext(), 0.42, makeHistory());

    expect(result.verdict.predictedWinner).toBe('OB');
    expect(result.verdict.homeWinProb).toBeCloseTo(0.42, 5);
  });

  it('totalDurationMs ≥ 0 기록됨', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? ok(homeArg, 120) : ok(awayArg, 110)
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(ok(verdict, 250));

    const result = await runDebate(makeContext(), 0.57, makeHistory());
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  // --- agentsFailed / agentError 가시화 회귀 테스트 (cycle 362) ---

  it('모든 에이전트 성공 시 agentsFailed=false, agentError=null', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? ok(homeArg, 120) : ok(awayArg, 110)
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(ok(verdict, 250));

    const result = await runDebate(makeContext(), 0.57, makeHistory());

    expect(result.agentsFailed).toBe(false);
    expect(result.agentError).toBeNull();
  });

  it('심판 에이전트 실패 시 agentsFailed=true, agentError 캡처', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? ok(homeArg, 120) : ok(awayArg, 110)
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(fail<JudgeVerdict>());

    const result = await runDebate(makeContext(), 0.57, makeHistory());

    expect(result.agentsFailed).toBe(true);
    expect(result.agentError).toBe('mock fail');
  });

  it('홈 팀 에이전트 실패 시 agentsFailed=true', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? fail<TeamArgument>() : ok(awayArg, 110)
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(ok(verdict, 250));

    const result = await runDebate(makeContext(), 0.57, makeHistory());

    expect(result.agentsFailed).toBe(true);
    expect(result.agentError).toBe('mock fail');
  });

  it('원정 팀 에이전트 실패 시 agentsFailed=true', async () => {
    vi.mocked(runTeamAgent).mockImplementation(async (team) =>
      team === 'LG' ? ok(homeArg, 120) : fail<TeamArgument>()
    );
    vi.mocked(runCalibrationAgent).mockResolvedValue(ok(calibZero, 60));
    vi.mocked(runJudgeAgent).mockResolvedValue(ok(verdict, 250));

    const result = await runDebate(makeContext(), 0.57, makeHistory());

    expect(result.agentsFailed).toBe(true);
    expect(result.agentError).toBe('mock fail');
  });
});
