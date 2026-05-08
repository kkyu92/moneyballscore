import { afterEach, describe, expect, it, vi } from "vitest";

const HT_ID = 1;
const LG_ID = 2;

interface GameMock {
  status: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  winner_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
}

interface SupabaseMockOptions {
  teamsError?: { message: string } | null;
  gamesError?: { message: string } | null;
  teamRow?: { id: number } | null;
  games?: GameMock[];
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
  const gamesBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: opts.gamesError ? null : (opts.games ?? []),
      error: opts.gamesError ?? null,
    }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "teams") return teamsBuilder;
      if (table === "games") return gamesBuilder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

describe("buildTeamRecentForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("teams select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      teamsError: { message: "connection refused" },
    });
    const { buildTeamRecentForm } = await import("../buildTeamRecentForm");
    await expect(buildTeamRecentForm("HT")).rejects.toThrow(
      /buildTeamRecentForm teams .* select failed: connection refused/,
    );
  });

  it("games select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      gamesError: { message: "syntax error" },
    });
    const { buildTeamRecentForm } = await import("../buildTeamRecentForm");
    await expect(buildTeamRecentForm("HT")).rejects.toThrow(
      /buildTeamRecentForm games .* select failed: syntax error/,
    );
  });

  it("teams 빈 row → EMPTY_RECENT_FORM", async () => {
    supabaseMock = makeSupabaseMock({ teamRow: null });
    const { buildTeamRecentForm } = await import("../buildTeamRecentForm");
    const form = await buildTeamRecentForm("HT");
    expect(form.results).toEqual([]);
    expect(form.totalGames).toBe(0);
    expect(form.winRate).toBeNull();
  });

  it("정상 — 홈 승 + 원정 승 + 홈 패 → W/W/L 시퀀스 + 승률 0.667", async () => {
    supabaseMock = makeSupabaseMock({
      games: [
        // newest first
        { status: "final", home_team_id: HT_ID, away_team_id: LG_ID, winner_team_id: HT_ID, home_score: 5, away_score: 2 },
        { status: "final", home_team_id: LG_ID, away_team_id: HT_ID, winner_team_id: HT_ID, home_score: 1, away_score: 3 },
        { status: "final", home_team_id: HT_ID, away_team_id: LG_ID, winner_team_id: LG_ID, home_score: 2, away_score: 4 },
      ],
    });
    const { buildTeamRecentForm } = await import("../buildTeamRecentForm");
    const form = await buildTeamRecentForm("HT");
    expect(form.results).toEqual(["W", "W", "L"]);
    expect(form.wins).toBe(2);
    expect(form.losses).toBe(1);
    expect(form.ties).toBe(0);
    expect(form.totalGames).toBe(3);
    expect(form.winRate).toBeCloseTo(2 / 3, 3);
  });

  it("무승부 — winner_team_id null + 동점 스코어 → T", async () => {
    supabaseMock = makeSupabaseMock({
      games: [
        { status: "final", home_team_id: HT_ID, away_team_id: LG_ID, winner_team_id: HT_ID, home_score: 5, away_score: 2 },
        { status: "final", home_team_id: LG_ID, away_team_id: HT_ID, winner_team_id: null, home_score: 3, away_score: 3 },
      ],
    });
    const { buildTeamRecentForm } = await import("../buildTeamRecentForm");
    const form = await buildTeamRecentForm("HT");
    expect(form.results).toEqual(["W", "T"]);
    expect(form.wins).toBe(1);
    expect(form.losses).toBe(0);
    expect(form.ties).toBe(1);
    expect(form.winRate).toBe(1); // 1W / (1W+0L) = 1.0, 무승부 제외
  });

  it("winner_team_id null + 동점 스코어 아님 → 결과 skip (silent drift 아님, 미확정 처리)", async () => {
    supabaseMock = makeSupabaseMock({
      games: [
        { status: "final", home_team_id: HT_ID, away_team_id: LG_ID, winner_team_id: HT_ID, home_score: 5, away_score: 2 },
        { status: "final", home_team_id: LG_ID, away_team_id: HT_ID, winner_team_id: null, home_score: 3, away_score: 5 },
      ],
    });
    const { buildTeamRecentForm } = await import("../buildTeamRecentForm");
    const form = await buildTeamRecentForm("HT");
    expect(form.results).toEqual(["W"]);
    expect(form.totalGames).toBe(1);
  });
});
