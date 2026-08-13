import { afterEach, describe, expect, it, vi } from "vitest";

// plan #25 Phase 2b step 2 — mlb_team_elo_history 조회 helper 회귀 가드.
// 핵심 검증: (1) StatsAPI 컨벤션 alias 팀(TBR/CHW/KCR/SDP/SFG/ARI/WSN) 도 canonical 코드로
// 정확히 매핑되는지(cycle 2081 사례 27 재발 방지) (2) 날짜별 두 팀 rating merge 정확성
// (3) 빈 결과 시 points: [] graceful 반환.

interface EloHistoryFixture {
  team_code: string;
  game_date: string;
  elo_rating: number;
}

function makeSupabaseMock(rows: EloHistoryFixture[], error: { message: string } | null = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: error ? null : rows, error }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "mlb_team_elo_history") return builder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

describe("buildMlbMatchupEloTrend", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("DB StatsAPI 코드(TB/SD)를 canonical(TBR/SDP)로 정규화해 두 팀 시계열을 merge", async () => {
    const rows: EloHistoryFixture[] = [
      { team_code: "TB", game_date: "2026-04-01", elo_rating: 1500 },
      { team_code: "SD", game_date: "2026-04-01", elo_rating: 1495 },
      { team_code: "TB", game_date: "2026-04-02", elo_rating: 1508 },
      { team_code: "SD", game_date: "2026-04-02", elo_rating: 1487 },
    ];
    supabaseMock = makeSupabaseMock(rows);

    const { buildMlbMatchupEloTrend } = await import("../buildMlbMatchupEloTrend");
    const { points } = await buildMlbMatchupEloTrend("TBR", "SDP");

    expect(points).toEqual([
      { date: "2026-04-01", eloA: 1500, eloB: 1495 },
      { date: "2026-04-02", eloA: 1508, eloB: 1487 },
    ]);
    expect(supabaseMock.from).toHaveBeenCalledWith("mlb_team_elo_history");
  });

  it("한쪽 팀만 특정 날짜 데이터가 있으면 나머지는 null (연속 line 렌더는 컴포넌트 connectNulls 책임)", async () => {
    const rows: EloHistoryFixture[] = [
      { team_code: "NYY", game_date: "2026-04-01", elo_rating: 1520 },
      { team_code: "BOS", game_date: "2026-04-02", elo_rating: 1480 },
    ];
    supabaseMock = makeSupabaseMock(rows);

    const { buildMlbMatchupEloTrend } = await import("../buildMlbMatchupEloTrend");
    const { points } = await buildMlbMatchupEloTrend("NYY", "BOS");

    expect(points).toEqual([
      { date: "2026-04-01", eloA: 1520, eloB: null },
      { date: "2026-04-02", eloA: null, eloB: 1480 },
    ]);
  });

  it("데이터 0건 → points: [] (silent throw 없음)", async () => {
    supabaseMock = makeSupabaseMock([]);

    const { buildMlbMatchupEloTrend } = await import("../buildMlbMatchupEloTrend");
    const { points } = await buildMlbMatchupEloTrend("NYY", "BOS");

    expect(points).toEqual([]);
  });

  it("select error 시 throw (assertSelectOk silent drop 방지)", async () => {
    supabaseMock = makeSupabaseMock([], { message: "boom" });

    const { buildMlbMatchupEloTrend } = await import("../buildMlbMatchupEloTrend");
    await expect(buildMlbMatchupEloTrend("NYY", "BOS")).rejects.toThrow();
  });
});
