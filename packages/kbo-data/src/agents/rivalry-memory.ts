/**
 * Rivalry Memory — 팀 에이전트 프롬프트 주입용 과거 맥락 로더
 *
 * Phase v4-3 Task 1.
 * - 과거 5경기 h2h (home vs away)
 * - agent_memories 테이블에서 해당 팀의 valid_until 유효한 row ≤5개 (confidence DESC)
 * - 플레인텍스트 블록으로 조합 → team-agent buildUserMessage에 주입
 *
 * 실패 모드: 빈 블록 반환. throw 금지. fallback 유지.
 * 토큰 예산: ~400 tokens (Ollama 드라이런으로 경험적 검증 예정). 초과 시 앞부분 truncate.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertSelectOk, type TeamCode } from '@moneyball/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export interface RivalryGame {
  date: string;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homeScore: number | null;
  awayScore: number | null;
  winnerCode: TeamCode | null;
}

export interface RivalryMemoryRow {
  teamCode: TeamCode;
  memoryType: 'strength' | 'weakness' | 'pattern' | 'matchup';
  content: string;
  confidence: number;
}

export interface RivalryBlock {
  recentGames: RivalryGame[];
  memories: RivalryMemoryRow[];
  promptBlock: string;
}

// 토큰 1개 ≈ 한국어 1.5자 근사. 400 tokens ≈ 600자 상한. 초과 시 truncate.
const MAX_BLOCK_CHARS = 600;
const RECENT_GAMES_LIMIT = 5;
const MEMORIES_LIMIT = 5;

function createAdminClient(): DB | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const EMPTY_BLOCK: RivalryBlock = {
  recentGames: [],
  memories: [],
  promptBlock: '',
};

export async function getRivalryBlock(params: {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  date: string;
  db?: DB | null;
}): Promise<RivalryBlock> {
  const db = params.db ?? createAdminClient();
  if (!db) return EMPTY_BLOCK;

  try {
    const [recentGames, memories] = await Promise.all([
      fetchRecentH2H(db, params.homeTeam, params.awayTeam, params.date),
      fetchMemories(db, params.homeTeam, params.awayTeam, params.date),
    ]);

    const promptBlock = buildPromptBlock(recentGames, memories);
    return { recentGames, memories, promptBlock };
  } catch (err) {
    // Supabase timeout/네트워크 등 — throw 금지, 빈 블록 반환
    console.warn('[rivalry-memory] query failed, returning empty block:', err);
    return EMPTY_BLOCK;
  }
}

async function fetchRecentH2H(
  db: DB,
  home: TeamCode,
  away: TeamCode,
  date: string
): Promise<RivalryGame[]> {
  // cycle 175 — silent drift family agents 차원 두 번째 진입. .error 미체크 시
  // 과거 h2h 데이터 누락이 "신규 매치업" 으로 위장 → 팀 에이전트 프롬프트
  // 라이벌리 블록 silent skip → 결정론 fallback 만 사용. cycle 174 retro.ts
  // generateAgentMemories.agent_memories 패턴 일관 (per-source tolerant).
  const result = await db
    .from('games')
    .select(`
      game_date,
      home_score,
      away_score,
      winner_team_id,
      status,
      home:teams!games_home_team_id_fkey(code),
      away:teams!games_away_team_id_fkey(code),
      winner:teams!games_winner_team_id_fkey(code)
    `)
    .lt('game_date', date)
    .eq('status', 'final')
    .or(
      `and(home.code.eq.${home},away.code.eq.${away}),and(home.code.eq.${away},away.code.eq.${home})`
    )
    .order('game_date', { ascending: false })
    .limit(RECENT_GAMES_LIMIT);

  let data: unknown[] | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = assertSelectOk<any[]>(result, 'rivalry-memory.fetchRecentH2H.games');
    data = out.data;
  } catch (e) {
    console.error(
      '[rivalry-memory] fetchRecentH2H select failed:',
      e instanceof Error ? e.message : String(e),
    );
    return [];
  }

  if (!data) return [];

  return data
    .map((row): RivalryGame | null => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any;
      const homeCode = r.home?.code as TeamCode | undefined;
      const awayCode = r.away?.code as TeamCode | undefined;
      const winnerCode = (r.winner?.code as TeamCode | undefined) ?? null;
      if (!homeCode || !awayCode) return null;
      return {
        date: r.game_date,
        homeTeam: homeCode,
        awayTeam: awayCode,
        homeScore: r.home_score,
        awayScore: r.away_score,
        winnerCode,
      };
    })
    .filter((g): g is RivalryGame => g !== null);
}

async function fetchMemories(
  db: DB,
  home: TeamCode,
  away: TeamCode,
  date: string
): Promise<RivalryMemoryRow[]> {
  // cycle 175 — silent drift family agents 차원 두 번째 진입. .error 미체크 시
  // Phase D Compound 루프 학습 결과 누락이 "메모리 0개" 로 위장 → 팀 에이전트가
  // 자가 보정 학습 무시한 채 운영. per-source tolerant 의도 보전 위해
  // try/catch wrapper 안 (h2h 와 분리, 한쪽 fail 시 다른 쪽 살아있음).
  const result = await db
    .from('agent_memories')
    .select('team_code, memory_type, content, confidence, valid_until')
    .in('team_code', [home, away])
    .gte('valid_until', date)
    .order('confidence', { ascending: false })
    .limit(MEMORIES_LIMIT);

  let data: unknown[] | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = assertSelectOk<any[]>(result, 'rivalry-memory.fetchMemories.agent_memories');
    data = out.data;
  } catch (e) {
    console.error(
      '[rivalry-memory] fetchMemories select failed:',
      e instanceof Error ? e.message : String(e),
    );
    return [];
  }

  if (!data) return [];

  return data.map((row): RivalryMemoryRow => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    return {
      teamCode: r.team_code as TeamCode,
      memoryType: r.memory_type,
      content: r.content,
      confidence: Number(r.confidence),
    };
  });
}

export function buildPromptBlock(
  recentGames: RivalryGame[],
  memories: RivalryMemoryRow[]
): string {
  if (recentGames.length === 0 && memories.length === 0) return '';

  const lines: string[] = ['## 과거 맥락'];

  if (recentGames.length > 0) {
    lines.push(`최근 상대전적 (${recentGames.length}경기):`);
    for (const g of recentGames) {
      const winner = g.winnerCode ?? '-';
      const score =
        g.homeScore != null && g.awayScore != null
          ? `${g.homeScore}:${g.awayScore}`
          : '점수없음';
      lines.push(`- ${g.date} ${g.awayTeam}@${g.homeTeam} ${score} 승:${winner}`);
    }
  }

  if (memories.length > 0) {
    lines.push(`에이전트 학습 메모리 (${memories.length}개):`);
    for (const m of memories) {
      lines.push(`- [${m.teamCode} ${m.memoryType}] ${m.content}`);
    }
  }

  const block = lines.join('\n');

  // 토큰 예산 초과 시 앞부분 truncate (헤더는 유지)
  if (block.length <= MAX_BLOCK_CHARS) return block;

  const header = '## 과거 맥락\n(일부 생략)\n';
  const budget = MAX_BLOCK_CHARS - header.length;
  const tail = block.slice(-budget);
  return header + tail;
}
