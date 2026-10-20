import { afterEach, describe, expect, it, vi } from "vitest";

// KBO buildTeamEloTrend 병렬 구현 — mlb_team_elo_history 전체 조회 후 단일 팀 시계열 +
// 리그 평균(forward-fill 된 전 팀 최신 rating 평균, cycle 3033 정정) 산출. 핵심 검증:
// (1) StatsAPI alias 코드(TB/SD 등) 도 canonical 로 정규화돼 팀 매칭되는지 (사례 27 family)
// (2) 리그 평균 forward-fill 계산 (3) 빈 결과 시 points: [] graceful 반환 (4) select error
// 시 throw 대신 degrade.

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

  it("팀 경기 없는 날짜도 리그 평균은 forward-fill (스케줄 분산 왜곡 방지, cycle 3033)", async () => {
    const rows: EloHistoryFixture[] = [
      { team_code: "NYY", game_date: "2026-04-01", elo_rating: 1520 },
      { team_code: "NYY", game_date: "2026-04-02", elo_rating: 1512 },
      { team_code: "BOS", game_date: "2026-04-02", elo_rating: 1480 },
      { team_code: "NYY", game_date: "2026-04-03", elo_rating: 1500 },
    ];
    supabaseMock = makeSupabaseMock(rows);

    const { buildMlbTeamEloTrend } = await import("../buildMlbTeamEloTrend");
    const { points } = await buildMlbTeamEloTrend("NYY");

    // 04-03 엔 BOS 경기 없음 — forward-fill 된 BOS 1480 이 평균에 계속 반영돼야 함
    // (forward-fill 없으면 avg === elo === 1500, BOS 소실).
    expect(points).toEqual([
      { date: "2026-04-01", elo: 1520, avg: 1520 },
      { date: "2026-04-02", elo: 1512, avg: 1496 },
      { date: "2026-04-03", elo: 1500, avg: 1490 },
    ]);
  });

  it("데이터 0건 → points: [] (silent throw 없음), degraded: false", async () => {
    supabaseMock = makeSupabaseMock([]);

    const { buildMlbTeamEloTrend } = await import("../buildMlbTeamEloTrend");
    const { points, degraded } = await buildMlbTeamEloTrend("NYY");

    expect(points).toEqual([]);
    expect(degraded).toBe(false);
  });

  it("select error 시 throw 대신 points: [] degrade (cycle 2949 captureFallback) + degraded: true 노출", async () => {
    supabaseMock = makeSupabaseMock([], { message: "boom" });

    const { buildMlbTeamEloTrend } = await import("../buildMlbTeamEloTrend");
    const { points, degraded } = await buildMlbTeamEloTrend("NYY");
    expect(points).toEqual([]);
    expect(degraded).toBe(true);
  });
});
