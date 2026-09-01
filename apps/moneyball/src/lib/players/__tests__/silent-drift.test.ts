/**
 * cycle 173 silent drift family apps/moneyball lib sub-dir 차원 (players)
 * 첫 진입 회귀 가드.
 *
 * batter/pitcherLB/pitcherProfile 의 supabase select 가 .error 무시 시 빈
 * leaderboard / null profile 위장 → 사용자엔 "선수 없음" 으로 보임.
 * assertSelectOk 통일 후 error 시 throw → 호출 site (page) 가 catch 결정.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockResult {
  data: unknown;
  error: { message: string } | null;
}

function makeChainBuilder(result: MockResult) {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    "select",
    "eq",
    "order",
    "limit",
    "maybeSingle",
    "in",
    "match",
    "gte",
    "lte",
    "range",
    "or",
  ];
  for (const m of chainMethods) {
    builder[m] = vi.fn(() => builder);
  }
  // thenable — await builder resolve 로 result 반환
  (builder as { then: unknown }).then = (
    resolve: (v: MockResult) => unknown,
  ) => Promise.resolve(result).then(resolve);
  return builder;
}

interface SupabaseMockOptions {
  batterError?: { message: string } | null;
  pitcherPredictionsError?: { message: string } | null;
  pitcherProfilePlayerError?: { message: string } | null;
  pitcherProfilePredsError?: { message: string } | null;
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "batter_stats") {
        return makeChainBuilder({
          data: opts.batterError ? null : [],
          error: opts.batterError ?? null,
        });
      }
      if (table === "predictions") {
        // pitcherProfile 은 maybeSingle 도 호출하는데 본 mock 에선 chain
        // 끝점 무관. error 만 분기.
        const error =
          opts.pitcherPredictionsError ??
          opts.pitcherProfilePredsError ??
          null;
        return makeChainBuilder({
          data: error ? null : [],
          error,
        });
      }
      if (table === "players") {
        return makeChainBuilder({
          data: opts.pitcherProfilePlayerError ? null : { id: 1 },
          error: opts.pitcherProfilePlayerError ?? null,
        });
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

describe("players lib — cycle 173 silent drift family `.error` 미체크 회귀 가드", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("buildBatterLeaderboard batter_stats select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      batterError: { message: "connection refused" },
    });
    const { buildBatterLeaderboard } = await import(
      "../buildBatterLeaderboard"
    );
    await expect(buildBatterLeaderboard()).rejects.toThrow(
      /buildBatterLeaderboard season=\d+ select failed: connection refused/,
    );
  });

  it("buildBatterLeaderboard 기본 season = KST 연도 (UTC getFullYear() 아님, cycle 2647 review-code heavy)", async () => {
    vi.useFakeTimers();
    // UTC 2026-12-31T15:00:00Z = KST 2027-01-01T00:00:00 — getFullYear() 는
    // 2026 을 반환하지만 KST 기준 실제 연도는 2027.
    vi.setSystemTime(new Date("2026-12-31T15:00:00Z"));
    supabaseMock = makeSupabaseMock();
    const { buildBatterLeaderboard } = await import(
      "../buildBatterLeaderboard"
    );
    await buildBatterLeaderboard();
    const batterBuilder = supabaseMock.from.mock.results.find(
      (_r, i) => supabaseMock.from.mock.calls[i]?.[0] === "batter_stats",
    )?.value as Record<string, { mock: { calls: unknown[][] } }> | undefined;
    expect(batterBuilder?.eq).toHaveBeenCalledWith("season", 2027);
    vi.useRealTimers();
  });

  it("buildBatterLeaderboard — last_synced freshness gte 필터 호출 확인 (cycle 2733 stale-leader 회귀 가드)", async () => {
    supabaseMock = makeSupabaseMock();
    const { buildBatterLeaderboard } = await import(
      "../buildBatterLeaderboard"
    );
    await buildBatterLeaderboard();
    const batterBuilder = supabaseMock.from.mock.results.find(
      (_r, i) => supabaseMock.from.mock.calls[i]?.[0] === "batter_stats",
    )?.value as Record<string, { mock: { calls: unknown[][] } }> | undefined;
    expect(batterBuilder?.gte).toHaveBeenCalledWith(
      "last_synced",
      expect.any(String),
    );
  });

  it("buildPitcherLeaderboard predictions select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      pitcherPredictionsError: { message: "syntax error" },
    });
    const { buildPitcherLeaderboard } = await import(
      "../buildPitcherLeaderboard"
    );
    await expect(buildPitcherLeaderboard()).rejects.toThrow(
      /buildPitcherLeaderboard predictions select failed: syntax error/,
    );
  });

  it("buildPitcherProfile players select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      pitcherProfilePlayerError: { message: "RLS violation" },
    });
    const { buildPitcherProfile } = await import("../buildPitcherProfile");
    await expect(buildPitcherProfile(42)).rejects.toThrow(
      /buildPitcherProfile player id=42 select failed: RLS violation/,
    );
  });

  it("buildPitcherProfile predictions select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      pitcherProfilePredsError: { message: "timeout" },
    });
    const { buildPitcherProfile } = await import("../buildPitcherProfile");
    await expect(buildPitcherProfile(42)).rejects.toThrow(
      /buildPitcherProfile predictions id=42 select failed: timeout/,
    );
  });

  it("buildPitcherLeaderboard — CURRENT_MODEL_FILTER match 호출 확인", async () => {
    supabaseMock = makeSupabaseMock({ pitcherPredictionsError: null });
    const { buildPitcherLeaderboard } = await import("../buildPitcherLeaderboard");
    await buildPitcherLeaderboard();
    const predsBuilder = supabaseMock.from.mock.results.find(
      (_r, i) => supabaseMock.from.mock.calls[i]?.[0] === "predictions",
    )?.value as Record<string, { mock: { calls: unknown[][] } }> | undefined;
    expect(predsBuilder?.match).toHaveBeenCalledWith(
      expect.objectContaining({ scoring_rule: expect.any(String) }),
    );
  });

  it("buildPitcherProfile — CURRENT_MODEL_FILTER match 호출 확인", async () => {
    supabaseMock = makeSupabaseMock({ pitcherProfilePredsError: null });
    const { buildPitcherProfile } = await import("../buildPitcherProfile");
    await buildPitcherProfile(42).catch(() => {});
    const predsBuilder = supabaseMock.from.mock.results.find(
      (_r, i) => supabaseMock.from.mock.calls[i]?.[0] === "predictions",
    )?.value as Record<string, { mock: { calls: unknown[][] } }> | undefined;
    expect(predsBuilder?.match).toHaveBeenCalledWith(
      expect.objectContaining({ scoring_rule: expect.any(String) }),
    );
  });
});
