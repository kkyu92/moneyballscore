import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canonicalizeFactorKey,
  deriveFactorErrorsFallback,
  getZeroWeightFactorPromptList,
  getZeroWeightRuleJudgePostview,
  getZeroWeightRuleJudgePregame,
  getZeroWeightRuleTeamPostview,
  isWeightedFactor,
  JUDGE_POSTVIEW_SYSTEM,
  parseJudgePostview,
  TEAM_POSTVIEW_SYSTEM,
  runPostview,
  type ActualResult,
  type OriginalPrediction,
} from '../agents/postview';
import { SYSTEM_PROMPT as JUDGE_PREGAME_SYSTEM } from '../agents/judge-agent';
import { callLLM } from '../agents/llm';
import type { GameContext, AgentResult } from '../agents/types';

vi.mock('../agents/llm', () => ({
  callLLM: vi.fn(),
}));

// cycle 131 — production factor 키 (predictor.ts 가 박제) 는 home_/away_ prefix 없는
// normalized single key (sp_fip / bullpen_fip / head_to_head 등). prefix 있는 LLM 출력은
// canonicalize 안전망으로 strip — downstream factor-bias-bootstrap-ci.ts grouping 보장.
describe('canonicalizeFactorKey (cycle 131)', () => {
  it('home_/away_ prefix strip — production no-prefix shape 로 정규화', () => {
    expect(canonicalizeFactorKey('home_bullpen_fip')).toBe('bullpen_fip');
    expect(canonicalizeFactorKey('away_recent_form')).toBe('recent_form');
    expect(canonicalizeFactorKey('home_sp_fip')).toBe('sp_fip');
  });

  it('prefix 없는 production key 는 그대로 (idempotent)', () => {
    expect(canonicalizeFactorKey('sp_fip')).toBe('sp_fip');
    expect(canonicalizeFactorKey('head_to_head')).toBe('head_to_head');
    expect(canonicalizeFactorKey('park_factor')).toBe('park_factor');
  });

  it('빈 문자열 / 알려지지 않은 키 — strip 만 적용 (검증은 isWeightedFactor 책임)', () => {
    expect(canonicalizeFactorKey('')).toBe('');
    expect(canonicalizeFactorKey('home_unknown')).toBe('unknown');
  });
});

describe('isWeightedFactor', () => {
  it('v1.8: 모든 active factor (10종, production no-prefix shape 우선) 통과', () => {
    expect(isWeightedFactor('sp_fip')).toBe(true);
    expect(isWeightedFactor('lineup_woba')).toBe(true);
    expect(isWeightedFactor('bullpen_fip')).toBe(true);
    expect(isWeightedFactor('recent_form')).toBe(true);
    expect(isWeightedFactor('war')).toBe(true);
    expect(isWeightedFactor('sp_xfip')).toBe(true);
    expect(isWeightedFactor('elo')).toBe(true);
    expect(isWeightedFactor('head_to_head')).toBe(true);
    expect(isWeightedFactor('park_factor')).toBe(true);
    expect(isWeightedFactor('sfr')).toBe(true);
  });

  it('cycle 131 — LLM 이 잘못 박제한 home_/away_ prefix key 도 canonicalize 후 통과 (방어선)', () => {
    expect(isWeightedFactor('home_bullpen_fip')).toBe(true);
    expect(isWeightedFactor('away_recent_form')).toBe(true);
    expect(isWeightedFactor('home_sp_xfip')).toBe(true);
  });

  it('알려지지 않은 factor 차단 (helper 메커니즘 자체 — 가중치 0 또는 미정의 시 차단)', () => {
    expect(isWeightedFactor('unknown')).toBe(false);
    expect(isWeightedFactor('')).toBe(false);
  });
});

// cycle 131 — production factor shape (predictor.ts 박제 형식, no prefix) 으로 정정.
// 직전 테스트 (cycle 130 이전) 가 home_sp_fip / home_bullpen_fip prefix 사용 = false confidence.
// 실제 daily.ts INSERT 시 factors = {sp_fip: 0.4, bullpen_fip: 0.3} no-prefix 박제 → 본 테스트가
// production-format mismatch 때문에 실제 fallback 동작 검증 안 되던 silent drift.
describe('deriveFactorErrorsFallback', () => {
  it('홈승인데 가중치 factor 가 away 쪽 편향 → 그 factor 지목 (v1.8: park_factor 도 가중치 > 0)', () => {
    const factors = {
      sp_fip: 0.4, // 원정 유리 편향, 홈승 → wrong (weighted)
      lineup_woba: 0.6, // 홈 유리, 홈승 → correct
      park_factor: 0.35, // 원정 유리 편향, 홈승 → wrong (v1.5 회귀 후 가중치 4% > 0 → 후보)
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toHaveLength(2);
    const factorNames = errors.map((e) => e.factor);
    expect(factorNames).toContain('sp_fip');
    expect(factorNames).toContain('park_factor');
  });

  it('원정승인데 factor가 home 쪽 편향 → 그 factor 지목', () => {
    const factors = {
      sp_fip: 0.7, // 홈 편향, 원정승 → wrong
      bullpen_fip: 0.5, // 중립
      recent_form: 0.55, // 홈 편향, 원정승 → wrong (작음)
    };
    const errors = deriveFactorErrorsFallback(factors, false);
    expect(errors).toHaveLength(2);
    expect(errors[0].factor).toBe('sp_fip');
    expect(errors[0].predictedBias).toBeCloseTo(0.2, 2);
  });

  it('모든 factor가 결과와 일치 방향 → 빈 배열', () => {
    const factors = {
      sp_fip: 0.7,
      lineup_woba: 0.65,
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toEqual([]);
  });

  it('알려지지 않은 factor 만 들어오면 빈 배열 (helper 메커니즘: 미정의 차단)', () => {
    const factors = {
      unknown_a: 0.2,
      unknown_b: 0.7,
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toEqual([]);
  });

  it('상위 3개까지만 반환 (가중치 factor 만)', () => {
    const factors = {
      sp_fip: 0.2,
      sp_xfip: 0.25,
      bullpen_fip: 0.3,
      recent_form: 0.35,
      war: 0.4,
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toHaveLength(3);
    expect(errors.map((e) => e.factor)).toEqual([
      'sp_fip',
      'sp_xfip',
      'bullpen_fip',
    ]);
  });

  it('diagnosis에 편향 수치 포함', () => {
    const factors = { sp_fip: 0.3 };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors[0].diagnosis).toContain('-0.20');
    expect(errors[0].diagnosis).toContain('반대 방향');
  });

  // cycle 177 — parser (parseJudgePostview line 311) canonicalize 통일이지만 fallback 만 raw key 박제.
  // factor-bias-bootstrap-ci.ts FACTORS_OF_INTEREST = ['sfr', 'head_to_head'] no-prefix grouping →
  // factors 가 prefixed key (home_bullpen_fip 등) 받으면 fallback 출력 silent skip.
  // production 은 predictor.ts no-prefix 박제라 trigger 0건이지만 cycle 131 동일 패턴 defensive consistency.
  it('cycle 177 — factors 안 home_/away_ prefix 키 들어와도 canonicalize 후 박제 (parser/parseJudgePostview 동치)', () => {
    const factors = {
      home_sp_fip: 0.4, // 원정 유리, 홈승 → wrong + canonicalize 'sp_fip'
      away_recent_form: 0.65, // 홈 유리, 홈승 → correct (이긴쪽이라 fallback 아님)
      home_bullpen_fip: 0.3, // 원정 유리, 홈승 → wrong + canonicalize 'bullpen_fip'
    };
    const errors = deriveFactorErrorsFallback(factors, true);
    expect(errors).toHaveLength(2);
    const factorNames = errors.map((e) => e.factor);
    expect(factorNames).toContain('sp_fip');
    expect(factorNames).toContain('bullpen_fip');
    // prefix leak 차단 (downstream FACTORS_OF_INTEREST grouping 보장)
    for (const name of factorNames) {
      expect(name).not.toMatch(/^(home_|away_)/);
    }
  });
});

// cycle 131 — parseJudgePostview 가 LLM 출력 canonicalize + abs(bias) 내림차순 강제 정렬.
// 직전 코드는 LLM 이 prefix 박제하면 그대로 박제 + sort 안 하고 slice(0, 3) 만 → silent drift.
describe('cycle 131 — parseJudgePostview canonicalize + sort 방어선', () => {
  it('LLM 이 home_/away_ prefix 박제 시 strip 후 production-format 으로 박제', () => {
    const text = JSON.stringify({
      factorErrors: [
        { factor: 'home_bullpen_fip', predictedBias: 0.08, diagnosis: 'home prefix' },
        { factor: 'away_recent_form', predictedBias: -0.05, diagnosis: 'away prefix' },
      ],
      reasoning: '테스트',
    });
    const parsed = parseJudgePostview(text);
    expect(parsed.factorErrors).toHaveLength(2);
    expect(parsed.factorErrors[0].factor).toBe('bullpen_fip');
    expect(parsed.factorErrors[1].factor).toBe('recent_form');
  });

  it('LLM 이 unsorted 박제해도 abs(bias) 내림차순 강제 정렬', () => {
    const text = JSON.stringify({
      factorErrors: [
        { factor: 'recent_form', predictedBias: -0.03, diagnosis: 'small' },
        { factor: 'bullpen_fip', predictedBias: 0.08, diagnosis: 'large' },
        { factor: 'sp_fip', predictedBias: -0.05, diagnosis: 'mid' },
      ],
      reasoning: 'test',
    });
    const parsed = parseJudgePostview(text);
    expect(parsed.factorErrors.map((fe) => fe.factor)).toEqual([
      'bullpen_fip',
      'sp_fip',
      'recent_form',
    ]);
  });

  it('상위 3 cap (LLM 이 5개 박제해도)', () => {
    const text = JSON.stringify({
      factorErrors: [
        { factor: 'sp_fip', predictedBias: 0.10, diagnosis: '1' },
        { factor: 'sp_xfip', predictedBias: 0.08, diagnosis: '2' },
        { factor: 'bullpen_fip', predictedBias: 0.06, diagnosis: '3' },
        { factor: 'recent_form', predictedBias: 0.04, diagnosis: '4' },
        { factor: 'war', predictedBias: 0.02, diagnosis: '5' },
      ],
      reasoning: 'test',
    });
    const parsed = parseJudgePostview(text);
    expect(parsed.factorErrors).toHaveLength(3);
  });

  it('알려지지 않은 factor 는 filter (사후 정규화 + canonicalize 후 검증)', () => {
    const text = JSON.stringify({
      factorErrors: [
        { factor: 'home_bullpen_fip', predictedBias: 0.08, diagnosis: 'valid prefix' },
        { factor: 'home_phantom_factor', predictedBias: 0.10, diagnosis: 'invalid prefix' },
        { factor: 'recent_form', predictedBias: -0.05, diagnosis: 'valid no-prefix' },
      ],
      reasoning: 'test',
    });
    const parsed = parseJudgePostview(text);
    expect(parsed.factorErrors).toHaveLength(2);
    expect(parsed.factorErrors.map((fe) => fe.factor).sort()).toEqual(['bullpen_fip', 'recent_form']);
  });

  it('JSON 파싱 실패 — 빈 factorErrors + raw text 를 reasoning 으로 fallback', () => {
    const parsed = parseJudgePostview('not json at all');
    expect(parsed.factorErrors).toEqual([]);
    expect(parsed.reasoning).toContain('not json');
  });
});

// cycle 131 — JUDGE_POSTVIEW_SYSTEM 예시 schema mismatch silent drift 차단.
// 직전 prompt 예시가 home_bullpen_fip / away_recent_form prefix 박제 → LLM 이 따라 prefix
// 박제하면 factor-bias-bootstrap-ci.ts 의 ['sfr', 'head_to_head'] no-prefix grouping 안 잡혀
// silent skip. 본 테스트는 prompt 가 production-format key 만 박제하도록 보장.
describe('cycle 131 — JUDGE_POSTVIEW_SYSTEM prompt 예시 production-format key', () => {
  it('예시 JSON 안 home_/away_ prefix 박제 X (production no-prefix shape)', () => {
    expect(JUDGE_POSTVIEW_SYSTEM).not.toContain('"factor": "home_');
    expect(JUDGE_POSTVIEW_SYSTEM).not.toContain('"factor": "away_');
  });

  it('예시 JSON 안 production-format key 1+ (bullpen_fip / recent_form / sp_fip 등) 박제', () => {
    expect(JUDGE_POSTVIEW_SYSTEM).toMatch(/"factor": "(sp_fip|sp_xfip|bullpen_fip|recent_form|lineup_woba|war|elo|head_to_head|park_factor|sfr)"/);
  });

  it('규칙 줄에 "home_/away_ prefix 금지" 명시 (LLM hint)', () => {
    expect(JUDGE_POSTVIEW_SYSTEM).toContain('home_/away_ prefix 금지');
  });
});

// cycle 15 — prompt-level constraint dynamic injection 검증.
// cycle 12 의 사후 filter (factorErrors 배열) 는 LLM reasoning 본문에서 0% factor 거론을 막지 못함.
// cycle 15 가 3 prompt 에 `getZeroWeightFactorPromptList()` 동적 주입 → DEFAULT_WEIGHTS 변경 시 자동 동기화.
// cycle 17 v1.5 회귀 후엔 모든 factor 가중치 > 0 → helper 빈 문자열 반환.
// cycle 126 silent drift 가드 — 빈 문자열 반환 시 prompt template 안 `(${...})` 가 빈 괄호 `()` 로
// 출력되어 LLM 추론 noise. 본 fix 에서 conditional rule helper 추가 → 빈 list 시 규칙 줄 자체 skip.
describe('getZeroWeightFactorPromptList (cycle 15 helper)', () => {
  it('v1.8 (= v1.5): 모든 factor 가중치 > 0 — 빈 문자열 반환', () => {
    const list = getZeroWeightFactorPromptList();
    expect(list).toBe('');
  });

  it('어떤 active factor (sp_fip / lineup_woba / elo) 도 미포함', () => {
    const list = getZeroWeightFactorPromptList();
    expect(list).not.toContain('sp_fip');
    expect(list).not.toContain('lineup_woba');
    expect(list).not.toContain('elo');
  });

  it('cycle 126: weights 인자 주입 시 weight=0 factor 만 list', () => {
    const list = getZeroWeightFactorPromptList({
      sp_fip: 1.0,
      head_to_head: 0,
      park_factor: 0,
      sfr: 0.5,
    });
    expect(list).toContain('head_to_head');
    expect(list).toContain('park_factor');
    expect(list).not.toContain('sp_fip');
    expect(list).not.toContain('sfr');
  });
});

// cycle 126 — DEFAULT_WEIGHTS 의 weight=0 factor 0건일 때 prompt template 의 vacuous 규칙 줄
// (= 빈 괄호 `()` LLM noise) 자동 skip 검증. cycle 17 주석에 박제만 있고 실제 fix 부재였던 silent drift.
describe('cycle 126 — ZERO_WEIGHT_RULE conditional skip (silent drift 가드)', () => {
  it('weight=0 factor 0건 시 team_postview rule = 빈 문자열', () => {
    expect(getZeroWeightRuleTeamPostview({ sp_fip: 1.0, lineup_woba: 0.5 })).toBe('');
  });

  it('weight=0 factor 0건 시 judge_postview rule = 빈 문자열', () => {
    expect(getZeroWeightRuleJudgePostview({ sp_fip: 1.0, lineup_woba: 0.5 })).toBe('');
  });

  it('weight=0 factor 0건 시 judge_pregame rule = 빈 문자열', () => {
    expect(getZeroWeightRuleJudgePregame({ sp_fip: 1.0, lineup_woba: 0.5 })).toBe('');
  });

  it('weight=0 factor 1+ 건 시 team_postview rule = 규칙 줄 + factor list 포함', () => {
    const rule = getZeroWeightRuleTeamPostview({ sp_fip: 1.0, head_to_head: 0 });
    expect(rule).toContain('가중치 0%');
    expect(rule).toContain('head_to_head');
    expect(rule).toContain('keyFactor');
  });

  it('weight=0 factor 1+ 건 시 judge_postview rule = factorErrors 후보 제외 룰 출력', () => {
    const rule = getZeroWeightRuleJudgePostview({ sp_fip: 1.0, park_factor: 0 });
    expect(rule).toContain('가중치 0%');
    expect(rule).toContain('park_factor');
    expect(rule).toContain('factorErrors');
  });

  it('weight=0 factor 1+ 건 시 judge_pregame rule = reasoning 핵심 근거 사용 금지 룰 출력', () => {
    const rule = getZeroWeightRuleJudgePregame({ sp_fip: 1.0, sfr: 0 });
    expect(rule).toContain('가중치 0%');
    expect(rule).toContain('sfr');
    expect(rule).toContain('reasoning');
  });

  it('현재 DEFAULT_WEIGHTS (모두 > 0) 기준 3 prompt 모두 "가중치 0%" 부재 (vacuous prompt 차단)', () => {
    for (const prompt of [JUDGE_POSTVIEW_SYSTEM, TEAM_POSTVIEW_SYSTEM, JUDGE_PREGAME_SYSTEM]) {
      expect(prompt).not.toContain('가중치 0%');
      expect(prompt).not.toContain('()');
    }
  });

  it('3 prompt 모두 핵심 의도 (반드시 JSON / 사용자 글) 박제 유지', () => {
    expect(JUDGE_POSTVIEW_SYSTEM).toContain('JSON');
    expect(TEAM_POSTVIEW_SYSTEM).toContain('JSON');
    expect(JUDGE_PREGAME_SYSTEM).toContain('JSON');
  });
});

// cycle 384 fix-incident heavy — runPostview agentsFailed/agentError 회귀 테스트.
// PR #372 (cycle 362) 의 debate 차원 가시화를 postview path 에 확장. ANTHROPIC credit
// 소진 시 mv='v2.0-postview' 라벨 silent drift 차단 evidence.
describe('runPostview agentsFailed (cycle 384)', () => {
  const makeContext = (): GameContext => ({
    game: {
      date: '2026-05-14',
      homeTeam: 'LG',
      awayTeam: 'HT',
      gameTime: '18:30',
      stadium: '잠실',
      status: 'final',
      externalGameId: 'TEST-1',
    },
    homeSPStats: null,
    awaySPStats: null,
    homeTeamStats: { team: 'LG', woba: 0, bullpenFip: 0, totalWar: 0, sfr: 0 },
    awayTeamStats: { team: 'HT', woba: 0, bullpenFip: 0, totalWar: 0, sfr: 0 },
    homeElo: { team: 'LG', elo: 1500, winPct: 0.5 },
    awayElo: { team: 'HT', elo: 1500, winPct: 0.5 },
    headToHead: { wins: 0, losses: 0 },
    homeRecentForm: 0.5,
    awayRecentForm: 0.5,
    parkFactor: 1.0,
  });

  const actual: ActualResult = { homeScore: 5, awayScore: 3, winnerCode: 'LG' };
  const original: OriginalPrediction = {
    predictedWinner: 'LG',
    homeWinProb: 0.55,
    factors: { sp_fip: 0.55, bullpen_fip: 0.52, recent_form: 0.51 },
    reasoning: 'pre_game LG 우세',
  };

  const ok = <T,>(data: T): AgentResult<T> => ({
    success: true,
    data,
    error: null,
    model: 'mock',
    tokensUsed: 100,
    durationMs: 50,
  });
  const fail = <T,>(error = 'API credit error'): AgentResult<T> => ({
    success: false,
    data: null,
    error,
    model: 'mock',
    tokensUsed: 0,
    durationMs: 10,
  });

  beforeEach(() => {
    vi.mocked(callLLM).mockReset();
  });

  it('모든 에이전트 성공 시 agentsFailed=false, agentError=null', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(ok({ team: 'LG', summary: 'home', keyFactor: 'sp_fip', missedBy: '' }));
    vi.mocked(callLLM).mockResolvedValueOnce(ok({ team: 'HT', summary: 'away', keyFactor: 'bullpen_fip', missedBy: '' }));
    vi.mocked(callLLM).mockResolvedValueOnce(ok({ factorErrors: [], reasoning: 'judge OK' }));

    const result = await runPostview(makeContext(), actual, original);

    expect(result.agentsFailed).toBe(false);
    expect(result.agentError).toBeNull();
  });

  it('심판 에이전트 실패 시 agentsFailed=true, agentError 캡처', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(ok({ team: 'LG', summary: 'home', keyFactor: 'sp_fip', missedBy: '' }));
    vi.mocked(callLLM).mockResolvedValueOnce(ok({ team: 'HT', summary: 'away', keyFactor: 'bullpen_fip', missedBy: '' }));
    vi.mocked(callLLM).mockResolvedValueOnce(fail('judge fail'));

    const result = await runPostview(makeContext(), actual, original);

    expect(result.agentsFailed).toBe(true);
    expect(result.agentError).toBe('judge fail');
  });

  it('홈 팀 postview 실패 시 agentsFailed=true', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(fail('home fail'));
    vi.mocked(callLLM).mockResolvedValueOnce(ok({ team: 'HT', summary: 'away', keyFactor: 'bullpen_fip', missedBy: '' }));
    vi.mocked(callLLM).mockResolvedValueOnce(ok({ factorErrors: [], reasoning: 'judge OK' }));

    const result = await runPostview(makeContext(), actual, original);

    expect(result.agentsFailed).toBe(true);
    expect(result.agentError).toBe('home fail');
  });

  it('원정 팀 postview 실패 시 agentsFailed=true', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(ok({ team: 'LG', summary: 'home', keyFactor: 'sp_fip', missedBy: '' }));
    vi.mocked(callLLM).mockResolvedValueOnce(fail('away fail'));
    vi.mocked(callLLM).mockResolvedValueOnce(ok({ factorErrors: [], reasoning: 'judge OK' }));

    const result = await runPostview(makeContext(), actual, original);

    expect(result.agentsFailed).toBe(true);
    expect(result.agentError).toBe('away fail');
  });

  it('3개 모두 실패 시 agentsFailed=true + agentError = 홈 에러 (첫 번째)', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(fail('credit exhausted'));
    vi.mocked(callLLM).mockResolvedValueOnce(fail('credit exhausted'));
    vi.mocked(callLLM).mockResolvedValueOnce(fail('credit exhausted'));

    const result = await runPostview(makeContext(), actual, original);

    expect(result.agentsFailed).toBe(true);
    expect(result.agentError).toBe('credit exhausted');
  });
});
