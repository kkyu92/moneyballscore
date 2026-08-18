import { afterEach, describe, expect, it, vi } from "vitest";

interface SupabaseMockOptions {
  scheduleError?: { message: string } | null;
  predsError?: { message: string } | null;
  schedule?: unknown[];
  preds?: unknown[];
}

function makeThenableBuilder(resolved: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.or = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.lt = vi.fn(chain);
  builder.neq = vi.fn(chain);
  builder.in = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve(resolved);
  return builder;
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const scheduleBuilder = makeThenableBuilder({
    data: opts.scheduleError ? null : (opts.schedule ?? []),
    error: opts.scheduleError ?? null,
  });
  const predsBuilder = makeThenableBuilder({
    data: opts.predsError ? null : (opts.preds ?? []),
    error: opts.predsError ?? null,
  });
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

describe("fetchMlbHistoricalAnalogs", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("과거 대결 없으면 빈 배열", async () => {
    supabaseMock = makeSupabaseMock({ schedule: [] });
    const { fetchMlbHistoricalAnalogs } = await import("../fetchMlbHistoricalAnalogs");
    const result = await fetchMlbHistoricalAnalogs("NYY", "BOS", "current-id", "2026-08-18");
    expect(result).toEqual([]);
  });

  it("schedule select 실패 시 throw (silent drift 회귀 가드)", async () => {
    supabaseMock = makeSupabaseMock({ scheduleError: { message: "boom" } });
    const { fetchMlbHistoricalAnalogs } = await import("../fetchMlbHistoricalAnalogs");
    await expect(
      fetchMlbHistoricalAnalogs("NYY", "BOS", "current-id", "2026-08-18"),
    ).rejects.toThrow();
  });

  it("home_win_prob + 실제 스코어로 predictedHomeWin/isCorrect derive", async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          external_game_id: "g1",
          game_date: "2026-08-01",
          home_team_code: "NYY",
          away_team_code: "BOS",
          home_score: 5,
          away_score: 2,
        },
        {
          external_game_id: "g2",
          game_date: "2026-07-15",
          home_team_code: "BOS",
          away_team_code: "NYY",
          home_score: 1,
          away_score: 3,
        },
      ],
      preds: [
        { external_game_id: "g1", home_win_prob: 0.65 }, // 홈(NYY) 예측, 홈 승 → 적중
        { external_game_id: "g2", home_win_prob: 0.6 }, // 홈(BOS) 예측, 원정(NYY) 승 → 오답
      ],
    });
    const { fetchMlbHistoricalAnalogs } = await import("../fetchMlbHistoricalAnalogs");
    const result = await fetchMlbHistoricalAnalogs("NYY", "BOS", "current-id", "2026-08-18");

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      externalGameId: "g1",
      homeCode: "NYY",
      awayCode: "BOS",
      predictedHomeWin: true,
      isCorrect: true,
    });
    expect(result[1]).toMatchObject({
      externalGameId: "g2",
      homeCode: "BOS",
      awayCode: "NYY",
      predictedHomeWin: true,
      isCorrect: false,
    });
  });

  it("예측 없는 경기는 predictedHomeWin/isCorrect null (external_game_id 매칭 없음)", async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          external_game_id: "g1",
          game_date: "2026-08-01",
          home_team_code: "NYY",
          away_team_code: "BOS",
          home_score: 5,
          away_score: 2,
        },
      ],
      preds: [],
    });
    const { fetchMlbHistoricalAnalogs } = await import("../fetchMlbHistoricalAnalogs");
    const result = await fetchMlbHistoricalAnalogs("NYY", "BOS", "current-id", "2026-08-18");
    expect(result[0].predictedHomeWin).toBeNull();
    expect(result[0].isCorrect).toBeNull();
  });

  it("StatsAPI alias 팀(예: TBR)도 canonical 코드로 정규화해 반환 (사례 27 회귀 가드)", async () => {
    supabaseMock = makeSupabaseMock({
      schedule: [
        {
          external_game_id: "g1",
          game_date: "2026-08-01",
          home_team_code: "TB", // StatsAPI 컨벤션 저장값
          away_team_code: "NYY",
          home_score: 4,
          away_score: 1,
        },
      ],
      preds: [{ external_game_id: "g1", home_win_prob: 0.55 }],
    });
    const { fetchMlbHistoricalAnalogs } = await import("../fetchMlbHistoricalAnalogs");
    const result = await fetchMlbHistoricalAnalogs("TBR", "NYY", "current-id", "2026-08-18");
    expect(result[0].homeCode).toBe("TBR");
  });
});
