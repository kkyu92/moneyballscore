import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMlbAgentMemories } from '../mlb-retro';

function makeUpsertTrackingDb() {
  const upsertCalls: Array<{ table: string; row: Record<string, unknown> }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = {
    from: (table: string) => ({
      upsert: (row: Record<string, unknown>) => {
        upsertCalls.push({ table, row });
        return Promise.resolve({ error: null });
      },
    }),
  };
  return { db, upsertCalls };
}

const BASE_PRED = {
  external_game_id: 'g1',
  home_win_prob: 0.7, // predicted home win
  home_sp_fip: 4.50,
  away_sp_fip: 3.00, // away 투수가 크게 우위 — maxBias 후보
  home_sp_xfip: null,
  away_sp_xfip: null,
  home_lineup_woba: null,
  away_lineup_woba: null,
  home_bullpen_fip: null,
  away_bullpen_fip: null,
  home_war_total: null,
  away_war_total: null,
  home_lineup_xwoba: null,
  away_lineup_xwoba: null,
  home_lineup_barrel_pct: null,
  away_lineup_barrel_pct: null,
};

const BASE_SCHEDULE = {
  external_game_id: 'g1',
  home_team_code: 'NYY',
  away_team_code: 'BOS',
  home_score: 2,
  away_score: 5, // away 승 — 예측(home win) 오답
};

describe('generateMlbAgentMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('오답 예측 + 완전 factor 데이터 → home/away 양쪽 memory upsert', async () => {
    const { db, upsertCalls } = makeUpsertTrackingDb();

    await generateMlbAgentMemories(
      db,
      '2026-08-18',
      [{ pred: BASE_PRED, schedule: BASE_SCHEDULE }],
    );

    expect(upsertCalls).toHaveLength(2);
    expect(upsertCalls.every((c) => c.table === 'agent_memories')).toBe(true);
    expect(upsertCalls.every((c) => c.row.league === 'mlb')).toBe(true);
    expect(upsertCalls.map((c) => c.row.team_code).sort()).toEqual(['BOS', 'NYY']);
    expect(upsertCalls[0].row.source_game_id).toBeNull();
  });

  it('정답 예측(적중) → upsert 0건', async () => {
    const { db, upsertCalls } = makeUpsertTrackingDb();

    await generateMlbAgentMemories(
      db,
      '2026-08-18',
      [{ pred: { ...BASE_PRED, home_win_prob: 0.3 }, schedule: BASE_SCHEDULE }], // away 승 예측 = 적중
    );

    expect(upsertCalls).toHaveLength(0);
  });

  it('home_win_prob null → skip', async () => {
    const { db, upsertCalls } = makeUpsertTrackingDb();

    await generateMlbAgentMemories(
      db,
      '2026-08-18',
      [{ pred: { ...BASE_PRED, home_win_prob: null }, schedule: BASE_SCHEDULE }],
    );

    expect(upsertCalls).toHaveLength(0);
  });

  it('무승부 스코어(방어적) → skip', async () => {
    const { db, upsertCalls } = makeUpsertTrackingDb();

    await generateMlbAgentMemories(
      db,
      '2026-08-18',
      [{ pred: BASE_PRED, schedule: { ...BASE_SCHEDULE, home_score: 3, away_score: 3 } }],
    );

    expect(upsertCalls).toHaveLength(0);
  });

  it('모든 factor 컬럼 null + 중립 구장(parkPf=100) 홈팀 → 가짜 bias 생성 없이 skip', async () => {
    const { db, upsertCalls } = makeUpsertTrackingDb();
    const allNullPred = { ...BASE_PRED, home_sp_fip: null, away_sp_fip: null };
    // BAL parkPf=100(중립) — park_factor contribution 도 정확히 0 → 실제 신호 0
    const neutralParkSchedule = { ...BASE_SCHEDULE, home_team_code: 'BAL' };

    await generateMlbAgentMemories(
      db,
      '2026-08-18',
      [{ pred: allNullPred, schedule: neutralParkSchedule }],
    );

    expect(upsertCalls).toHaveLength(0);
  });

  it('finalRows 빈 배열 → 아무 것도 안 함', async () => {
    const { db, upsertCalls } = makeUpsertTrackingDb();

    await generateMlbAgentMemories(db, '2026-08-18', []);

    expect(upsertCalls).toHaveLength(0);
  });
});
