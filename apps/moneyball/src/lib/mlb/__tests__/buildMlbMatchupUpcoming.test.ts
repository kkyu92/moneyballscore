import { afterEach, describe, expect, it, vi } from "vitest";
import { mlbCanonicalPair } from "../mlbCanonicalPair";

// review-code heavy (cycle 2474) — /mlb/matchup/[teamA]/[teamB] 에 KBO matchup 페이지 대응
// "다음 경기 예측" 섹션이 부재했던 feature parity gap 해소. predicted_winner/confidence
// 컬럼은 MLB 전량 NULL(buildMlbMatchupProfile.ts 동일 사유) — home_win_prob 로 직접 derive.

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

describe("buildMlbMatchupUpcoming", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("예정 경기 없으면 빈 배열", async () => {
    supabaseMock = makeSupabaseMock([]);
    const { buildMlbMatchupUpcoming } = await import("../buildMlbMatchupUpcoming");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    const result = await buildMlbMatchupUpcoming(pair);
    expect(result).toEqual([]);
  });

  it("예정 경기 + pre_game 예측 있음 → home_win_prob 기반 predictedWinnerCode derive", async () => {
    const schedule: ScheduleFixture[] = [
      {
        id: 5001,
        external_game_id: "5001",
        game_date: "2026-09-01",
        home_team_code: "NYY",
        away_team_code: "BOS",
      },
    ];
    const preds: PredFixture[] = [{ external_game_id: "5001", home_win_prob: 0.62 }];
    supabaseMock = makeSupabaseMock(schedule, preds);

    const { buildMlbMatchupUpcoming } = await import("../buildMlbMatchupUpcoming");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    const result = await buildMlbMatchupUpcoming(pair);

    expect(result).toHaveLength(1);
    expect(result[0].homeWinProb).toBe(0.62);
    expect(result[0].predictedWinnerCode).toBe("NYY");
    expect(result[0].confidence).toBeCloseTo(0.62);
  });

  it("예정 경기 있지만 pre_game 예측 부재 → predictedWinnerCode null (silent drop 대신 명시적 null)", async () => {
    const schedule: ScheduleFixture[] = [
      {
        id: 5002,
        external_game_id: "5002",
        game_date: "2026-09-02",
        home_team_code: "NYY",
        away_team_code: "BOS",
      },
    ];
    supabaseMock = makeSupabaseMock(schedule, []);

    const { buildMlbMatchupUpcoming } = await import("../buildMlbMatchupUpcoming");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    const result = await buildMlbMatchupUpcoming(pair);

    expect(result).toHaveLength(1);
    expect(result[0].homeWinProb).toBeNull();
    expect(result[0].predictedWinnerCode).toBeNull();
  });
});
