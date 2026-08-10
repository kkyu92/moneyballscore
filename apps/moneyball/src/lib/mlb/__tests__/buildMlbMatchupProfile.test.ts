import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mlbCanonicalPair } from "../mlbCanonicalPair";

type GameFixture = {
  id: number;
  game_date: string;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team_id: number;
  away_team_id: number;
  winner_team_id: number | null;
  home_team: { id: number; code: string };
  away_team: { id: number; code: string };
  winner: { code: string } | null;
  predictions: Array<{
    confidence: number | null;
    is_correct: boolean | null;
    predicted_winner: number | null;
    predicted_winner_team: { code: string } | null;
    prediction_type: string;
  }>;
};

const NYY_ID = 101;
const BOS_ID = 102;

interface SupabaseMockOptions {
  teamsError?: { message: string } | null;
  gamesError?: { message: string } | null;
}

function makeSupabaseMock(games: GameFixture[], opts: SupabaseMockOptions = {}) {
  const teamsBuilder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: opts.teamsError
        ? null
        : [
            { id: NYY_ID, code: "NYY" },
            { id: BOS_ID, code: "BOS" },
          ],
      error: opts.teamsError ?? null,
    }),
  };
  const gamesOrResult = {
    data: opts.gamesError ? null : games,
    error: opts.gamesError ?? null,
  };
  const gamesBuilder = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue(gamesOrResult),
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

describe("buildMlbMatchupProfile — pre_game prediction 누락 final 경기 record 카운트 회귀 가드", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("final 경기 + pre_game prediction 부재 → wins 카운트 진행 (silent drop X)", async () => {
    const games: GameFixture[] = [
      {
        id: 9001,
        game_date: "2026-04-15",
        status: "final",
        home_score: 5,
        away_score: 3,
        home_team_id: NYY_ID,
        away_team_id: BOS_ID,
        winner_team_id: NYY_ID,
        home_team: { id: NYY_ID, code: "NYY" },
        away_team: { id: BOS_ID, code: "BOS" },
        winner: { code: "NYY" },
        predictions: [],
      },
    ];
    supabaseMock = makeSupabaseMock(games);

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    const profile = await buildMlbMatchupProfile(pair);

    const aIsNYY = profile.teamA.code === "NYY";
    const sideNYY = aIsNYY ? profile.sideStats.a : profile.sideStats.b;
    const sideBOS = aIsNYY ? profile.sideStats.b : profile.sideStats.a;

    expect(profile.finalGames).toBe(1);
    expect(sideNYY.wins).toBe(1);
    expect(sideNYY.homeWins).toBe(1);
    expect(sideBOS.wins).toBe(0);
    expect(profile.predictionAccuracy.verified).toBe(0);
    expect(profile.games[0].predictedWinnerCode).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("pre_game prediction 부재 final 경기 1건"),
    );
  });

  it("final 경기 + pre_game prediction 있음 → wins + verified 모두 카운트", async () => {
    const games: GameFixture[] = [
      {
        id: 9002,
        game_date: "2026-04-16",
        status: "final",
        home_score: 5,
        away_score: 3,
        home_team_id: NYY_ID,
        away_team_id: BOS_ID,
        winner_team_id: NYY_ID,
        home_team: { id: NYY_ID, code: "NYY" },
        away_team: { id: BOS_ID, code: "BOS" },
        winner: { code: "NYY" },
        predictions: [
          {
            confidence: 0.6,
            is_correct: true,
            predicted_winner: NYY_ID,
            predicted_winner_team: { code: "NYY" },
            prediction_type: "pre_game",
          },
        ],
      },
    ];
    supabaseMock = makeSupabaseMock(games);

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    const profile = await buildMlbMatchupProfile(pair);

    const aIsNYY = profile.teamA.code === "NYY";
    const sideNYY = aIsNYY ? profile.sideStats.a : profile.sideStats.b;

    expect(profile.finalGames).toBe(1);
    expect(sideNYY.wins).toBe(1);
    expect(sideNYY.predictedToWin).toBe(1);
    expect(sideNYY.predictedToWinAndCorrect).toBe(1);
    expect(profile.predictionAccuracy.verified).toBe(1);
    expect(profile.predictionAccuracy.correct).toBe(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("혼합 — final(prediction 있음) + final(prediction 없음) + scheduled → record 정확", async () => {
    const games: GameFixture[] = [
      {
        id: 9101,
        game_date: "2026-04-10",
        status: "final",
        home_score: 5,
        away_score: 3,
        home_team_id: NYY_ID,
        away_team_id: BOS_ID,
        winner_team_id: NYY_ID,
        home_team: { id: NYY_ID, code: "NYY" },
        away_team: { id: BOS_ID, code: "BOS" },
        winner: { code: "NYY" },
        predictions: [
          {
            confidence: 0.55,
            is_correct: true,
            predicted_winner: NYY_ID,
            predicted_winner_team: { code: "NYY" },
            prediction_type: "pre_game",
          },
        ],
      },
      {
        id: 9102,
        game_date: "2026-04-12",
        status: "final",
        home_score: 1,
        away_score: 6,
        home_team_id: BOS_ID,
        away_team_id: NYY_ID,
        winner_team_id: NYY_ID,
        home_team: { id: BOS_ID, code: "BOS" },
        away_team: { id: NYY_ID, code: "NYY" },
        winner: { code: "NYY" },
        predictions: [],
      },
      {
        id: 9103,
        game_date: "2026-05-15",
        status: "scheduled",
        home_score: null,
        away_score: null,
        home_team_id: NYY_ID,
        away_team_id: BOS_ID,
        winner_team_id: null,
        home_team: { id: NYY_ID, code: "NYY" },
        away_team: { id: BOS_ID, code: "BOS" },
        winner: null,
        predictions: [
          {
            confidence: 0.5,
            is_correct: null,
            predicted_winner: BOS_ID,
            predicted_winner_team: { code: "BOS" },
            prediction_type: "pre_game",
          },
        ],
      },
    ];
    supabaseMock = makeSupabaseMock(games);

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    const profile = await buildMlbMatchupProfile(pair);

    const aIsNYY = profile.teamA.code === "NYY";
    const sideNYY = aIsNYY ? profile.sideStats.a : profile.sideStats.b;
    const sideBOS = aIsNYY ? profile.sideStats.b : profile.sideStats.a;

    expect(profile.totalGames).toBe(3);
    expect(profile.finalGames).toBe(2);
    expect(sideNYY.wins).toBe(2);
    expect(sideNYY.homeWins).toBe(1);
    expect(sideNYY.awayWins).toBe(1);
    expect(sideBOS.wins).toBe(0);
    expect(sideBOS.predictedToWin).toBe(1);
    expect(profile.predictionAccuracy.verified).toBe(1);
    expect(profile.predictionAccuracy.correct).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("pre_game prediction 부재 final 경기 1건"),
    );
  });
});

describe("buildMlbMatchupProfile — silent drift family `.error` 미체크 회귀 가드", () => {
  it("teams select error → assertSelectOk throw (silent 빈 프로필 fallback 차단)", async () => {
    supabaseMock = makeSupabaseMock([], {
      teamsError: { message: "connection refused" },
    });

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    await expect(buildMlbMatchupProfile(pair)).rejects.toThrow(
      /buildMlbMatchupProfile teams .* select failed: connection refused/,
    );
  });

  it("games select error → assertSelectOk throw (silent 빈 record 위장 차단)", async () => {
    supabaseMock = makeSupabaseMock([], {
      gamesError: { message: "syntax error at or near 'and'" },
    });

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    await expect(buildMlbMatchupProfile(pair)).rejects.toThrow(
      /buildMlbMatchupProfile games .* select failed: syntax error/,
    );
  });
});

describe("buildMlbMatchupProfile — teams row 없음 → 빈 프로필 (throw X)", () => {
  it("teams row 0건 → 빈 프로필 반환", async () => {
    supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "teams") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      }),
    };

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    const profile = await buildMlbMatchupProfile(pair);

    expect(profile.totalGames).toBe(0);
    expect(profile.finalGames).toBe(0);
    expect(profile.games).toEqual([]);
    expect(profile.streak).toBeNull();
  });
});
