import { afterEach, describe, expect, it, vi } from "vitest";

const HT_ID = 1;

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
      data: opts.teamsError ? null : (opts.teamRow ?? { id: HT_ID }),
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

describe("buildTeamFactorAverages", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("teams select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      teamsError: { message: "connection refused" },
    });

    const { buildTeamFactorAverages } = await import("../buildTeamFactorAverages");
    await expect(buildTeamFactorAverages("HT")).rejects.toThrow(
      /buildTeamFactorAverages teams .* select failed: connection refused/,
    );
  });

  it("predictions select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      predsError: { message: "syntax error" },
    });

    const { buildTeamFactorAverages } = await import("../buildTeamFactorAverages");
    await expect(buildTeamFactorAverages("HT")).rejects.toThrow(
      /buildTeamFactorAverages predictions .* select failed: syntax error/,
    );
  });

  it("teams 빈 row → EMPTY_FACTOR_AVERAGES", async () => {
    supabaseMock = makeSupabaseMock({ teamRow: null });

    const { buildTeamFactorAverages } = await import("../buildTeamFactorAverages");
    const avg = await buildTeamFactorAverages("HT");
    expect(avg.spFip).toBeNull();
    expect(avg.sampleN).toBe(0);
  });

  it("정상 — 홈/원정 팀별 팩터 평균 (홈 1경기 + 원정 1경기)", async () => {
    supabaseMock = makeSupabaseMock({
      teamRow: { id: HT_ID },
      preds: [
        // HT 홈
        {
          home_sp_fip: 3.0,
          away_sp_fip: 5.0,
          home_lineup_woba: 0.350,
          away_lineup_woba: 0.300,
          home_bullpen_fip: 4.0,
          away_bullpen_fip: 4.5,
          home_recent_form: 0.7,
          away_recent_form: 0.4,
          home_elo: 1550,
          away_elo: 1480,
          prediction_type: "pre_game",
          game: { home_team_id: HT_ID, away_team_id: 99 },
        },
        // HT 원정
        {
          home_sp_fip: 4.0,
          away_sp_fip: 3.5,
          home_lineup_woba: 0.310,
          away_lineup_woba: 0.340,
          home_bullpen_fip: 4.2,
          away_bullpen_fip: 3.8,
          home_recent_form: 0.5,
          away_recent_form: 0.6,
          home_elo: 1500,
          away_elo: 1530,
          prediction_type: "pre_game",
          game: { home_team_id: 99, away_team_id: HT_ID },
        },
      ],
    });

    const { buildTeamFactorAverages } = await import("../buildTeamFactorAverages");
    const avg = await buildTeamFactorAverages("HT");

    expect(avg.sampleN).toBe(2);
    // home: 3.0, away: 3.5 → avg 3.25
    expect(avg.spFip).toBeCloseTo(3.25, 5);
    // home: 0.350, away: 0.340 → avg 0.345
    expect(avg.lineupWoba).toBeCloseTo(0.345, 5);
    expect(avg.bullpenFip).toBeCloseTo(3.9, 5); // 4.0+3.8 / 2
    expect(avg.recentForm).toBeCloseTo(0.65, 5); // 0.7+0.6 / 2
    expect(avg.elo).toBeCloseTo(1540, 5); // 1550+1530 / 2
  });

  it("null 팩터 값 — sampleN 은 카운트하되 평균 계산엔 제외", async () => {
    supabaseMock = makeSupabaseMock({
      teamRow: { id: HT_ID },
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
          prediction_type: "pre_game",
          game: { home_team_id: HT_ID, away_team_id: 99 },
        },
      ],
    });

    const { buildTeamFactorAverages } = await import("../buildTeamFactorAverages");
    const avg = await buildTeamFactorAverages("HT");

    expect(avg.sampleN).toBe(1);
    expect(avg.spFip).toBe(3.0);
    expect(avg.lineupWoba).toBeNull();
    expect(avg.bullpenFip).toBeNull();
    expect(avg.recentForm).toBeNull();
    expect(avg.elo).toBe(1500);
  });
});
