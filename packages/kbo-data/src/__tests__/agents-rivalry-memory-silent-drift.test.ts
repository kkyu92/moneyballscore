/**
 * cycle 175 silent drift family agents 차원 두 번째 진입 회귀 가드.
 *
 * rivalry-memory.ts 의 fetchRecentH2H / fetchMemories 가 .error 무시 시
 * 과거 h2h 또는 Phase D 학습 메모리 누락이 "신규 매치업" / "메모리 0개" 로
 * 위장 → 팀 에이전트 프롬프트 라이벌리 블록 silent skip → 결정론 fallback
 * 만 사용. cycle 174 retro.ts agents 차원 첫 진입 후속.
 *
 * per-source tolerant 의도 보전:
 *   - 한 select 만 실패해도 다른 쪽 살아있음 (Promise.all 안 throw 막음)
 *   - 함수 단위 try/catch wrapper + assertSelectOk + console.error level up
 *
 * 4 위치 가드:
 *   1. fetchRecentH2H games select .error → 빈 배열 반환 + console.error
 *   2. fetchMemories agent_memories select .error → 빈 배열 반환 + console.error
 *   3. 한쪽만 실패 → 다른 쪽 살아있음 (per-source tolerant)
 *   4. 양쪽 다 실패 → 빈 블록 + 두 번 console.error (둘 다 가시화)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRivalryBlock } from '../agents/rivalry-memory';

type FakeResult =
  | { data: unknown; error: null }
  | { data: null; error: { message: string } };

function makeFakeDb(gamesResult: FakeResult, memoriesResult: FakeResult) {
  return {
    from(table: string) {
      const result = table === 'games' ? gamesResult : memoriesResult;
      const chain: Record<string, unknown> = {
        select: () => chain,
        lt: () => chain,
        gte: () => chain,
        eq: () => chain,
        in: () => chain,
        or: () => chain,
        order: () => chain,
        limit: () => Promise.resolve(result),
        then: (resolve: (v: FakeResult) => void) =>
          Promise.resolve(result).then(resolve),
      };
      return chain;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const okEmpty: FakeResult = { data: [], error: null };

function okGames(rows: unknown[]): FakeResult {
  return { data: rows, error: null };
}

function errResult(msg: string): FakeResult {
  return { data: null, error: { message: msg } };
}

describe('rivalry-memory silent drift family — cycle 175 agents 차원 두 번째 진입 회귀 가드', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('fetchRecentH2H', () => {
    it('games select .error → 빈 배열 + console.error 가시화 (silent return [] X)', async () => {
      const db = makeFakeDb(errResult('connection refused'), okEmpty);
      const result = await getRivalryBlock({
        homeTeam: 'LG',
        awayTeam: 'OB',
        date: '2026-05-06',
        db,
      });
      expect(result.recentGames).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
      const errorMsg = errorSpy.mock.calls
        .map((c: unknown[]) => c.join(' '))
        .join('\n');
      expect(errorMsg).toMatch(/rivalry-memory.*fetchRecentH2H/);
      expect(errorMsg).toMatch(/connection refused/);
    });

    it('games select .error 만 실패 → memories 살아있음 (per-source tolerant)', async () => {
      const memoryRow = {
        team_code: 'LG',
        memory_type: 'pattern',
        content: '5회 이후 불펜 약세',
        confidence: 0.7,
        valid_until: '2026-05-13',
      };
      const db = makeFakeDb(errResult('games timeout'), okGames([memoryRow]));
      const result = await getRivalryBlock({
        homeTeam: 'LG',
        awayTeam: 'OB',
        date: '2026-05-06',
        db,
      });
      expect(result.recentGames).toEqual([]);
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].content).toBe('5회 이후 불펜 약세');
    });
  });

  describe('fetchMemories', () => {
    it('agent_memories select .error → 빈 배열 + console.error 가시화', async () => {
      const db = makeFakeDb(okEmpty, errResult('RLS violation'));
      const result = await getRivalryBlock({
        homeTeam: 'LG',
        awayTeam: 'OB',
        date: '2026-05-06',
        db,
      });
      expect(result.memories).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
      const errorMsg = errorSpy.mock.calls
        .map((c: unknown[]) => c.join(' '))
        .join('\n');
      expect(errorMsg).toMatch(/rivalry-memory.*fetchMemories/);
      expect(errorMsg).toMatch(/RLS violation/);
    });

    it('agent_memories select .error 만 실패 → games 살아있음 (per-source tolerant)', async () => {
      const gameRow = {
        game_date: '2026-04-30',
        home_score: 5,
        away_score: 3,
        status: 'final',
        home: { code: 'LG' },
        away: { code: 'OB' },
        winner: { code: 'LG' },
      };
      const db = makeFakeDb(okGames([gameRow]), errResult('memories timeout'));
      const result = await getRivalryBlock({
        homeTeam: 'LG',
        awayTeam: 'OB',
        date: '2026-05-06',
        db,
      });
      expect(result.memories).toEqual([]);
      expect(result.recentGames).toHaveLength(1);
      expect(result.recentGames[0].homeTeam).toBe('LG');
    });
  });

  describe('양쪽 fail', () => {
    it('두 select 모두 .error → 빈 블록 + console.error 두 번 (둘 다 가시화)', async () => {
      const db = makeFakeDb(
        errResult('games down'),
        errResult('memories down'),
      );
      const result = await getRivalryBlock({
        homeTeam: 'LG',
        awayTeam: 'OB',
        date: '2026-05-06',
        db,
      });
      expect(result.recentGames).toEqual([]);
      expect(result.memories).toEqual([]);
      expect(result.promptBlock).toBe('');
      expect(errorSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      const errorMsg = errorSpy.mock.calls
        .map((c: unknown[]) => c.join(' '))
        .join('\n');
      expect(errorMsg).toMatch(/fetchRecentH2H/);
      expect(errorMsg).toMatch(/fetchMemories/);
    });
  });

  describe('정상 path 보전 (회귀 가드)', () => {
    it('정상 select → 정상 반환 + console.error 호출 0건', async () => {
      const gameRow = {
        game_date: '2026-04-30',
        home_score: 5,
        away_score: 3,
        status: 'final',
        home: { code: 'LG' },
        away: { code: 'OB' },
        winner: { code: 'LG' },
      };
      const memoryRow = {
        team_code: 'OB',
        memory_type: 'weakness',
        content: '원정 약세',
        confidence: 0.6,
        valid_until: '2026-05-13',
      };
      const db = makeFakeDb(okGames([gameRow]), okGames([memoryRow]));
      const result = await getRivalryBlock({
        homeTeam: 'LG',
        awayTeam: 'OB',
        date: '2026-05-06',
        db,
      });
      expect(result.recentGames).toHaveLength(1);
      expect(result.memories).toHaveLength(1);
      expect(result.promptBlock).toContain('## 과거 맥락');
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
