import { afterEach, describe, expect, it, vi } from "vitest";

const NYY_ID = 1;

interface SupabaseMockOptions {
  teamsError?: { message: string } | null;
  predsError?: { message: string } | null;
  teamRow?: { id: number } | null;
  preds?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const teamsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.teamsError ? null : (opts.teamRow ?? { id: NYY_ID }),
      error: opts.teamsError ?? null,
    }),
  };
  const predsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockResolvedValue({
      data: opts.predsError ? null : (opts.preds ?? []),
      error: opts.predsError ?? null,
    }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "teams") return teamsBuilder;
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

  it("teams select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      teamsError: { message: "connection refused" },
    });

    const { buildMlbTeamFactorAverages } = await import("../buildMlbTeamFactorAverages");
    await expect(buildMlbTeamFactorAverages("NYY")).rejects.toThrow(
      /buildMlbTeamFactorAverages teams .* select failed: connection refused/,
    );
  });

  it("predictions select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      predsError: { message: "syntax error" },
    });

    const { buildMlbTeamFactorAverages } = await import("../buildMlbTeamFactorAverages");
    await expect(buildMlbTeamFactorAverages("NYY")).rejects.toThrow(
      /buildMlbTeamFactorAverages predictions .* select failed: syntax error/,
    );
  });

  it("teams 빈 row → EMPTY_MLB_FACTOR_AVERAGES", async () => {
    supabaseMock = makeSupabaseMock({ teamRow: null });

    const { buildMlbTeamFactorAverages } = await import("../buildMlbTeamFactorAverages");
    const avg = await buildMlbTeamFactorAverages("NYY");
    expect(avg.spFip).toBeNull();
    expect(avg.sampleN).toBe(0);
  });

  it("정상 — 홈/원정 팀별 7팩터 평균 (홈 1경기 + 원정 1경기)", async () => {
    supabaseMock = makeSupabaseMock({
      teamRow: { id: NYY_ID },
      preds: [
        // NYY 홈
        {
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
          game: { home_team_id: NYY_ID, away_team_id: 99 },
        },
        // NYY 원정
        {
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
          game: { home_team_id: 99, away_team_id: NYY_ID },
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
      teamRow: { id: NYY_ID },
      preds: [
        {
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
          game: { home_team_id: NYY_ID, away_team_id: 99 },
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
});
