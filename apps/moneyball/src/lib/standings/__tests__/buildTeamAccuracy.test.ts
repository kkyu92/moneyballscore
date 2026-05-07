import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAllTeamAccuracy } from "../buildTeamAccuracy";

interface MockOptions {
  error?: { message: string } | null;
  data?: unknown[] | null;
}

function makeMock(opts: MockOptions = {}) {
  const builder = {
    select: vi.fn().mockReturnThis(),
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
});
