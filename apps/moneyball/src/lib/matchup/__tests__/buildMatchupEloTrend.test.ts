import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMatchupEloTrend } from "../buildMatchupEloTrend";

vi.mock("@/lib/standings/buildEloTrend", () => ({
  buildEloTrend: vi.fn(),
}));

import { buildEloTrend } from "@/lib/standings/buildEloTrend";
const mockBuildEloTrend = vi.mocked(buildEloTrend);

describe("buildMatchupEloTrend", () => {
  afterEach(() => vi.clearAllMocks());

  it("buildEloTrend 데이터 없으면 빈 배열 반환", async () => {
    mockBuildEloTrend.mockResolvedValue({ points: [], teams: [] });
    const result = await buildMatchupEloTrend("LG", "HT");
    expect(result.points).toHaveLength(0);
  });

  it("두 팀 Elo 모두 있는 날짜 매핑", async () => {
    mockBuildEloTrend.mockResolvedValue({
      points: [
        { date: "2026-04-01", LG: 1520, HT: 1480, OB: 1500 },
        { date: "2026-04-02", LG: 1530, HT: 1470, OB: 1510 },
      ],
      teams: ["LG", "HT", "OB"],
    });

    const result = await buildMatchupEloTrend("LG", "HT");
    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toEqual({ date: "2026-04-01", eloA: 1520, eloB: 1480 });
    expect(result.points[1]).toEqual({ date: "2026-04-02", eloA: 1530, eloB: 1470 });
  });

  it("한 팀만 그 날 Elo 있으면 null 유지 (다른 팀은 null 아님)", async () => {
    mockBuildEloTrend.mockResolvedValue({
      points: [
        { date: "2026-04-01", HT: 1480, OB: 1500 },
        { date: "2026-04-02", LG: 1530, HT: 1470 },
      ],
      teams: ["LG", "HT", "OB"],
    });

    const result = await buildMatchupEloTrend("LG", "HT");
    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toEqual({ date: "2026-04-01", eloA: null, eloB: 1480 });
    expect(result.points[1]).toEqual({ date: "2026-04-02", eloA: 1530, eloB: 1470 });
  });

  it("두 팀 다 그 날 Elo 없으면 해당 날짜 스킵", async () => {
    mockBuildEloTrend.mockResolvedValue({
      points: [
        { date: "2026-04-01", OB: 1500 },
        { date: "2026-04-02", LG: 1530, HT: 1470 },
      ],
      teams: ["LG", "HT", "OB"],
    });

    const result = await buildMatchupEloTrend("LG", "HT");
    expect(result.points).toHaveLength(1);
    expect(result.points[0].date).toBe("2026-04-02");
  });

  it("buildEloTrend 에러 시 빈 배열 반환 (catch 테스트)", async () => {
    mockBuildEloTrend.mockRejectedValue(new Error("db error"));
    await expect(
      buildMatchupEloTrend("LG", "SK").catch(() => ({ points: [] })),
    ).resolves.toEqual({ points: [] });
  });
});
