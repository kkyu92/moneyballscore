import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mlbCanonicalPair } from "../mlbCanonicalPair";

// cycle 2066 fix (사례 22 후속) — `teams`/`games` FK 는 MLB row 가 0건이라 이 빌더가
// 항상 빈 프로필만 반환하던 버그를 `mlb_schedule`+`predictions`(external_game_id) 직접
// 조회로 교체. 본 테스트도 새 쿼리 shape 에 맞춰 재작성 — `predicted_winner`/`is_correct`
// 컬럼이 아니라 `home_win_prob` + 실제 스코어에서 derive 되는 걸 검증.

type ScheduleFixture = {
  id: number;
  external_game_id: string;
  game_date: string;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team_code: string;
  away_team_code: string;
};

type PredFixture = {
  external_game_id: string;
  home_win_prob: number | null;
  prediction_type: string;
};

interface SupabaseMockOptions {
  scheduleError?: { message: string } | null;
  predsError?: { message: string } | null;
}

function makeSupabaseMock(
  schedule: ScheduleFixture[],
  preds: PredFixture[] = [],
  opts: SupabaseMockOptions = {},
) {
  const scheduleOrResult = {
    data: opts.scheduleError ? null : schedule,
    error: opts.scheduleError ?? null,
  };
  const scheduleBuilder = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue(scheduleOrResult),
    }),
  };
  const predsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve({
        data: opts.predsError ? null : preds,
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
    const schedule: ScheduleFixture[] = [
      {
        id: 9001,
        external_game_id: "9001",
        game_date: "2026-04-15",
        status: "final",
        home_score: 5,
        away_score: 3,
        home_team_code: "NYY",
        away_team_code: "BOS",
      },
    ];
    supabaseMock = makeSupabaseMock(schedule, []);

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
    const schedule: ScheduleFixture[] = [
      {
        id: 9002,
        external_game_id: "9002",
        game_date: "2026-04-16",
        status: "final",
        home_score: 5,
        away_score: 3,
        home_team_code: "NYY",
        away_team_code: "BOS",
      },
    ];
    const preds: PredFixture[] = [
      { external_game_id: "9002", home_win_prob: 0.6, prediction_type: "pre_game" },
    ];
    supabaseMock = makeSupabaseMock(schedule, preds);

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
    const schedule: ScheduleFixture[] = [
      {
        id: 9101,
        external_game_id: "9101",
        game_date: "2026-04-10",
        status: "final",
        home_score: 5,
        away_score: 3,
        home_team_code: "NYY",
        away_team_code: "BOS",
      },
      {
        id: 9102,
        external_game_id: "9102",
        game_date: "2026-04-12",
        status: "final",
        home_score: 1,
        away_score: 6,
        home_team_code: "BOS",
        away_team_code: "NYY",
      },
      {
        id: 9103,
        external_game_id: "9103",
        game_date: "2026-05-15",
        status: "scheduled",
        home_score: null,
        away_score: null,
        home_team_code: "NYY",
        away_team_code: "BOS",
      },
    ];
    const preds: PredFixture[] = [
      // game 9101 — NYY(홈) 예측 승 → 실제도 NYY 승 → correct
      { external_game_id: "9101", home_win_prob: 0.55, prediction_type: "pre_game" },
      // game 9102 — prediction 없음 (missingPredictionFinalCount 대상)
      // game 9103 — BOS(원정) 예측 승 (scheduled, 아직 결과 없음 → is_correct=null)
      { external_game_id: "9103", home_win_prob: 0.45, prediction_type: "pre_game" },
    ];
    supabaseMock = makeSupabaseMock(schedule, preds);

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    const profile = await buildMlbMatchupProfile(pair);

    const aIsNYY = profile.teamA.code === "NYY";
    const sideNYY = aIsNYY ? profile.sideStats.a : profile.sideStats.b;
    const sideBOS = aIsNYY ? profile.sideStats.b : profile.sideStats.a;

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
  it("mlb_schedule select error → assertSelectOk throw (silent 빈 프로필 fallback 차단)", async () => {
    supabaseMock = makeSupabaseMock([], [], {
      scheduleError: { message: "connection refused" },
    });

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    await expect(buildMlbMatchupProfile(pair)).rejects.toThrow(
      /buildMlbMatchupProfile mlb_schedule .* select failed: connection refused/,
    );
  });

  it("predictions select error → assertSelectOk throw (silent 빈 record 위장 차단)", async () => {
    const schedule: ScheduleFixture[] = [
      {
        id: 9201,
        external_game_id: "9201",
        game_date: "2026-04-15",
        status: "final",
        home_score: 5,
        away_score: 3,
        home_team_code: "NYY",
        away_team_code: "BOS",
      },
    ];
    supabaseMock = makeSupabaseMock(schedule, [], {
      predsError: { message: "syntax error at or near 'and'" },
    });

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    await expect(buildMlbMatchupProfile(pair)).rejects.toThrow(
      /buildMlbMatchupProfile predictions .* select failed: syntax error/,
    );
  });
});

describe("buildMlbMatchupProfile — mlb_schedule row 없음 → 빈 프로필 (throw X)", () => {
  it("mlb_schedule row 0건 → 빈 프로필 반환", async () => {
    supabaseMock = makeSupabaseMock([], []);

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "BOS")!;
    const profile = await buildMlbMatchupProfile(pair);

    expect(profile.finalGames).toBe(0);
    expect(profile.games).toEqual([]);
    expect(profile.streak).toBeNull();
  });
});

// cycle 2081 fix-incident (heavy) — mlb_schedule 은 StatsAPI 컨벤션(TB/CWS/KC/SD/SF/AZ/WSH) 저장,
// pair.codeA/codeB(URL 파생)는 Baseball-Reference 표준(TBR 등). 정규화 없이 canonical 코드로
// 그대로 `.or(home_team_code.eq.TBR,...)` 필터링하면 DB 실측과 항상 불일치 — 이 7팀이 낀
// 모든 매치업 페이지(/mlb/matchup/*)가 항상 "0경기"만 보여주던 silent 버그.
describe("buildMlbMatchupProfile — StatsAPI 컨벤션 팀 코드 정규화 (regression: cycle 2081)", () => {
  it("pair 에 TBR 포함 시 DB 쿼리 필터는 StatsAPI 코드(TB) 사용 + 경기/승패 정상 집계", async () => {
    const schedule: ScheduleFixture[] = [
      {
        id: 9301,
        external_game_id: "9301",
        game_date: "2026-04-20",
        status: "final",
        home_score: 4,
        away_score: 1,
        // DB 실측 값 — StatsAPI 컨벤션(TB=TBR)
        home_team_code: "TB",
        away_team_code: "NYY",
      },
    ];
    const preds: PredFixture[] = [
      { external_game_id: "9301", home_win_prob: 0.65, prediction_type: "pre_game" },
    ];
    supabaseMock = makeSupabaseMock(schedule, preds);

    const { buildMlbMatchupProfile } = await import("../buildMlbMatchupProfile");
    const pair = mlbCanonicalPair("NYY", "TBR")!; // 알파벳 정렬: codeA=NYY, codeB=TBR
    const profile = await buildMlbMatchupProfile(pair);

    // DB 쿼리 필터는 StatsAPI 코드(TB)로 나가야 함 — canonical(TBR) 그대로면 항상 0건 매칭.
    const scheduleFrom = supabaseMock.from("mlb_schedule") as unknown as {
      or: ReturnType<typeof vi.fn>;
    };
    expect(scheduleFrom.or).toHaveBeenCalledWith(
      "and(home_team_code.eq.NYY,away_team_code.eq.TB),and(home_team_code.eq.TB,away_team_code.eq.NYY)",
    );

    expect(profile.finalGames).toBe(1);
    expect(profile.games[0].homeCode).toBe("TBR"); // canonical 정규화됨 (raw 'TB' 아님)
    expect(profile.games[0].awayCode).toBe("NYY");
    expect(profile.games[0].actualWinnerCode).toBe("TBR");
    // sideStats 는 canonical teamA/teamB.code 로 매칭 — 정규화 실패 시 항상 0승 0패.
    const sideTBR = profile.sideStats.a.teamCode === "TBR" ? profile.sideStats.a : profile.sideStats.b;
    expect(sideTBR.wins).toBe(1);
    expect(sideTBR.homeWins).toBe(1);
  });
});
