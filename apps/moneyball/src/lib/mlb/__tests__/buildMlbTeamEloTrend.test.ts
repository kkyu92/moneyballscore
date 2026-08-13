import { afterEach, describe, expect, it, vi } from "vitest";

// KBO buildTeamEloTrend 병렬 구현 — mlb_team_elo_history 전체 조회 후 단일 팀 시계열 +
// 리그 평균(그 날짜 조회된 모든 팀 rating 평균) 산출. 핵심 검증: (1) StatsAPI alias 코드
// (TB/SD 등) 도 canonical 로 정규화돼 팀 매칭되는지 (사례 27 family) (2) 리그 평균 계산
// (3) 빈 결과 시 points: [] graceful 반환 (4) select error 시 throw.

interface EloHistoryFixture {
  team_code: string;
  game_date: string;
  elo_rating: number;
}

function makeSupabaseMock(rows: EloHistoryFixture[], error: { message: string } | null = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
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

describe("buildMlbTeamEloTrend", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("DB StatsAPI 코드(TB)를 canonical(TBR)로 정규화해 팀 시계열 + 리그 평균 산출", async () => {
    const rows: EloHistoryFixture[] = [
      { team_code: "TB", game_date: "2026-04-01", elo_rating: 1500 },
      { team_code: "NYY", game_date: "2026-04-01", elo_rating: 1520 },
      { team_code: "TB", game_date: "2026-04-02", elo_rating: 1508 },
      { team_code: "NYY", game_date: "2026-04-02", elo_rating: 1512 },
    ];
    supabaseMock = makeSupabaseMock(rows);

    const { buildMlbTeamEloTrend } = await import("../buildMlbTeamEloTrend");
    const { points } = await buildMlbTeamEloTrend("TBR");

    expect(points).toEqual([
      { date: "2026-04-01", elo: 1500, avg: 1510 },
      { date: "2026-04-02", elo: 1508, avg: 1510 },
    ]);
    expect(supabaseMock.from).toHaveBeenCalledWith("mlb_team_elo_history");
  });

  it("해당 팀 데이터가 없는 날짜는 결과에서 제외 (다른 팀만 있는 날짜)", async () => {
    const rows: EloHistoryFixture[] = [
      { team_code: "NYY", game_date: "2026-04-01", elo_rating: 1520 },
      { team_code: "NYY", game_date: "2026-04-02", elo_rating: 1512 },
      { team_code: "BOS", game_date: "2026-04-02", elo_rating: 1480 },
    ];
    supabaseMock = makeSupabaseMock(rows);

    const { buildMlbTeamEloTrend } = await import("../buildMlbTeamEloTrend");
    const { points } = await buildMlbTeamEloTrend("NYY");

    expect(points).toEqual([
      { date: "2026-04-01", elo: 1520, avg: 1520 },
      { date: "2026-04-02", elo: 1512, avg: 1496 },
    ]);
  });

  it("데이터 0건 → points: [] (silent throw 없음)", async () => {
    supabaseMock = makeSupabaseMock([]);

    const { buildMlbTeamEloTrend } = await import("../buildMlbTeamEloTrend");
    const { points } = await buildMlbTeamEloTrend("NYY");

    expect(points).toEqual([]);
  });

  it("select error 시 throw (assertSelectOk silent drop 방지)", async () => {
    supabaseMock = makeSupabaseMock([], { message: "boom" });

    const { buildMlbTeamEloTrend } = await import("../buildMlbTeamEloTrend");
    await expect(buildMlbTeamEloTrend("NYY")).rejects.toThrow();
  });
});
