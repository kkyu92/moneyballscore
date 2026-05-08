import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalPair } from "../canonicalPair";

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

const HT_ID = 1;
const LG_ID = 2;

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
            { id: HT_ID, code: "HT" },
            { id: LG_ID, code: "LG" },
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

describe("buildMatchupProfile — pre_game prediction 누락 final 경기 record 카운트 회귀 가드", () => {
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
        id: 1001,
        game_date: "2026-04-15",
        status: "final",
        home_score: 5,
        away_score: 3,
        home_team_id: HT_ID,
        away_team_id: LG_ID,
        winner_team_id: HT_ID,
        home_team: { id: HT_ID, code: "HT" },
        away_team: { id: LG_ID, code: "LG" },
        winner: { code: "HT" },
        predictions: [],
      },
    ];
    supabaseMock = makeSupabaseMock(games);

    const { buildMatchupProfile } = await import("../buildMatchupProfile");
    const pair = canonicalPair("HT", "LG")!;
    const profile = await buildMatchupProfile(pair);

    const aIsHT = profile.teamA.code === "HT";
    const sideHT = aIsHT ? profile.sideStats.a : profile.sideStats.b;
    const sideLG = aIsHT ? profile.sideStats.b : profile.sideStats.a;

    expect(profile.finalGames).toBe(1);
    expect(sideHT.wins).toBe(1);
    expect(sideHT.homeWins).toBe(1);
    expect(sideLG.wins).toBe(0);
    expect(profile.predictionAccuracy.verified).toBe(0);
    expect(profile.games[0].predictedWinnerCode).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("pre_game prediction 부재 final 경기 1건"),
    );
  });

  it("final 경기 + pre_game prediction 있음 → wins + verified 모두 카운트", async () => {
    const games: GameFixture[] = [
      {
        id: 1002,
        game_date: "2026-04-16",
        status: "final",
        home_score: 5,
        away_score: 3,
        home_team_id: HT_ID,
        away_team_id: LG_ID,
        winner_team_id: HT_ID,
        home_team: { id: HT_ID, code: "HT" },
        away_team: { id: LG_ID, code: "LG" },
        winner: { code: "HT" },
        predictions: [
          {
            confidence: 0.6,
            is_correct: true,
            predicted_winner: HT_ID,
            predicted_winner_team: { code: "HT" },
            prediction_type: "pre_game",
          },
        ],
      },
    ];
    supabaseMock = makeSupabaseMock(games);

    const { buildMatchupProfile } = await import("../buildMatchupProfile");
    const pair = canonicalPair("HT", "LG")!;
    const profile = await buildMatchupProfile(pair);

    const aIsHT = profile.teamA.code === "HT";
    const sideHT = aIsHT ? profile.sideStats.a : profile.sideStats.b;

    expect(profile.finalGames).toBe(1);
    expect(sideHT.wins).toBe(1);
    expect(sideHT.predictedToWin).toBe(1);
    expect(sideHT.predictedToWinAndCorrect).toBe(1);
    expect(profile.predictionAccuracy.verified).toBe(1);
    expect(profile.predictionAccuracy.correct).toBe(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("post_game prediction 만 있는 final 경기 → pre_game 부재 취급 (record 카운트 진행, verified 0)", async () => {
    const games: GameFixture[] = [
      {
        id: 1003,
        game_date: "2026-04-17",
        status: "final",
        home_score: 2,
        away_score: 4,
        home_team_id: HT_ID,
        away_team_id: LG_ID,
        winner_team_id: LG_ID,
        home_team: { id: HT_ID, code: "HT" },
        away_team: { id: LG_ID, code: "LG" },
        winner: { code: "LG" },
        predictions: [
          {
            confidence: 0.7,
            is_correct: true,
            predicted_winner: LG_ID,
            predicted_winner_team: { code: "LG" },
            prediction_type: "post_game",
          },
        ],
      },
    ];
    supabaseMock = makeSupabaseMock(games);

    const { buildMatchupProfile } = await import("../buildMatchupProfile");
    const pair = canonicalPair("HT", "LG")!;
    const profile = await buildMatchupProfile(pair);

    const aIsHT = profile.teamA.code === "HT";
    const sideLG = aIsHT ? profile.sideStats.b : profile.sideStats.a;

    expect(profile.finalGames).toBe(1);
    expect(sideLG.wins).toBe(1);
    expect(sideLG.awayWins).toBe(1);
    expect(profile.predictionAccuracy.verified).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("pre_game prediction 부재 final 경기 1건"),
    );
  });

  it("scheduled 경기 + prediction 있음 → wins 카운트 X, predicted_to_win 카운트 OK", async () => {
    const games: GameFixture[] = [
      {
        id: 1004,
        game_date: "2026-05-10",
        status: "scheduled",
        home_score: null,
        away_score: null,
        home_team_id: HT_ID,
        away_team_id: LG_ID,
        winner_team_id: null,
        home_team: { id: HT_ID, code: "HT" },
        away_team: { id: LG_ID, code: "LG" },
        winner: null,
        predictions: [
          {
            confidence: 0.4,
            is_correct: null,
            predicted_winner: HT_ID,
            predicted_winner_team: { code: "HT" },
            prediction_type: "pre_game",
          },
        ],
      },
    ];
    supabaseMock = makeSupabaseMock(games);

    const { buildMatchupProfile } = await import("../buildMatchupProfile");
    const pair = canonicalPair("HT", "LG")!;
    const profile = await buildMatchupProfile(pair);

    const aIsHT = profile.teamA.code === "HT";
    const sideHT = aIsHT ? profile.sideStats.a : profile.sideStats.b;

    expect(profile.finalGames).toBe(0);
    expect(sideHT.wins).toBe(0);
    expect(sideHT.predictedToWin).toBe(1);
    expect(profile.predictionAccuracy.verified).toBe(0);
  });

  it("혼합 — final(prediction 있음) + final(prediction 없음) + scheduled → record 정확", async () => {
    const games: GameFixture[] = [
      {
        id: 2001,
        game_date: "2026-04-10",
        status: "final",
        home_score: 5,
        away_score: 3,
        home_team_id: HT_ID,
        away_team_id: LG_ID,
        winner_team_id: HT_ID,
        home_team: { id: HT_ID, code: "HT" },
        away_team: { id: LG_ID, code: "LG" },
        winner: { code: "HT" },
        predictions: [
          {
            confidence: 0.55,
            is_correct: true,
            predicted_winner: HT_ID,
            predicted_winner_team: { code: "HT" },
            prediction_type: "pre_game",
          },
        ],
      },
      {
        id: 2002,
        game_date: "2026-04-12",
        status: "final",
        home_score: 1,
        away_score: 6,
        home_team_id: LG_ID,
        away_team_id: HT_ID,
        winner_team_id: HT_ID,
        home_team: { id: LG_ID, code: "LG" },
        away_team: { id: HT_ID, code: "HT" },
        winner: { code: "HT" },
        predictions: [],
      },
      {
        id: 2003,
        game_date: "2026-05-15",
        status: "scheduled",
        home_score: null,
        away_score: null,
        home_team_id: HT_ID,
        away_team_id: LG_ID,
        winner_team_id: null,
        home_team: { id: HT_ID, code: "HT" },
        away_team: { id: LG_ID, code: "LG" },
        winner: null,
        predictions: [
          {
            confidence: 0.5,
            is_correct: null,
            predicted_winner: LG_ID,
            predicted_winner_team: { code: "LG" },
            prediction_type: "pre_game",
          },
        ],
      },
    ];
    supabaseMock = makeSupabaseMock(games);

    const { buildMatchupProfile } = await import("../buildMatchupProfile");
    const pair = canonicalPair("HT", "LG")!;
    const profile = await buildMatchupProfile(pair);

    const aIsHT = profile.teamA.code === "HT";
    const sideHT = aIsHT ? profile.sideStats.a : profile.sideStats.b;
    const sideLG = aIsHT ? profile.sideStats.b : profile.sideStats.a;

    expect(profile.totalGames).toBe(3);
    expect(profile.finalGames).toBe(2);
    expect(sideHT.wins).toBe(2); // record 정확 — prediction 없는 final 도 카운트
    expect(sideHT.homeWins).toBe(1);
    expect(sideHT.awayWins).toBe(1);
    expect(sideLG.wins).toBe(0);
    expect(sideLG.predictedToWin).toBe(1); // 미래 scheduled 경기
    expect(profile.predictionAccuracy.verified).toBe(1); // pre_game 있고 is_correct != null 인 1건
    expect(profile.predictionAccuracy.correct).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("pre_game prediction 부재 final 경기 1건"),
    );
  });
});

describe("buildMatchupProfile — cycle 147 silent drift family `.error` 미체크 회귀 가드", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("teams select error → assertSelectOk throw (silent 빈 프로필 fallback 차단)", async () => {
    supabaseMock = makeSupabaseMock([], {
      teamsError: { message: "connection refused" },
    });

    const { buildMatchupProfile } = await import("../buildMatchupProfile");
    const pair = canonicalPair("HT", "LG")!;
    await expect(buildMatchupProfile(pair)).rejects.toThrow(
      /buildMatchupProfile teams .* select failed: connection refused/,
    );
  });

  it("games select error → assertSelectOk throw (silent 빈 record 위장 차단)", async () => {
    supabaseMock = makeSupabaseMock([], {
      gamesError: { message: "syntax error at or near 'and'" },
    });

    const { buildMatchupProfile } = await import("../buildMatchupProfile");
    const pair = canonicalPair("HT", "LG")!;
    await expect(buildMatchupProfile(pair)).rejects.toThrow(
      /buildMatchupProfile games .* select failed: syntax error/,
    );
  });
});
