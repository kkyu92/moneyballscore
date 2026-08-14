import { afterEach, describe, expect, it, vi } from "vitest";

// cycle 2066 fix (사례 22 후속) — `teams`/`games` FK 는 MLB row 가 0건이라 이 빌더가
// 항상 EMPTY_MLB_FACTOR_AVERAGES 만 반환하던 버그를 `mlb_schedule`+`predictions`
// (external_game_id) 직접 조회로 교체. 본 테스트도 새 쿼리 shape 에 맞춰 재작성.

interface SupabaseMockOptions {
  scheduleError?: { message: string } | null;
  predsError?: { message: string } | null;
  schedule?: unknown[];
  preds?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const scheduleBuilder = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockResolvedValue({
      data: opts.scheduleError ? null : (opts.schedule ?? []),
      error: opts.scheduleError ?? null,
    }),
  };
  const predsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve({
        data: opts.predsError ? null : (opts.preds ?? []),
        error: opts.predsError ?? null,
      }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "mlb_schedule") return scheduleBuilder;
      if (table === "predictions") return predsBuilder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

describe("buildMlbTeamFactorAverages", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("mlb_schedule select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      scheduleError: { message: "connection refused" },
    });

    const { buildMlbTeamFactorAverages } = await import("../buildMlbTeamFactorAverages");
    await expect(buildMlbTeamFactorAverages("NYY")).rejects.toThrow(
      /buildMlbTeamFactorAverages mlb_schedule .* select failed: connection refused/,
    );
  });

  it("predictions select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          external_game_id: "700001",
          home_team_code: "NYY",
          away_team_code: "BOS",
        },
      ],
      predsError: { message: "syntax error" },
    });

    const { buildMlbTeamFactorAverages } = await import("../buildMlbTeamFactorAverages");
    await expect(buildMlbTeamFactorAverages("NYY")).rejects.toThrow(
      /buildMlbTeamFactorAverages predictions .* select failed: syntax error/,
    );
  });

  it("mlb_schedule 빈 rows → EMPTY_MLB_FACTOR_AVERAGES", async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });

    const { buildMlbTeamFactorAverages } = await import("../buildMlbTeamFactorAverages");
    const avg = await buildMlbTeamFactorAverages("NYY");
    expect(avg.spFip).toBeNull();
    expect(avg.sampleN).toBe(0);
  });

  it("정상 — 홈/원정 팀별 7팩터 평균 (홈 1경기 + 원정 1경기)", async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        { external_game_id: "700001", home_team_code: "NYY", away_team_code: "BOS" },
        { external_game_id: "700002", home_team_code: "BOS", away_team_code: "NYY" },
      ],
      preds: [
        // NYY 홈
        {
          external_game_id: "700001",
          home_sp_fip: 3.0,
          away_sp_fip: 5.0,
          home_lineup_woba: 0.35,
          away_lineup_woba: 0.3,
          home_bullpen_fip: 4.0,
          away_bullpen_fip: 4.5,
          home_recent_form: 0.7,
          away_recent_form: 0.4,
          home_elo: 1550,
          away_elo: 1480,
          home_lineup_xwoba: 0.34,
          away_lineup_xwoba: 0.31,
          home_lineup_barrel_pct: 9.5,
          away_lineup_barrel_pct: 7.0,
          prediction_type: "pre_game",
        },
        // NYY 원정
        {
          external_game_id: "700002",
          home_sp_fip: 4.0,
          away_sp_fip: 3.5,
          home_lineup_woba: 0.31,
          away_lineup_woba: 0.34,
          home_bullpen_fip: 4.2,
          away_bullpen_fip: 3.8,
          home_recent_form: 0.5,
          away_recent_form: 0.6,
          home_elo: 1500,
          away_elo: 1530,
          home_lineup_xwoba: 0.32,
          away_lineup_xwoba: 0.33,
          home_lineup_barrel_pct: 8.0,
          away_lineup_barrel_pct: 10.5,
          prediction_type: "pre_game",
        },
      ],
    });

    const { buildMlbTeamFactorAverages } = await import("../buildMlbTeamFactorAverages");
    const avg = await buildMlbTeamFactorAverages("NYY");

    expect(avg.sampleN).toBe(2);
    expect(avg.spFip).toBeCloseTo(3.25, 5); // home 3.0, away 3.5
    expect(avg.lineupWoba).toBeCloseTo(0.345, 5); // home 0.35, away 0.34
    expect(avg.bullpenFip).toBeCloseTo(3.9, 5); // home 4.0, away 3.8
    expect(avg.recentForm).toBeCloseTo(0.65, 5); // home 0.7, away 0.6
    expect(avg.elo).toBeCloseTo(1540, 5); // home 1550, away 1530
    expect(avg.lineupXwoba).toBeCloseTo(0.335, 5); // home 0.34, away 0.33
    expect(avg.lineupBarrelPct).toBeCloseTo(10.0, 5); // home 9.5, away 10.5
  });

  it("null 팩터 값 — sampleN 은 카운트하되 평균 계산엔 제외", async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: "700001", home_team_code: "NYY", away_team_code: "BOS" }],
      preds: [
        {
          external_game_id: "700001",
          home_sp_fip: 3.0,
          away_sp_fip: 5.0,
          home_lineup_woba: null,
          away_lineup_woba: null,
          home_bullpen_fip: null,
          away_bullpen_fip: null,
          home_recent_form: null,
          away_recent_form: null,
          home_elo: 1500,
          away_elo: null,
          home_lineup_xwoba: null,
          away_lineup_xwoba: null,
          home_lineup_barrel_pct: null,
          away_lineup_barrel_pct: null,
          prediction_type: "pre_game",
        },
      ],
    });

    const { buildMlbTeamFactorAverages } = await import("../buildMlbTeamFactorAverages");
    const avg = await buildMlbTeamFactorAverages("NYY");

    expect(avg.sampleN).toBe(1);
    expect(avg.spFip).toBe(3.0);
    expect(avg.lineupWoba).toBeNull();
    expect(avg.bullpenFip).toBeNull();
    expect(avg.recentForm).toBeNull();
    expect(avg.elo).toBe(1500);
    expect(avg.lineupXwoba).toBeNull();
    expect(avg.lineupBarrelPct).toBeNull();
  });

  // cycle 2081 fix-incident (heavy) — mlb_schedule 은 StatsAPI 컨벤션(TB/CWS/KC/SD/SF/AZ/WSH)
  // 저장, teamCode 인자는 canonical(Baseball-Reference, 예: TBR). 정규화 없이 그대로 필터링하면
  // 이 7팀은 항상 0건 매칭 → EMPTY_MLB_FACTOR_AVERAGES silent 반환.
  it("teamCode=TBR(StatsAPI 컨벤션 TB) → DB 쿼리 필터가 TB 사용 + 팩터 평균 정상 계산 (regression: cycle 2081)", async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [{ external_game_id: "700001", home_team_code: "TB", away_team_code: "BOS" }],
      preds: [
        {
          external_game_id: "700001",
          home_sp_fip: 3.2,
          away_sp_fip: 4.4,
          home_lineup_woba: 0.33,
          away_lineup_woba: 0.31,
          home_bullpen_fip: 3.6,
          away_bullpen_fip: 4.1,
          home_recent_form: 0.55,
          away_recent_form: 0.45,
          home_elo: 1510,
          away_elo: 1470,
          home_lineup_xwoba: 0.32,
          away_lineup_xwoba: 0.30,
          home_lineup_barrel_pct: 8.8,
          away_lineup_barrel_pct: 7.5,
          prediction_type: "pre_game",
        },
      ],
    });

    const { buildMlbTeamFactorAverages } = await import("../buildMlbTeamFactorAverages");
    const avg = await buildMlbTeamFactorAverages("TBR");

    // DB 쿼리 필터는 StatsAPI 코드(TB)로 나가야 함 — canonical(TBR) 그대로면 항상 0건 매칭.
    const scheduleFrom = supabaseMock.from("mlb_schedule") as unknown as { or: ReturnType<typeof vi.fn> };
    expect(scheduleFrom.or).toHaveBeenCalledWith("home_team_code.eq.TB,away_team_code.eq.TB");

    // TB(home) === dbTeamCode(TB) 정상 매칭 → home 관점 팩터 사용.
    expect(avg.sampleN).toBe(1);
    expect(avg.spFip).toBe(3.2);
    expect(avg.lineupWoba).toBe(0.33);
  });
});
