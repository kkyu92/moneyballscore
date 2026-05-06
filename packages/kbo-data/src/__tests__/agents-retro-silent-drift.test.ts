/**
 * cycle 174 silent drift family agents 차원 첫 진입 회귀 가드.
 *
 * retro.ts 의 updateCalibration / generateAgentMemories 가 .error 무시 시
 * Phase D Compound 루프 (calibration 갱신 + agent_memories 학습) 가 silent
 * skip → 사용자 보기엔 "정상" 이지만 모델 자가 보정 0건으로 운영. cycle
 * 168~172 family (write 측 sequence) 다음 step = agents 차원 첫 진입.
 *
 * 4 위치 가드:
 *   1. updateCalibration: predictions select .error → assertSelectOk throw
 *   2. updateCalibration: calibration_buckets upsert .error → assertWriteOk throw
 *   3. generateAgentMemories: predictions select .error → assertSelectOk throw
 *   4. generateAgentMemories: agent_memories upsert .error → console.error +
 *      다음 game 진행 (per-game tolerant 의도 보전, postview-daily 패턴 일관)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateCalibration, generateAgentMemories } from '../agents/retro';

interface MockResult {
  data?: unknown;
  error: { message: string } | null;
}

function makeChainBuilder(result: MockResult) {
  const builder: Record<string, unknown> = {};
  const chainMethods = ['select', 'eq', 'not', 'upsert'];
  for (const m of chainMethods) {
    builder[m] = vi.fn(() => builder);
  }
  (builder as { then: unknown }).then = (
    resolve: (v: MockResult) => unknown,
  ) => Promise.resolve(result).then(resolve);
  return builder;
}

interface DBMockOptions {
  predictionsSelect?: MockResult;
  calibrationBucketsUpsert?: MockResult;
  wrongPredictionsSelect?: MockResult;
  agentMemoriesUpsert?: MockResult;
}

function makeDBMock(opts: DBMockOptions = {}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'predictions') {
        // updateCalibration / generateAgentMemories 둘 다 predictions 호출.
        // 본 mock 은 어느 함수가 호출하는지 모름 → wrongPredictionsSelect 우선
        // (generateAgentMemories 테스트), 부재 시 predictionsSelect 사용.
        return makeChainBuilder(
          opts.wrongPredictionsSelect ??
            opts.predictionsSelect ?? { data: [], error: null },
        );
      }
      if (table === 'calibration_buckets') {
        return makeChainBuilder(
          opts.calibrationBucketsUpsert ?? { error: null },
        );
      }
      if (table === 'agent_memories') {
        return makeChainBuilder(
          opts.agentMemoriesUpsert ?? { error: null },
        );
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

describe('retro silent drift family — cycle 174 agents 차원 첫 진입 회귀 가드', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('updateCalibration', () => {
    it('predictions select .error → assertSelectOk throw (silent skip 차단)', async () => {
      const dbMock = makeDBMock({
        predictionsSelect: {
          data: null,
          error: { message: 'connection refused' },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(updateCalibration(2026, dbMock as any)).rejects.toThrow(
        /retro\.updateCalibration\.predictions select failed: connection refused/,
      );
    });

    it('predictions 0건 → 정상 return (silent X, 정상 short-circuit)', async () => {
      const dbMock = makeDBMock({
        predictionsSelect: { data: [], error: null },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(updateCalibration(2026, dbMock as any)).resolves.toBeUndefined();
    });

    it('calibration_buckets upsert .error → assertWriteOk throw', async () => {
      const dbMock = makeDBMock({
        predictionsSelect: {
          data: [
            { confidence: 0.2, is_correct: true },
            { confidence: 0.5, is_correct: false },
          ],
          error: null,
        },
        calibrationBucketsUpsert: {
          error: { message: 'RLS violation' },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(updateCalibration(2026, dbMock as any)).rejects.toThrow(
        /retro\.updateCalibration\.calibration_buckets\.\w+ write failed: RLS violation/,
      );
    });
  });

  describe('generateAgentMemories', () => {
    it('predictions select .error → assertSelectOk throw (Phase D 학습 누락 가시화)', async () => {
      const dbMock = makeDBMock({
        wrongPredictionsSelect: {
          data: null,
          error: { message: 'syntax error' },
        },
      });
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generateAgentMemories('2026-05-06', dbMock as any),
      ).rejects.toThrow(
        /retro\.generateAgentMemories\.predictions select failed: syntax error/,
      );
    });

    it('wrong 0건 → 정상 return (silent X, 모든 예측 적중 케이스)', async () => {
      const dbMock = makeDBMock({
        wrongPredictionsSelect: { data: [], error: null },
      });
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generateAgentMemories('2026-05-06', dbMock as any),
      ).resolves.toBeUndefined();
    });

    it('agent_memories upsert .error → console.error + 다음 game 진행 (per-game tolerant)', async () => {
      const wrongRow = {
        game_id: 1,
        predicted_winner: 1,
        confidence: 0.7,
        reasoning: 'test',
        factors: { home_sp_fip: 0.7, away_sp_fip: 0.3 },
        game: {
          id: 1,
          game_date: '2026-05-06',
          home_score: 5,
          away_score: 3,
          home_team: { code: 'LG' },
          away_team: { code: 'OB' },
          winner: { code: 'OB' }, // away 승 → 예측 틀림 (is_correct=false 가정)
        },
      };
      const dbMock = makeDBMock({
        wrongPredictionsSelect: { data: [wrongRow], error: null },
        agentMemoriesUpsert: { error: { message: 'unique violation' } },
      });

      // throw 안 함 (per-game tolerant) — 다른 게임 계속 진행 보장.
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generateAgentMemories('2026-05-06', dbMock as any),
      ).resolves.toBeUndefined();

      // 단 console.error 로 가시화 (silent X — 사례 6 관측 인프라 silent 패턴 차단).
      expect(errorSpy).toHaveBeenCalled();
      const calls = errorSpy.mock.calls.flat().join(' ');
      expect(calls).toMatch(/agent_memories upsert failed/);
      expect(calls).toMatch(/unique violation/);
    });

    it('agent_memories upsert 정상 → console.error 호출 X', async () => {
      const wrongRow = {
        game_id: 1,
        predicted_winner: 1,
        confidence: 0.7,
        reasoning: 'test',
        factors: { home_sp_fip: 0.7, away_sp_fip: 0.3 },
        game: {
          id: 1,
          game_date: '2026-05-06',
          home_score: 5,
          away_score: 3,
          home_team: { code: 'LG' },
          away_team: { code: 'OB' },
          winner: { code: 'OB' },
        },
      };
      const dbMock = makeDBMock({
        wrongPredictionsSelect: { data: [wrongRow], error: null },
        agentMemoriesUpsert: { error: null },
      });
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generateAgentMemories('2026-05-06', dbMock as any),
      ).resolves.toBeUndefined();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('game.game_date !== date → continue (mismatch 게임 skip)', async () => {
      const wrongRow = {
        game_id: 1,
        predicted_winner: 1,
        confidence: 0.7,
        reasoning: 'test',
        factors: { home_sp_fip: 0.7 },
        game: {
          id: 1,
          game_date: '2026-05-05', // 다른 날짜
          home_score: 5,
          away_score: 3,
          home_team: { code: 'LG' },
          away_team: { code: 'OB' },
          winner: { code: 'OB' },
        },
      };
      const dbMock = makeDBMock({
        wrongPredictionsSelect: { data: [wrongRow], error: null },
        agentMemoriesUpsert: { error: { message: 'unreachable' } }, // skip 되면 호출 X
      });
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generateAgentMemories('2026-05-06', dbMock as any),
      ).resolves.toBeUndefined();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
