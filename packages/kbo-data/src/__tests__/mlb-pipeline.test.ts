// Plan C Task 2 — mlb-pipeline.ts 테스트
// 각 mode 호출 시 throw 없음, unknown mode throw, result shape 검증

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { MlbPipelineResult } from '../pipeline/mlb-pipeline';

// ── mock 외부 의존성 ──────────────────────────────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
  })),
}));

vi.mock('../scrapers/statsapi-mlb', () => ({
  fetchMlbSchedule: vi.fn().mockResolvedValue([
    {
      gamePk: 1001,
      gameDateUtc: new Date('2026-06-12T23:00:00Z'),
      homeTeam: 'NYY',
      awayTeam: 'BOS',
      status: 'scheduled',
    },
  ]),
}));

vi.mock('../scrapers/fangraphs-mlb', () => ({
  fetchFangraphsMlbTeams: vi.fn().mockResolvedValue([
    {
      teamCode: 'NYY', woba: 0.320, fip: 3.80, xfip: 3.90, war: 25.0,
      ldPct: 21.0, gbPct: 42.0, fbPct: 37.0, iffbPct: 9.0,
      hrFbPct: 12.0, pullPct: 40.0, centPct: 35.0, oppoPct: 25.0,
    },
  ]),
}));

vi.mock('../scrapers/baseball-savant', () => ({
  fetchSavantTeamStatcast: vi.fn().mockResolvedValue([
    { teamCode: 'NYY', xwoba: 0.325, barrelPct: 9.5, hardHitPct: 42.0, launchAngle: 12.0 },
  ]),
}));

vi.mock('../factors/mlb-base', () => ({
  computeMlbProbability: vi.fn().mockReturnValue(0.55),
}));

vi.mock('../factors/mlb-shadow-c', () => ({
  MILESTONE_TRIGGERS: [27, 60, 150, 300, 1000, 2430],
  trainShadowWeights: vi.fn().mockReturnValue({ weights: {}, loss: 0.25 }),
  computeBrier: vi.fn().mockReturnValue(0.24),
}));

vi.mock('../pipeline/silent-drift-alert', () => ({
  shouldAlertSilentDrift: vi.fn().mockReturnValue(false),
  captureSilentDriftAlert: vi.fn().mockResolvedValue(undefined),
}));

// ── tests ─────────────────────────────────────────────────────────────────────

const DATE = '2026-06-12';
const TRIGGERED_BY = 'test';

function assertResultShape(result: MlbPipelineResult, mode: string): void {
  expect(result).toMatchObject({
    mode,
    date: DATE,
    triggered_by: TRIGGERED_BY,
  });
  expect(typeof result.games_found).toBe('number');
  expect(typeof result.rows_inserted).toBe('number');
  expect(Array.isArray(result.errors)).toBe(true);
}

describe('runMlbPipeline', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    vi.clearAllMocks();
  });

  it('mlb_statsapi_scrape — throw 없음, result shape 정상', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_statsapi_scrape', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_statsapi_scrape');
  });

  it('mlb_fancy_scrape — fetchFangraphsMlbTeams → mlb_team_stats upsert (cycle 1985 wiring)', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_fancy_scrape', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_fancy_scrape');
    expect(result.games_found).toBe(1);
    expect(result.rows_inserted).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('mlb_savant_scrape — fetchSavantTeamStatcast → mlb_team_stats upsert (cycle 1985 wiring)', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_savant_scrape', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_savant_scrape');
    expect(result.games_found).toBe(1);
    expect(result.rows_inserted).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('mlb_fancy_scrape — upsert onConflict team_code,season + season derived from date', async () => {
    const upsertCalls: Array<{ table: string; rows: unknown; onConflict: string }> = [];
    const { createClient } = await import('@supabase/supabase-js');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn((table: string) => ({
        upsert: vi.fn((rows: unknown, opts: { onConflict: string }) => {
          upsertCalls.push({ table, rows, onConflict: opts.onConflict });
          return Promise.resolve({ error: null });
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    } as unknown as ReturnType<typeof createClient>);

    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    await runMlbPipeline('mlb_fancy_scrape', DATE, TRIGGERED_BY);

    const call = upsertCalls.find((c) => c.table === 'mlb_team_stats');
    expect(call).toBeDefined();
    expect(call?.onConflict).toBe('team_code,season');
    expect((call?.rows as Array<{ season: number }>)[0].season).toBe(2026);
  });

  it('mlb_predict_final — throw 없음, result shape 정상', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_predict_final', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_predict_final');
  });

  it('mlb_combined_notify — stub, throw 없음, result shape 정상', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_combined_notify', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_combined_notify');
    expect(result.rows_inserted).toBe(0);
  });

  it('mlb_shadow_train — throw 없음, result shape 정상', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_shadow_train', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_shadow_train');
  });

  it('mlb_shadow_train — insert target mlb_shadow_train_log (regression: silent drift audit — 이 테이블이 전체 migration 역사에 없어 prod insert 가 매 fire 100% 실패하던 것을 migration 049 로 발견/수정. 존재하지 않는 테이블명으로 다시 새지 않는지 + payload shape 고정)', async () => {
    const insertedRows: Array<{ table: string; row: Record<string, unknown> }> = [];
    const { createClient } = await import('@supabase/supabase-js');

    const scheduleGames = [{ external_game_id: '5001', home_score: 5, away_score: 2 }];
    const predRows = [{ external_game_id: '5001', home_win_prob: 0.6 }];

    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'mlb_schedule') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: scheduleGames, error: null })),
              })),
            })),
          };
        }
        if (table === 'predictions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => Promise.resolve({ data: predRows, error: null })),
                })),
              })),
            })),
          };
        }
        return {
          insert: vi.fn((row: Record<string, unknown>) => {
            insertedRows.push({ table, row });
            return Promise.resolve({ error: null });
          }),
        };
      }),
    } as unknown as ReturnType<typeof createClient>);

    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_shadow_train', DATE, TRIGGERED_BY);

    expect(result.errors).toHaveLength(0);
    expect(result.rows_inserted).toBe(1);
    const call = insertedRows.find((c) => c.table === 'mlb_shadow_train_log');
    expect(call).toBeDefined();
    expect(call?.row).toMatchObject({ date: DATE, sample_count: 1 });
    expect(Object.keys(call!.row)).toEqual(
      expect.arrayContaining(['date', 'sample_count', 'weights', 'brier', 'accuracy', 'milestone_hit']),
    );
  });

  it('mlb_walk_forward_measure — throw 없음, result shape 정상', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_walk_forward_measure', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_walk_forward_measure');
  });

  it('mlb_walk_forward_measure — insert target mlb_walk_forward_log, 구 walk_forward_brier 로 새지 않음 (regression: silent drift audit — walk_forward_brier 는 month/cohort_size/brier_base/brier_shadow/delta 컬럼 전용 설계(월간 base-vs-shadow 비교)라 이 코드가 쓰던 date/scoring_rule/brier_score/sample_count 와 전량 불일치, 매 fire insert 실패하던 것을 migration 049 로 발견/수정)', async () => {
    const insertedRows: Array<{ table: string; row: Record<string, unknown> }> = [];
    const { createClient } = await import('@supabase/supabase-js');

    const predRows = [{ external_game_id: '6001', home_win_prob: 0.65 }];
    const scheduleRows = [
      { external_game_id: '6001', home_team_code: 'NYY', away_team_code: 'BOS', home_score: 5, away_score: 2, status: 'final' },
    ];

    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'predictions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ data: predRows, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === 'mlb_schedule') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: scheduleRows, error: null })),
              })),
            })),
          };
        }
        return {
          insert: vi.fn((row: Record<string, unknown>) => {
            insertedRows.push({ table, row });
            return Promise.resolve({ error: null });
          }),
        };
      }),
    } as unknown as ReturnType<typeof createClient>);

    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_walk_forward_measure', DATE, TRIGGERED_BY);

    expect(result.errors).toHaveLength(0);
    expect(result.rows_inserted).toBe(1);
    const call = insertedRows.find((c) => c.table === 'mlb_walk_forward_log');
    expect(call).toBeDefined();
    expect(call?.row).toMatchObject({
      date: DATE,
      league: 'mlb',
      scoring_rule: 'mlb_v0.1',
      brier_score: 0.24,
      sample_count: 1,
    });
    expect(insertedRows.some((c) => c.table === 'walk_forward_brier')).toBe(false);
  });

  it('mlb_elo_update — throw 없음, result shape 정상 (plan #25 Phase 2, cycle 2082)', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_elo_update', DATE, TRIGGERED_BY);
    assertResultShape(result, 'mlb_elo_update');
  });

  it('mlb_elo_update — mlb_schedule final 전체 재생 → mlb_team_elo upsert onConflict team_code,season (plan #25 Phase 2, cycle 2082)', async () => {
    const upsertCalls: Array<{ table: string; rows: unknown; onConflict: string }> = [];
    const { createClient } = await import('@supabase/supabase-js');

    type QueryBuilder = {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
    };
    const builder: QueryBuilder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn().mockResolvedValue({
        data: [
          { game_date: '2026-04-01', home_team_code: 'LAD', away_team_code: 'SF', home_score: 5, away_score: 2 },
        ],
        error: null,
      }),
      upsert: vi.fn((rows: unknown, opts: { onConflict: string }) => {
        upsertCalls.push({ table: 'mlb_team_elo', rows, onConflict: opts.onConflict });
        return Promise.resolve({ error: null });
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn(() => builder),
    } as unknown as ReturnType<typeof createClient>);

    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const result = await runMlbPipeline('mlb_elo_update', DATE, TRIGGERED_BY);

    expect(result.games_found).toBe(1);
    expect(result.rows_inserted).toBe(2); // LAD + SF
    expect(result.errors).toHaveLength(0);

    const call = upsertCalls.find((c) => c.table === 'mlb_team_elo');
    expect(call).toBeDefined();
    expect(call?.onConflict).toBe('team_code,season');
    const rows = call?.rows as Array<{ team_code: string; season: number; games_played: number }>;
    expect(rows.find((r) => r.team_code === 'LAD')?.season).toBe(2026);
    expect(rows.find((r) => r.team_code === 'LAD')?.games_played).toBe(1);
  });

  it('mlb_predict_final — predictions insert 모든 row predicted_winner=null (regression: cycle 1180 PHI integer cast fix)', async () => {
    // 회귀 가드: predicted_winner = INT REFERENCES teams(id) — KBO teams 만 row 보유.
    // MLB 팀 row 부재 → string team_code (PHI/BOS/NYY 등) insert 시 Postgres
    // "invalid input syntax for type integer" 전체 batch fail. 본 테스트는
    // insert payload 의 모든 row 가 predicted_winner=null 임을 명시 강제.
    const insertedRows: Array<Record<string, unknown>> = [];
    const { createClient } = await import('@supabase/supabase-js');

    type QueryBuilder = {
      select: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
    };
    const scheduleGames = [
      { external_game_id: '1001', home_team_code: 'PHI', away_team_code: 'BOS' },
      { external_game_id: '1002', home_team_code: 'NYY', away_team_code: 'LAD' },
    ];

    const builder: QueryBuilder = {
      select: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      insert: vi.fn((rows: unknown) => {
        if (Array.isArray(rows)) {
          insertedRows.push(...(rows as Array<Record<string, unknown>>));
        }
        return Promise.resolve({ error: null });
      }),
    };

    // mlb_schedule select → scheduleGames, predictions delete/insert → builder
    let mlbScheduleSelected = false;
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'mlb_schedule' && !mlbScheduleSelected) {
          mlbScheduleSelected = true;
          return {
            ...builder,
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: scheduleGames, error: null })),
              })),
            })),
          };
        }
        return builder;
      }),
    } as unknown as ReturnType<typeof createClient>);

    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    await runMlbPipeline('mlb_predict_final', DATE, TRIGGERED_BY);

    expect(insertedRows.length).toBe(2);
    for (const row of insertedRows) {
      expect(row.predicted_winner).toBeNull();
      expect(row.league).toBe('mlb');
      expect(row.scoring_rule).toBe('mlb_v0.1');
      // string team_code 가 predicted_winner 에 새지 않았는지 명시 강제
      expect(row.predicted_winner).not.toBe('PHI');
      expect(row.predicted_winner).not.toBe('BOS');
      expect(row.predicted_winner).not.toBe('NYY');
      expect(row.predicted_winner).not.toBe('LAD');
    }
  });

  it('mlb_predict_final — home_team_code 가 StatsAPI 컨벤션(TB/CWS/KC/SD/SF/AZ/WSH)일 때도 park_factor 실측값 사용 (regression: cycle 2081 사례 — MLB_TEAMS 는 Baseball-Reference 키(TBR/CHW/KCR/SDP/SFG/ARI/WSN)라 정규화 없이 조회 시 7팀 전부 undefined→neutral(1.0) silent fallback)', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const scheduleGames = [
      { external_game_id: '3001', home_team_code: 'TB', away_team_code: 'NYY' },
    ];

    const predictionsBuilder = {
      select: vi.fn(() => predictionsBuilder),
      delete: vi.fn(() => predictionsBuilder),
      eq: vi.fn(() => predictionsBuilder),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'mlb_schedule') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: scheduleGames, error: null })),
              })),
            })),
          };
        }
        if (table === 'mlb_team_stats') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          };
        }
        return predictionsBuilder;
      }),
    } as unknown as ReturnType<typeof createClient>);

    const { computeMlbProbability } = await import('../factors/mlb-base');
    (computeMlbProbability as unknown as ReturnType<typeof vi.fn>).mockClear();

    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    await runMlbPipeline('mlb_predict_final', DATE, TRIGGERED_BY);

    expect(computeMlbProbability).toHaveBeenCalledTimes(1);
    const callArgs = (computeMlbProbability as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      park_factor: number;
    };
    // TB → TBR (parkPf 95) 정규화 실패 시 fallback 1.0 (neutral) — 정규화 성공하면 0.95
    expect(callArgs.park_factor).toBe(0.95);
  });

  it('mlb_predict_final — 실측 팩터(fip/xfip/woba/war/xwoba/barrel_pct) breakdown 컬럼 영속화 (cycle 2065 fix — 사례 21: computeMlbProbability 입력으로만 쓰이고 저장 안 되던 값이 predictions.home_sp_fip 등에 전량 NULL 로 남아 factor-averages/composite-duel MLB 버전이 항상 빈 값)', async () => {
    const insertedRows: Array<Record<string, unknown>> = [];
    const { createClient } = await import('@supabase/supabase-js');

    const scheduleGames = [
      // PHI = mlb_team_stats row 보유, WSN = row 부재(스크래퍼 미커버) — 양쪽 케이스 검증
      { external_game_id: '2001', home_team_code: 'PHI', away_team_code: 'WSN' },
    ];
    const statsRows = [
      { team_code: 'PHI', woba: 0.335, fip: 3.55, xfip: 3.70, war: 30.2, xwoba: 0.340, barrel_pct: 9.8 },
    ];

    const predictionsBuilder = {
      select: vi.fn(() => predictionsBuilder),
      delete: vi.fn(() => predictionsBuilder),
      eq: vi.fn(() => predictionsBuilder),
      insert: vi.fn((rows: unknown) => {
        if (Array.isArray(rows)) insertedRows.push(...(rows as Array<Record<string, unknown>>));
        return Promise.resolve({ error: null });
      }),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'mlb_schedule') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: scheduleGames, error: null })),
              })),
            })),
          };
        }
        if (table === 'mlb_team_stats') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: statsRows, error: null })),
            })),
          };
        }
        return predictionsBuilder;
      }),
    } as unknown as ReturnType<typeof createClient>);

    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    await runMlbPipeline('mlb_predict_final', DATE, TRIGGERED_BY);

    expect(insertedRows.length).toBe(1);
    const row = insertedRows[0];
    // PHI (home) = 실측 statsRows 값 그대로 영속화
    expect(row.home_sp_fip).toBe(3.55);
    expect(row.home_sp_xfip).toBe(3.70);
    expect(row.home_lineup_woba).toBe(0.335);
    expect(row.home_bullpen_fip).toBe(3.55);
    expect(row.home_war_total).toBe(30.2);
    expect(row.home_lineup_xwoba).toBe(0.340);
    expect(row.home_lineup_barrel_pct).toBe(9.8);
    // WSN (away) = mlb_team_stats row 부재 → 가짜 default 대신 null (null-guard 자연 제외)
    expect(row.away_sp_fip).toBeNull();
    expect(row.away_sp_xfip).toBeNull();
    expect(row.away_lineup_woba).toBeNull();
    expect(row.away_bullpen_fip).toBeNull();
    expect(row.away_war_total).toBeNull();
    expect(row.away_lineup_xwoba).toBeNull();
    expect(row.away_lineup_barrel_pct).toBeNull();
  });

  it('mlb_predict_final — home_team_code 가 StatsAPI 컨벤션(WSH)이고 mlb_team_stats.team_code 는 canonical(WSN)일 때도 실측 팩터 매칭 (regression: cycle 2097 발견 — mlb_team_stats 는 canonical 컨벤션으로 저장돼(DB 실측) statsByTeam 조회를 정규화 없이 raw schedule 코드로 하면 TB/CWS/KC/SD/SF/AZ/WSH 7팀 전량 미스매치 → home_sp_fip 등 전량 NULL. DB 실측: predictions 전체 764건 중 home_sp_fip non-null 1건)', async () => {
    const insertedRows: Array<Record<string, unknown>> = [];
    const { createClient } = await import('@supabase/supabase-js');

    const scheduleGames = [
      { external_game_id: '4001', home_team_code: 'WSH', away_team_code: 'NYM' },
    ];
    // mlb_team_stats 는 canonical 키(WSN)로 저장됨 — schedule 은 StatsAPI 원본(WSH)
    const statsRows = [
      { team_code: 'WSN', woba: 0.310, fip: 3.90, xfip: 4.05, war: 12.4, xwoba: 0.300, barrel_pct: 7.1 },
    ];

    const predictionsBuilder = {
      select: vi.fn(() => predictionsBuilder),
      delete: vi.fn(() => predictionsBuilder),
      eq: vi.fn(() => predictionsBuilder),
      insert: vi.fn((rows: unknown) => {
        if (Array.isArray(rows)) insertedRows.push(...(rows as Array<Record<string, unknown>>));
        return Promise.resolve({ error: null });
      }),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'mlb_schedule') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: scheduleGames, error: null })),
              })),
            })),
          };
        }
        if (table === 'mlb_team_stats') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: statsRows, error: null })),
            })),
          };
        }
        return predictionsBuilder;
      }),
    } as unknown as ReturnType<typeof createClient>);

    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    await runMlbPipeline('mlb_predict_final', DATE, TRIGGERED_BY);

    expect(insertedRows.length).toBe(1);
    const row = insertedRows[0];
    // WSH(home) → WSN 정규화 성공 시 실측값 사용, 실패 시 전량 null 로 회귀
    expect(row.home_sp_fip).toBe(3.90);
    expect(row.home_sp_xfip).toBe(4.05);
    expect(row.home_lineup_woba).toBe(0.310);
    expect(row.home_bullpen_fip).toBe(3.90);
    expect(row.home_war_total).toBe(12.4);
    expect(row.home_lineup_xwoba).toBe(0.300);
    expect(row.home_lineup_barrel_pct).toBe(7.1);
  });

  it('mlb_predict_final — mlb_team_elo 실측 조회 → elo 계산 입력 + home_elo/away_elo 컬럼 영속화 (cycle 2349 fix — 사례: mlb_elo_update 가 매일 채워온 mlb_team_elo 를 predict_final 이 전혀 읽지 않고 항상 ELO_NEUTRAL 고정 입력해 10% 가중치 elo 팩터가 모든 MLB 예측에서 상시 no-op)', async () => {
    const insertedRows: Array<Record<string, unknown>> = [];
    const { createClient } = await import('@supabase/supabase-js');

    // NYY = mlb_team_elo row 보유, BOS = row 부재(시즌 첫 경기 등) — 양쪽 케이스 검증
    const scheduleGames = [
      { external_game_id: '5001', home_team_code: 'NYY', away_team_code: 'BOS' },
    ];
    const eloRows = [{ team_code: 'NYY', elo_rating: 1550.5 }];

    const predictionsBuilder = {
      select: vi.fn(() => predictionsBuilder),
      delete: vi.fn(() => predictionsBuilder),
      eq: vi.fn(() => predictionsBuilder),
      insert: vi.fn((rows: unknown) => {
        if (Array.isArray(rows)) insertedRows.push(...(rows as Array<Record<string, unknown>>));
        return Promise.resolve({ error: null });
      }),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'mlb_schedule') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: scheduleGames, error: null })),
              })),
            })),
          };
        }
        if (table === 'mlb_team_stats') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          };
        }
        if (table === 'mlb_team_elo') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: eloRows, error: null })),
            })),
          };
        }
        return predictionsBuilder;
      }),
    } as unknown as ReturnType<typeof createClient>);

    const { computeMlbProbability } = await import('../factors/mlb-base');
    (computeMlbProbability as unknown as ReturnType<typeof vi.fn>).mockClear();

    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    await runMlbPipeline('mlb_predict_final', DATE, TRIGGERED_BY);

    expect(computeMlbProbability).toHaveBeenCalledTimes(1);
    const callArgs = (computeMlbProbability as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      elo: { home: number; away: number };
    };
    // NYY(home) = 실측 elo_rating, BOS(away) = row 부재 → ELO_NEUTRAL(1500) fallback
    expect(callArgs.elo.home).toBe(1550.5);
    expect(callArgs.elo.away).toBe(1500);

    expect(insertedRows.length).toBe(1);
    const row = insertedRows[0];
    // 영속화도 계산 입력과 동일 원칙 — 실측 있으면 실측, 없으면 가짜 숫자 대신 null
    expect(row.home_elo).toBe(1550.5);
    expect(row.away_elo).toBeNull();
  });

  it('mlb_walk_forward_measure — predictions 쿼리 컬럼 mlb_game_date 사용 (silent drift family fix, cycle 1168)', async () => {
    const eqCalls: Array<[string, unknown]> = [];
    const fromCalls: string[] = [];
    const { createClient } = await import('@supabase/supabase-js');

    type QueryBuilder = {
      select: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      in: ReturnType<typeof vi.fn>;
    };
    const builder: QueryBuilder = {
      select: vi.fn(() => builder),
      insert: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn((col: string, val: unknown) => {
        eqCalls.push([col, val]);
        return builder;
      }),
      in: vi.fn(() => builder),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        fromCalls.push(table);
        return builder;
      }),
    } as unknown as ReturnType<typeof createClient>);

    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    await runMlbPipeline('mlb_walk_forward_measure', DATE, TRIGGERED_BY);

    expect(fromCalls).toContain('predictions');
    expect(eqCalls.some(([col]) => col === 'mlb_game_date')).toBe(true);
    expect(eqCalls.some(([col]) => col === 'game_date')).toBe(false);
  });

  it('unknown mode → throw Error', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    // @ts-expect-error intentional invalid mode
    await expect(runMlbPipeline('invalid_mode', DATE, TRIGGERED_BY)).rejects.toThrow(
      'unknown mode: invalid_mode',
    );
  });

  it('captureSilentDriftAlert 가 각 mode 완료 후 호출됨', async () => {
    const { runMlbPipeline } = await import('../pipeline/mlb-pipeline');
    const { captureSilentDriftAlert } = await import('../pipeline/silent-drift-alert');
    vi.clearAllMocks();

    await runMlbPipeline('mlb_statsapi_scrape', DATE, TRIGGERED_BY);
    expect(captureSilentDriftAlert).toHaveBeenCalledOnce();
    expect(captureSilentDriftAlert).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'mlb_statsapi_scrape', date: DATE }),
    );
  });
});
