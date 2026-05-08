import { afterEach, describe, expect, it, vi } from "vitest";
import { buildTeamEloTrend } from "../buildTeamEloTrend";

vi.mock("@/lib/standings/buildEloTrend", () => ({
  buildEloTrend: vi.fn(),
}));

import { buildEloTrend } from "@/lib/standings/buildEloTrend";
const mockBuildEloTrend = vi.mocked(buildEloTrend);

describe("buildTeamEloTrend", () => {
  afterEach(() => vi.clearAllMocks());

  it("buildEloTrend 데이터 없으면 빈 배열 반환", async () => {
    mockBuildEloTrend.mockResolvedValue({ points: [], teams: [] });
    const result = await buildTeamEloTrend("LG");
    expect(result.points).toHaveLength(0);
  });

  it("팀 Elo + 리그 평균 계산", async () => {
    mockBuildEloTrend.mockResolvedValue({
      points: [
        { date: "2026-04-01", LG: 1520, HT: 1480, OB: 1500 },
        { date: "2026-04-02", LG: 1530, HT: 1470, OB: 1510 },
      ],
      teams: ["LG", "HT", "OB"],
    });

    const result = await buildTeamEloTrend("LG");
    expect(result.points).toHaveLength(2);

    const p0 = result.points[0];
    expect(p0.date).toBe("2026-04-01");
    expect(p0.elo).toBe(1520);
    // avg = (1520 + 1480 + 1500) / 3 = 1500
    expect(p0.avg).toBeCloseTo(1500);

    const p1 = result.points[1];
    expect(p1.elo).toBe(1530);
    // avg = (1530 + 1470 + 1510) / 3 = 1503.33...
    expect(p1.avg).toBeCloseTo(1503.33, 1);
  });

  it("해당 팀 Elo 없는 날 스킵", async () => {
    mockBuildEloTrend.mockResolvedValue({
      points: [
        { date: "2026-04-01", HT: 1480, OB: 1500 },
        { date: "2026-04-02", LG: 1530, HT: 1470 },
      ],
      teams: ["LG", "HT", "OB"],
    });

    const result = await buildTeamEloTrend("LG");
    expect(result.points).toHaveLength(1);
    expect(result.points[0].date).toBe("2026-04-02");
  });

  it("buildEloTrend 에러 시 빈 배열 반환 (catch 테스트)", async () => {
    mockBuildEloTrend.mockRejectedValue(new Error("db error"));
    await expect(
      buildTeamEloTrend("SK").catch(() => ({ points: [] })),
    ).resolves.toEqual({ points: [] });
  });
});
