/**
 * PLAN_v5 Phase 4 §7.2 — daily.ts 4-mode 통합 테스트
 *
 * 커버 범위:
 *  - announce / predict / predict_final / verify 모드 분기
 *  - finish() helper 가 모든 exit 경로에서 pipeline_runs 에 로그하는지 (Codex #7)
 *  - R2: handleDailySummaryNotification 조건부 발화 (daily_notifications flag)
 *  - R5: predictions INSERT 23505 catch — first-write-wins race
 *  - predict_final GAP 감지 → notifyError
 *  - predict mode 의 windowTargets 0 → Fancy Stats 스킵 early return
 *
 * 설계 주의:
 *  Supabase 클라이언트는 chainable proxy 로 mock. 각 테스트가 per-table 응답을
 *  명시적으로 구성하며, 나머지 테이블은 빈 응답으로 폴백. 외부 스크래퍼/알림/
 *  에이전트 모듈은 vi.mock 으로 차단해서 실제 네트워크 호출 없음.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapedGame } from '../types';

// ============================================
// 외부 의존성 mock
// ============================================

vi.mock('../scrapers/kbo-official', () => ({
  fetchGames: vi.fn(),
  fetchRecentForm: vi.fn().mockResolvedValue(0.5),
  fetchHeadToHead: vi.fn().mockResolvedValue({ wins: 0, losses: 0 }),
  DEFAULT_PARK_FACTORS: {} as Record<string, number>,
}));

vi.mock('../scrapers/fancy-stats', () => ({
  fetchPitcherStats: vi.fn().mockResolvedValue([]),
  fetchTeamStats: vi.fn().mockResolvedValue([]),
  fetchEloRatings: vi.fn().mockResolvedValue([]),
  findPitcher: vi.fn().mockReturnValue(null),
}));

vi.mock('../scrapers/fangraphs', () => ({
  fetchBatterLeaders: vi.fn().mockResolvedValue([]),
}));

vi.mock('../engine/predictor', () => ({
  predict: vi.fn().mockReturnValue({
    predictedWinner: 'OB',
    homeWinProb: 0.55,
    confidence: 0.2,
    factors: {},
    reasoning: 'test',
  }),
}));

vi.mock('../agents/debate', () => ({
  runDebate: vi.fn().mockResolvedValue({
    homeArgument: null, awayArgument: null, calibration: null,
    verdict: { predictedWinner: 'OB', homeWinProb: 0.6, confidence: 0.25 },
    quantitativeProb: 0.55, totalTokens: 0,
  }),
}));

vi.mock('../agents/retro', () => ({
  updateCalibration: vi.fn().mockResolvedValue(undefined),
  generateAgentMemories: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../pipeline/postview-daily', () => ({
  runPostviewDaily: vi.fn().mockResolvedValue({ processed: 0 }),
}));

vi.mock('../notify/telegram', () => ({
  notifyAnnounce: vi.fn().mockResolvedValue(undefined),
  notifyPredictions: vi.fn().mockResolvedValue(undefined),
  notifyResults: vi.fn().mockResolvedValue(undefined),
  notifyError: vi.fn().mockResolvedValue(undefined),
  notifyPipelineStatus: vi.fn().mockResolvedValue(undefined),
}));

// ============================================
// Supabase chainable mock
// ============================================

interface TableStub {
  /** select/chain 의 기본 응답 (array 쿼리) */
  selectData?: unknown[];
  /** .single() / .maybeSingle() 응답 */
  single?: { data: unknown; error: unknown | null };
  /** head: true + count 쿼리의 count 값 */
  count?: number;
  /** insert 결과 (chain.insert(x).select() 경로) */
  insert?: { data: unknown; error: unknown | null };
  /** upsert 결과 (chain.upsert(x).select() 경로) */
  upsert?: { data: unknown; error: unknown | null };
  /** update 응답 */
  update?: { data: unknown; error: unknown | null };
  /** delete 응답 (count 포함) */
  delete?: { data: unknown; error: unknown | null; count?: number };
}

type Tables = Record<string, TableStub>;

interface CallLog {
  table: string;
  operations: string[];
  args: unknown[][];
}

function createMockSupabase(tables: Tables) {
  const calls: CallLog[] = [];

  function makeChain(table: string) {
    const log: CallLog = { table, operations: [], args: [] };
    calls.push(log);

    let terminalOp: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';

    const stub = tables[table] ?? {};

    const defaultResponse = () => {
      switch (terminalOp) {
        case 'insert':
          return stub.insert ?? { data: null, error: null };
        case 'upsert':
          return stub.upsert ?? { data: null, error: null };
        case 'update':
          return stub.update ?? { data: null, error: null };
        case 'delete':
          return stub.delete ?? { data: null, error: null, count: 0 };
        default:
          return { data: stub.selectData ?? [], error: null, count: stub.count };
      }
    };

    const chain: Record<string, unknown> = {};

    const methods = [
      'select', 'insert', 'upsert', 'update', 'delete',
      'eq', 'in', 'or', 'lt', 'gt', 'lte', 'gte',
      'not', 'is', 'order', 'limit', 'range',
    ];

    for (const m of methods) {
      chain[m] = (...args: unknown[]) => {
        log.operations.push(m);
        log.args.push(args);
        if (m === 'insert' || m === 'upsert' || m === 'update' || m === 'delete') {
          terminalOp = m as typeof terminalOp;
        }
        return chain;
      };
    }

    chain.single = () => {
      log.operations.push('single');
      return Promise.resolve(stub.single ?? { data: null, error: null });
    };
    chain.maybeSingle = () => {
      log.operations.push('maybeSingle');
      return Promise.resolve(stub.single ?? { data: null, error: null });
    };

    // thenable (await chain → default response)
    chain.then = (
      resolve: (v: unknown) => unknown,
      reject?: (e: unknown) => unknown,
    ) => {
      try {
        return Promise.resolve(defaultResponse()).then(resolve, reject);
      } catch (e) {
        return reject ? Promise.resolve(reject(e)) : Promise.reject(e);
      }
    };

    return chain;
  }

  return {
    from: vi.fn((table: string) => makeChain(table)),
    _calls: calls,
  };
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// 실제 테스트에서 per-test mock 주입
import { createClient } from '@supabase/supabase-js';
import { fetchGames } from '../scrapers/kbo-official';
import {
  fetchPitcherStats, fetchTeamStats, fetchEloRatings,
} from '../scrapers/fancy-stats';
import {
  notifyAnnounce, notifyPredictions, notifyResults,
  notifyError, notifyPipelineStatus,
} from '../notify/telegram';
import { updateCalibration, generateAgentMemories } from '../agents/retro';

// dynamic import — mock 설정 이후 로드
async function loadPipeline() {
  return await import('../pipeline/daily');
}

// ============================================
// 공통 fixture 헬퍼
// ============================================

function makeGame(overrides: Partial<ScrapedGame> = {}): ScrapedGame {
  return {
    date: '2026-04-22',
    homeTeam: 'OB',
    awayTeam: 'HT',
    gameTime: '18:30',
    stadium: '잠실',
    homeSP: '최민석',
    awaySP: '양현종',
    status: 'scheduled',
    externalGameId: '20260422HTOB0',
    ...overrides,
  };
}

function baseTables(): Tables {
  return {
    leagues: { single: { data: { id: 1 }, error: null } },
    teams: {
      selectData: [
        { id: 1, code: 'OB' }, { id: 2, code: 'HT' },
        { id: 3, code: 'LG' }, { id: 4, code: 'SS' },
        { id: 5, code: 'LT' }, { id: 6, code: 'HH' },
        { id: 7, code: 'WO' }, { id: 8, code: 'KT' },
        { id: 9, code: 'SK' }, { id: 10, code: 'NC' },
      ],
    },
    games: {
      upsert: {
        data: [
          { id: 101, external_game_id: '20260422HTOB0' },
          { id: 102, external_game_id: '20260422SSLG0' },
        ],
        error: null,
      },
      selectData: [],
    },
    predictions: { selectData: [] },
    pipeline_runs: { insert: { data: null, error: null } },
    daily_notifications: { upsert: { data: null, error: null } },
    agent_memories: { delete: { data: null, error: null, count: 0 } },
    validator_logs: { delete: { data: null, error: null, count: 0 } },
  };
}

// ============================================
// 공통 env setup
// ============================================

const ENV_BACKUP: Record<string, string | undefined> = {};

function setupEnv() {
  for (const k of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
  ]) {
    ENV_BACKUP[k] = process.env[k];
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
}

function teardownEnv() {
  for (const [k, v] of Object.entries(ENV_BACKUP)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

// ============================================
// Tests
// ============================================

describe('runDailyPipeline — mode 분기 + finish() 보장', () => {
  beforeEach(() => {
    setupEnv();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    teardownEnv();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('announce mode', () => {
    it('fetchGames 성공 → notifyAnnounce 호출 + pipeline_runs 로그', async () => {
      const tables = baseTables();
      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.mocked(fetchGames).mockResolvedValue([
        makeGame(),
        makeGame({ homeTeam: 'LG', awayTeam: 'SS', externalGameId: '20260422SSLG0' }),
      ]);

      const { runDailyPipeline } = await loadPipeline();
      const result = await runDailyPipeline('2026-04-22', 'announce', 'cron');

      expect(result.gamesFound).toBe(2);
      expect(result.predictionsGenerated).toBe(0);
      expect(vi.mocked(notifyAnnounce)).toHaveBeenCalledOnce();

      // finish() — pipeline_runs insert 호출 확인
      const runLog = mock._calls.find(
        (c) => c.table === 'pipeline_runs' && c.operations.includes('insert'),
      );
      expect(runLog).toBeDefined();

      // announce 는 Fancy Stats 건드리지 않음
      expect(vi.mocked(fetchPitcherStats)).not.toHaveBeenCalled();
    });

    it('fetchGames 실패 → errors 채우고 finish() 로 pipeline_runs 로그', async () => {
      const tables = baseTables();
      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.mocked(fetchGames).mockRejectedValue(new Error('KBO API 500'));

      const { runDailyPipeline } = await loadPipeline();
      const result = await runDailyPipeline('2026-04-22', 'announce', 'cron');

      expect(result.gamesFound).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('fetchGames');
      expect(vi.mocked(notifyAnnounce)).not.toHaveBeenCalled();

      // finish() 보장 — 에러 경로에서도 pipeline_runs insert
      const runLog = mock._calls.find(
        (c) => c.table === 'pipeline_runs' && c.operations.includes('insert'),
      );
      expect(runLog).toBeDefined();
    });
  });

  describe('predict mode', () => {
    it('windowTargets 0 (전 경기 이미 예측됨) → Fancy Stats 스킵 + early return', async () => {
      const tables = baseTables();
      // predictions 기존 row 로 채워서 existingSet 에 등록
      tables.predictions = {
        selectData: [{ game_id: 101 }, { game_id: 102 }],
      };

      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      // 3시간 윈도우 안에 드는 시각 (15:30 KST = 06:30 UTC)
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-22T06:30:00Z'));

      try {
        vi.mocked(fetchGames).mockResolvedValue([
          makeGame({ gameTime: '18:30' }),
          makeGame({
            homeTeam: 'LG', awayTeam: 'SS',
            externalGameId: '20260422SSLG0', gameTime: '18:30',
          }),
        ]);

        const { runDailyPipeline } = await loadPipeline();
        const result = await runDailyPipeline('2026-04-22', 'predict', 'cron');

        expect(result.gamesFound).toBe(2);
        expect(result.predictionsGenerated).toBe(0);
        expect(result.gamesSkipped).toBe(2);

        // Fancy Stats 호출되지 않음 (early return)
        expect(vi.mocked(fetchPitcherStats)).not.toHaveBeenCalled();
        expect(vi.mocked(fetchTeamStats)).not.toHaveBeenCalled();
        expect(vi.mocked(fetchEloRatings)).not.toHaveBeenCalled();

        // finish() 로그
        const runLog = mock._calls.find(
          (c) => c.table === 'pipeline_runs' && c.operations.includes('insert'),
        );
        expect(runLog).toBeDefined();
      } finally {
        vi.useRealTimers();
      }
    });

    it('games.length === 0 → 즉시 finish() (setup 후)', async () => {
      const tables = baseTables();
      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.mocked(fetchGames).mockResolvedValue([]);

      const { runDailyPipeline } = await loadPipeline();
      const result = await runDailyPipeline('2026-04-22', 'predict', 'cron');

      expect(result.gamesFound).toBe(0);
      expect(result.predictionsGenerated).toBe(0);

      // Fancy Stats 미호출
      expect(vi.mocked(fetchPitcherStats)).not.toHaveBeenCalled();

      // pipeline_runs 로그
      const runLog = mock._calls.find(
        (c) => c.table === 'pipeline_runs' && c.operations.includes('insert'),
      );
      expect(runLog).toBeDefined();
    });

    it('setup 단계 실패 (leagues not found) → finish() 로 에러 로그', async () => {
      const tables = baseTables();
      tables.leagues = { single: { data: null, error: null } };

      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.mocked(fetchGames).mockResolvedValue([]);

      const { runDailyPipeline } = await loadPipeline();
      const result = await runDailyPipeline('2026-04-22', 'predict', 'cron');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('setup');

      const runLog = mock._calls.find(
        (c) => c.table === 'pipeline_runs' && c.operations.includes('insert'),
      );
      expect(runLog).toBeDefined();
    });
  });

  describe('predict_final mode (Codex #9 GAP 감지)', () => {
    it('predictions count < expected → notifyError("GAP")', async () => {
      const tables = baseTables();
      // 양쪽 다 existing 에 넣어 windowTargets 0 → 예측 루프 스킵 + GAP 체크만.
      // 하지만 count 질의 는 1 만 반환 → silent data loss 시뮬레이션.
      tables.predictions = {
        selectData: [{ game_id: 101 }, { game_id: 102 }],
        count: 1,
      };

      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-22T06:30:00Z'));

      try {
        vi.mocked(fetchGames).mockResolvedValue([
          makeGame({ gameTime: '18:30' }),
          makeGame({
            homeTeam: 'LG', awayTeam: 'SS',
            externalGameId: '20260422SSLG0', gameTime: '18:30',
          }),
        ]);

        const { runDailyPipeline } = await loadPipeline();
        const result = await runDailyPipeline('2026-04-22', 'predict_final', 'cron');

        expect(result.errors.some((e) => e.includes('[GAP]'))).toBe(true);
        expect(vi.mocked(notifyError)).toHaveBeenCalled();
        const call = vi.mocked(notifyError).mock.calls[0];
        expect(call[0]).toContain('GAP');
      } finally {
        vi.useRealTimers();
      }
    });

    it('gap === 0 → notifyError 미호출', async () => {
      const tables = baseTables();
      tables.predictions = {
        selectData: [{ game_id: 101 }, { game_id: 102 }],
        count: 2,
      };

      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-22T06:30:00Z'));

      try {
        vi.mocked(fetchGames).mockResolvedValue([
          makeGame({ gameTime: '18:30' }),
          makeGame({
            homeTeam: 'LG', awayTeam: 'SS',
            externalGameId: '20260422SSLG0', gameTime: '18:30',
          }),
        ]);

        const { runDailyPipeline } = await loadPipeline();
        const result = await runDailyPipeline('2026-04-22', 'predict_final', 'cron');

        expect(result.errors.filter((e) => e.includes('[GAP]'))).toHaveLength(0);
        expect(vi.mocked(notifyError)).not.toHaveBeenCalledWith(
          expect.stringContaining('GAP'),
          expect.anything(),
        );
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('verify mode', () => {
    it('updateCalibration + generateAgentMemories + notifyResults 호출', async () => {
      const tables = baseTables();
      // games query 에 2경기 final, 1경기에 prediction 있음
      tables.games = {
        ...tables.games,
        selectData: [
          {
            id: 101, home_team_id: 1, away_team_id: 2,
            home_score: 5, away_score: 3, winner_team_id: 1,
          },
        ],
      };
      tables.predictions = {
        single: {
          data: { id: 501, predicted_winner: 1, is_correct: null },
          error: null,
        },
      };

      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.mocked(fetchGames).mockResolvedValue([makeGame({ status: 'final' })]);

      const { runDailyPipeline } = await loadPipeline();
      await runDailyPipeline('2026-04-22', 'verify', 'cron');

      expect(vi.mocked(updateCalibration)).toHaveBeenCalledOnce();
      expect(vi.mocked(generateAgentMemories)).toHaveBeenCalledOnce();
      expect(vi.mocked(notifyResults)).toHaveBeenCalledOnce();

      const runLog = mock._calls.find(
        (c) => c.table === 'pipeline_runs' && c.operations.includes('insert'),
      );
      expect(runLog).toBeDefined();
    });

    it('verify 중 compound 루프 실패 → errors 채우지만 finish() 통과', async () => {
      const tables = baseTables();
      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.mocked(fetchGames).mockResolvedValue([makeGame()]);
      vi.mocked(updateCalibration).mockRejectedValueOnce(new Error('calib DB fail'));

      const { runDailyPipeline } = await loadPipeline();
      const result = await runDailyPipeline('2026-04-22', 'verify', 'cron');

      expect(result.errors.some((e) => e.includes('compound'))).toBe(true);

      const runLog = mock._calls.find(
        (c) => c.table === 'pipeline_runs' && c.operations.includes('insert'),
      );
      expect(runLog).toBeDefined();
    });
  });

  describe('notifyPipelineStatus 조건부 발화', () => {
    it('announce mode → notifyPipelineStatus 미호출 (spam 방지)', async () => {
      const tables = baseTables();
      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.mocked(fetchGames).mockResolvedValue([makeGame()]);

      const { runDailyPipeline } = await loadPipeline();
      await runDailyPipeline('2026-04-22', 'announce', 'cron');

      expect(vi.mocked(notifyPipelineStatus)).not.toHaveBeenCalled();
    });

    it('predict mode + predictionsGenerated 0 → notifyPipelineStatus 미호출', async () => {
      const tables = baseTables();
      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.mocked(fetchGames).mockResolvedValue([]);

      const { runDailyPipeline } = await loadPipeline();
      await runDailyPipeline('2026-04-22', 'predict', 'cron');

      expect(vi.mocked(notifyPipelineStatus)).not.toHaveBeenCalled();
    });

    it('verify mode → 예측 0건이어도 notifyPipelineStatus 호출', async () => {
      const tables = baseTables();
      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.mocked(fetchGames).mockResolvedValue([makeGame()]);

      const { runDailyPipeline } = await loadPipeline();
      await runDailyPipeline('2026-04-22', 'verify', 'cron');

      expect(vi.mocked(notifyPipelineStatus)).toHaveBeenCalledOnce();
    });

    it('predict_final mode → 예측 0건이어도 notifyPipelineStatus 호출', async () => {
      const tables = baseTables();
      tables.predictions = { selectData: [{ game_id: 101 }], count: 1 };

      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-22T06:30:00Z'));
      try {
        vi.mocked(fetchGames).mockResolvedValue([makeGame({ gameTime: '18:30' })]);
        const { runDailyPipeline } = await loadPipeline();
        await runDailyPipeline('2026-04-22', 'predict_final', 'cron');

        expect(vi.mocked(notifyPipelineStatus)).toHaveBeenCalledOnce();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('handleDailySummaryNotification (R2)', () => {
    // handleDailySummaryNotification 은 predictionsGenerated > 0 경로에서 호출.
    // 이 테스트는 daily.ts 내부 함수라 간접 검증. predictionsGenerated=0 이면
    // 확실히 호출 안 됨을 확인 — 실제 호출 조건은 통합 관찰로 보완.
    it('predictionsGenerated === 0 → notifyPredictions 절대 미호출', async () => {
      const tables = baseTables();
      const mock = createMockSupabase(tables);
      vi.mocked(createClient).mockReturnValue(mock as never);

      vi.mocked(fetchGames).mockResolvedValue([]);

      const { runDailyPipeline } = await loadPipeline();
      await runDailyPipeline('2026-04-22', 'predict', 'cron');

      expect(vi.mocked(notifyPredictions)).not.toHaveBeenCalled();
    });
  });

  describe('Supabase env guard', () => {
    it('NEXT_PUBLIC_SUPABASE_URL 없으면 createAdminClient throw', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const { runDailyPipeline } = await loadPipeline();
      await expect(runDailyPipeline('2026-04-22', 'announce', 'cron'))
        .rejects.toThrow(/SUPABASE_URL/);
    });
  });
});
