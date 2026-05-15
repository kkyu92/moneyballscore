/**
 * cycle 453 silent drift family apps/moneyball lib sub-dir 차원 (leaderboard)
 * 첫 진입 회귀 가드.
 *
 * fetchLeaderboard / fetchAiBaseline 의 supabase select 가 .error 무시 시
 * 빈 []/null 반환 → leaderboard 페이지가 "참여자 0명" / "AI baseline 없음"
 * 위장 silent drift. assertSelectOk 통일 후 error 시 throw → Next.js error
 * boundary 가 사용자 가시 실패 처리. silent drift family 시리즈 (cycle
 * 141~448) 와 동일 패턴.
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
    "match",
    "not",
    "gte",
    "lte",
    "order",
    "limit",
    "in",
    "range",
  ];
  for (const m of chainMethods) {
    builder[m] = vi.fn(() => builder);
  }
  (builder as { then: unknown }).then = (
    resolve: (v: MockResult) => unknown,
  ) => Promise.resolve(result).then(resolve);
  return builder;
}

interface LeaderboardMockOptions {
  viewError?: { message: string } | null;
  predictionsError?: { message: string } | null;
}

function makeServerMock(opts: LeaderboardMockOptions = {}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "leaderboard_weekly" || table === "leaderboard_season") {
        return makeChainBuilder({
          data: opts.viewError ? null : [],
          error: opts.viewError ?? null,
        });
      }
      if (table === "predictions") {
        return makeChainBuilder({
          data: opts.predictionsError ? null : [],
          error: opts.predictionsError ?? null,
        });
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let serverMock: ReturnType<typeof makeServerMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => serverMock,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}));

describe("leaderboard lib — cycle 453 silent drift family `.error` 미체크 회귀 가드", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("fetchLeaderboard weekly view select error → assertSelectOk throw", async () => {
    serverMock = makeServerMock({
      viewError: { message: "RLS violation" },
    });
    const { fetchLeaderboard } = await import("../server");
    await expect(fetchLeaderboard("weekly")).rejects.toThrow(
      /leaderboard\.fetchLeaderboard\(weekly\) select failed: RLS violation/,
    );
  });

  it("fetchLeaderboard season view select error → assertSelectOk throw", async () => {
    serverMock = makeServerMock({
      viewError: { message: "view missing" },
    });
    const { fetchLeaderboard } = await import("../server");
    await expect(fetchLeaderboard("season")).rejects.toThrow(
      /leaderboard\.fetchLeaderboard\(season\) select failed: view missing/,
    );
  });

  it("fetchAiBaseline weekly predictions select error → assertSelectOk throw", async () => {
    serverMock = makeServerMock({
      predictionsError: { message: "syntax error" },
    });
    const { fetchAiBaseline } = await import("../server");
    await expect(fetchAiBaseline("weekly")).rejects.toThrow(
      /leaderboard\.fetchAiBaseline\(weekly\) select failed: syntax error/,
    );
  });

  it("fetchAiBaseline season predictions select error → assertSelectOk throw", async () => {
    serverMock = makeServerMock({
      predictionsError: { message: "timeout" },
    });
    const { fetchAiBaseline } = await import("../server");
    await expect(fetchAiBaseline("season")).rejects.toThrow(
      /leaderboard\.fetchAiBaseline\(season\) select failed: timeout/,
    );
  });
});
