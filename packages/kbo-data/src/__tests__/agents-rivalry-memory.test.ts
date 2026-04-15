import { describe, it, expect } from 'vitest';
import {
  getRivalryBlock,
  buildPromptBlock,
  type RivalryGame,
  type RivalryMemoryRow,
} from '../agents/rivalry-memory';

// ============================================
// Supabase fake — describe 패턴 최소 구현
// ============================================

type FakeResult = { data: unknown; error: null } | { data: null; error: Error };

// 테스트별로 결과 세팅. games 쿼리 → gamesResult, agent_memories → memoriesResult.
function makeFakeDb(gamesResult: FakeResult, memoriesResult: FakeResult) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    from(table: string) {
      const result = table === 'games' ? gamesResult : memoriesResult;
      // chainable stub — 모든 메서드가 자기자신 반환, 끝은 await로 result
      const chain: Record<string, unknown> = {
        select: () => chain,
        lt: () => chain,
        gte: () => chain,
        eq: () => chain,
        in: () => chain,
        or: () => chain,
        order: () => chain,
        limit: () => Promise.resolve(result),
        then: (resolve: (v: FakeResult) => void) => Promise.resolve(result).then(resolve),
      };
      return chain;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function okGames(rows: unknown[]): FakeResult {
  return { data: rows, error: null };
}

function okMemories(rows: unknown[]): FakeResult {
  return { data: rows, error: null };
}

function errResult(msg: string): FakeResult {
  return { data: null, error: new Error(msg) };
}

// ============================================
// getRivalryBlock
// ============================================
describe('getRivalryBlock', () => {
  it('빈 DB — 빈 블록 반환', async () => {
    const db = makeFakeDb(okGames([]), okMemories([]));
    const result = await getRivalryBlock({
      homeTeam: 'LG',
      awayTeam: 'OB',
      date: '2026-04-15',
      db,
    });
    expect(result.recentGames).toEqual([]);
    expect(result.memories).toEqual([]);
    expect(result.promptBlock).toBe('');
  });

  it('h2h 5경기 + memories 3개 — 블록 생성', async () => {
    const db = makeFakeDb(
      okGames([
        {
          game_date: '2026-04-10',
          home_score: 5,
          away_score: 3,
          status: 'completed',
          home: { code: 'LG' },
          away: { code: 'OB' },
          winner: { code: 'LG' },
        },
      ]),
      okMemories([
        { team_code: 'LG', memory_type: 'strength', content: 'home_sp_fip 일치', confidence: 0.8 },
      ])
    );
    const result = await getRivalryBlock({
      homeTeam: 'LG',
      awayTeam: 'OB',
      date: '2026-04-15',
      db,
    });
    expect(result.recentGames).toHaveLength(1);
    expect(result.memories).toHaveLength(1);
    expect(result.promptBlock).toContain('과거 맥락');
    expect(result.promptBlock).toContain('LG');
    expect(result.promptBlock).toContain('home_sp_fip');
  });

  it('Supabase error — throw 금지, 빈 블록', async () => {
    const db = makeFakeDb(errResult('timeout'), errResult('timeout'));
    const result = await getRivalryBlock({
      homeTeam: 'LG',
      awayTeam: 'OB',
      date: '2026-04-15',
      db,
    });
    expect(result.recentGames).toEqual([]);
    expect(result.memories).toEqual([]);
    expect(result.promptBlock).toBe('');
  });

  it('Promise reject — throw 금지, 빈 블록', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = {
      from() {
        throw new Error('network down');
      },
    };
    const result = await getRivalryBlock({
      homeTeam: 'LG',
      awayTeam: 'OB',
      date: '2026-04-15',
      db,
    });
    expect(result.promptBlock).toBe('');
  });

  it('db 미지정 + env 미설정 — 빈 블록', async () => {
    // 기본 createAdminClient는 env 없으면 null 반환 → 빈 블록
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const result = await getRivalryBlock({
        homeTeam: 'LG',
        awayTeam: 'OB',
        date: '2026-04-15',
      });
      expect(result.promptBlock).toBe('');
    } finally {
      if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });
});

// ============================================
// buildPromptBlock (순수 함수)
// ============================================
describe('buildPromptBlock', () => {
  const g1: RivalryGame = {
    date: '2026-04-10',
    homeTeam: 'LG',
    awayTeam: 'OB',
    homeScore: 5,
    awayScore: 3,
    winnerCode: 'LG',
  };
  const m1: RivalryMemoryRow = {
    teamCode: 'LG',
    memoryType: 'strength',
    content: 'home_sp_fip 예측 일치',
    confidence: 0.8,
  };

  it('양쪽 모두 비어있으면 빈 문자열', () => {
    expect(buildPromptBlock([], [])).toBe('');
  });

  it('경기만 있음 — 헤더 + 경기 섹션', () => {
    const block = buildPromptBlock([g1], []);
    expect(block).toContain('## 과거 맥락');
    expect(block).toContain('최근 상대전적');
    expect(block).toContain('2026-04-10');
    expect(block).toContain('5:3');
    expect(block).not.toContain('학습 메모리');
  });

  it('메모리만 있음 — 헤더 + 메모리 섹션', () => {
    const block = buildPromptBlock([], [m1]);
    expect(block).toContain('## 과거 맥락');
    expect(block).toContain('학습 메모리');
    expect(block).toContain('home_sp_fip');
    expect(block).not.toContain('최근 상대전적');
  });

  it('400 토큰(600자) 초과 시 앞부분 truncate, 헤더 유지', () => {
    const longGames: RivalryGame[] = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      homeTeam: 'LG' as const,
      awayTeam: 'OB' as const,
      homeScore: i,
      awayScore: i + 1,
      winnerCode: 'OB' as const,
    }));
    const longMemories: RivalryMemoryRow[] = Array.from({ length: 20 }, (_, i) => ({
      teamCode: 'LG' as const,
      memoryType: 'pattern' as const,
      content: `매우 긴 학습 내용 ${i} — 반복되는 패턴 설명 문구 확장`,
      confidence: 0.5,
    }));
    const block = buildPromptBlock(longGames, longMemories);
    expect(block.length).toBeLessThanOrEqual(600);
    expect(block.startsWith('## 과거 맥락')).toBe(true);
    expect(block).toContain('일부 생략');
  });
});
