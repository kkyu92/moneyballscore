import { afterEach, describe, expect, it, vi } from "vitest";

// review-code heavy (cycle 2475) — /mlb/team/[code] 에 KBO teams/[code] 페이지 대응
// "예정 경기 · 예측" 섹션이 부재했던 feature parity gap 해소 (cycle 2474 matchup 페이지
// 동일 gap 해소와 같은 family). predicted_winner 컬럼은 MLB 전량 NULL —
// home_win_prob 로 직접 derive.

type ScheduleFixture = {
  id: number;
  external_game_id: string;
  game_date: string;
  home_team_code: string;
  away_team_code: string;
};

type PredFixture = {
  external_game_id: string;
  home_win_prob: number | null;
};

function makeSupabaseMock(schedule: ScheduleFixture[], preds: PredFixture[] = []) {
  const scheduleBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: schedule, error: null }),
  };
  const predsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve({ data: preds, error: null }),
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

describe("buildMlbTeamUpcoming", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("예정 경기 없으면 빈 배열", async () => {
    supabaseMock = makeSupabaseMock([]);
    const { buildMlbTeamUpcoming } = await import("../buildMlbTeamUpcoming");
    const result = await buildMlbTeamUpcoming("NYY");
    expect(result).toEqual([]);
  });

  it("예정 경기 + pre_game 예측 있음(홈) → predictedAsWinner true", async () => {
    const schedule: ScheduleFixture[] = [
      {
        id: 6001,
        external_game_id: "6001",
        game_date: "2026-09-01",
        home_team_code: "NYY",
        away_team_code: "BOS",
      },
    ];
    const preds: PredFixture[] = [{ external_game_id: "6001", home_win_prob: 0.62 }];
    supabaseMock = makeSupabaseMock(schedule, preds);

    const { buildMlbTeamUpcoming } = await import("../buildMlbTeamUpcoming");
    const result = await buildMlbTeamUpcoming("NYY");

    expect(result).toHaveLength(1);
    expect(result[0].isHome).toBe(true);
    expect(result[0].opponentCode).toBe("BOS");
    expect(result[0].homeWinProb).toBe(0.62);
    expect(result[0].predictedAsWinner).toBe(true);
    expect(result[0].confidence).toBeCloseTo(0.62);
  });

  it("예정 경기 + pre_game 예측 있음(원정) → predictedAsWinner 홈팀 기준 반전", async () => {
    const schedule: ScheduleFixture[] = [
      {
        id: 6002,
        external_game_id: "6002",
        game_date: "2026-09-02",
        home_team_code: "NYY",
        away_team_code: "BOS",
      },
    ];
    const preds: PredFixture[] = [{ external_game_id: "6002", home_win_prob: 0.62 }];
    supabaseMock = makeSupabaseMock(schedule, preds);

    const { buildMlbTeamUpcoming } = await import("../buildMlbTeamUpcoming");
    const result = await buildMlbTeamUpcoming("BOS");

    expect(result).toHaveLength(1);
    expect(result[0].isHome).toBe(false);
    expect(result[0].opponentCode).toBe("NYY");
    expect(result[0].predictedAsWinner).toBe(false);
  });

  it("예정 경기 있지만 pre_game 예측 부재 → predictedAsWinner false, homeWinProb null (silent drop 대신 명시적 fallback)", async () => {
    const schedule: ScheduleFixture[] = [
      {
        id: 6003,
        external_game_id: "6003",
        game_date: "2026-09-03",
        home_team_code: "NYY",
        away_team_code: "BOS",
      },
    ];
    supabaseMock = makeSupabaseMock(schedule, []);

    const { buildMlbTeamUpcoming } = await import("../buildMlbTeamUpcoming");
    const result = await buildMlbTeamUpcoming("NYY");

    expect(result).toHaveLength(1);
    expect(result[0].homeWinProb).toBeNull();
    expect(result[0].predictedAsWinner).toBe(false);
  });
});
