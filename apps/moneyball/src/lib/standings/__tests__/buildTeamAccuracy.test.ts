import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAllTeamAccuracy, buildTeamBiasAnalysis } from "../buildTeamAccuracy";

interface MockOptions {
  error?: { message: string } | null;
  data?: unknown[] | null;
}

function makeMock(opts: MockOptions = {}) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockResolvedValue({
      data: opts.error ? null : (opts.data ?? []),
      error: opts.error ?? null,
    }),
  };
  return { from: vi.fn().mockReturnValue(builder) };
}

let supabaseMock: ReturnType<typeof makeMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

const { fetchStandingsMock } = vi.hoisted(() => ({ fetchStandingsMock: vi.fn() }));
vi.mock("@moneyball/kbo-data", () => ({ fetchStandings: fetchStandingsMock }));

describe("buildAllTeamAccuracy", () => {
  afterEach(() => vi.clearAllMocks());

  it("정상 데이터 → 팀별 집계 + 적중률 내림차순", async () => {
    supabaseMock = makeMock({
      data: [
        { is_correct: true,  game: { home_team: { code: "LG" }, away_team: { code: "HT" } } },
        { is_correct: true,  game: { home_team: { code: "LG" }, away_team: { code: "OB" } } },
        { is_correct: false, game: { home_team: { code: "LG" }, away_team: { code: "SK" } } },
        { is_correct: false, game: { home_team: { code: "HT" }, away_team: { code: "SS" } } },
      ],
    });

    const result = await buildAllTeamAccuracy();

    const lg = result.find((r) => r.teamCode === "LG");
    const ht = result.find((r) => r.teamCode === "HT");

    expect(lg).toBeDefined();
    expect(lg!.verifiedN).toBe(3);
    expect(lg!.correctN).toBe(2);
    expect(lg!.accuracyRate).toBeCloseTo(2 / 3);

    expect(ht).toBeDefined();
    expect(ht!.verifiedN).toBe(2);
    expect(ht!.correctN).toBe(1);

    // 내림차순 정렬 확인 (accuracyRate 기준)
    for (let i = 0; i < result.length - 1; i++) {
      const cur = result[i].accuracyRate ?? -1;
      const nxt = result[i + 1].accuracyRate ?? -1;
      expect(cur).toBeGreaterThanOrEqual(nxt);
    }
  });

  it("데이터 없음 → 빈 배열", async () => {
    supabaseMock = makeMock({ data: [] });
    const result = await buildAllTeamAccuracy();
    expect(result).toEqual([]);
  });

  it("game null → 해당 row 건너뜀", async () => {
    supabaseMock = makeMock({
      data: [
        { is_correct: true, game: null },
        { is_correct: true, game: { home_team: { code: "SS" }, away_team: { code: "NC" } } },
      ],
    });
    const result = await buildAllTeamAccuracy();
    expect(result.find((r) => r.teamCode === "SS")).toBeDefined();
    expect(result.length).toBe(2); // SS, NC만
  });

  it("DB error → assertSelectOk throw", async () => {
    supabaseMock = makeMock({ error: { message: "db error" } });
    await expect(buildAllTeamAccuracy()).rejects.toThrow();
  });

  it("CURRENT_MODEL_FILTER 적용 — match 호출 확인", async () => {
    supabaseMock = makeMock({ data: [] });
    await buildAllTeamAccuracy();
    const builder = supabaseMock.from.mock.results[0].value;
    expect(builder.match).toHaveBeenCalledWith(
      expect.objectContaining({ debate_version: expect.any(String) }),
    );
  });
});

describe("buildTeamBiasAnalysis", () => {
  afterEach(() => vi.clearAllMocks());

  it("biasGap = predictedWinRate - actualWinPct 계산 정확", async () => {
    supabaseMock = makeMock({
      data: [
        // LG home (confidence=0.7 → LG predicted win), is_correct=true
        { confidence: 0.7, is_correct: true,  game: { home_team: { code: "LG" }, away_team: { code: "HT" } } },
        { confidence: 0.7, is_correct: true,  game: { home_team: { code: "LG" }, away_team: { code: "HT" } } },
        { confidence: 0.7, is_correct: false, game: { home_team: { code: "LG" }, away_team: { code: "HT" } } },
        { confidence: 0.7, is_correct: false, game: { home_team: { code: "LG" }, away_team: { code: "HT" } } },
        { confidence: 0.7, is_correct: false, game: { home_team: { code: "LG" }, away_team: { code: "HT" } } },
      ],
    });
    fetchStandingsMock.mockResolvedValue([
      { teamCode: "LG", winPct: 0.4, rank: 1, games: 10, wins: 4, draws: 0, losses: 6, gamesBehind: 0, recent10: "" },
      { teamCode: "HT", winPct: 0.5, rank: 2, games: 10, wins: 5, draws: 0, losses: 5, gamesBehind: 0, recent10: "" },
    ]);

    const result = await buildTeamBiasAnalysis();
    const lg = result.find((r) => r.teamCode === "LG");
    expect(lg).toBeDefined();
    // LG home 5경기 모두 confidence=0.7 → predictedHomeWin=true → LG predictedWinN=5
    expect(lg!.predictedWinRate).toBeCloseTo(1.0);
    // biasGap = 1.0 - 0.4 = 0.6
    expect(lg!.biasGap).toBeCloseTo(0.6);
    // 결과는 |biasGap| 내림차순
    for (let i = 0; i < result.length - 1; i++) {
      expect(Math.abs(result[i].biasGap ?? 0)).toBeGreaterThanOrEqual(Math.abs(result[i + 1].biasGap ?? 0));
    }
  });

  it("totalN < 5 → 필터 제거", async () => {
    supabaseMock = makeMock({
      data: [
        { confidence: 0.6, is_correct: true, game: { home_team: { code: "SS" }, away_team: { code: "NC" } } },
        { confidence: 0.6, is_correct: true, game: { home_team: { code: "SS" }, away_team: { code: "NC" } } },
        { confidence: 0.6, is_correct: true, game: { home_team: { code: "SS" }, away_team: { code: "NC" } } },
        // SS=4, NC=4 — 둘 다 n<5는 아니지만 4건이면 필터 아웃 (min=5)
      ],
    });
    fetchStandingsMock.mockResolvedValue([]);

    const result = await buildTeamBiasAnalysis();
    // 3경기 → SS=3, NC=3 모두 totalN < 5 → 빈 배열
    expect(result).toEqual([]);
  });

  it("fetchStandings 실패 → actualWinPct null + biasGap null 허용", async () => {
    supabaseMock = makeMock({
      data: Array.from({ length: 5 }, () => ({
        confidence: 0.65,
        is_correct: true,
        game: { home_team: { code: "WO" }, away_team: { code: "SK" } },
      })),
    });
    fetchStandingsMock.mockRejectedValue(new Error("network error"));

    const result = await buildTeamBiasAnalysis();
    expect(result.length).toBeGreaterThan(0);
    // standings 실패 → actualWinPct=null, biasGap=null
    result.forEach((r) => {
      expect(r.actualWinPct).toBeNull();
      expect(r.biasGap).toBeNull();
    });
  });
});
