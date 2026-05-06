/**
 * cycle 173 silent drift family apps/moneyball lib sub-dir 차원 (seasons)
 * 첫 진입 회귀 가드.
 *
 * buildSeasonSummary 의 supabase select (teams + games 페이지네이션) 가
 * .error 무시 시 null 반환 또는 부분 페이지만 누적된 채 partial summary 반환
 * = 시즌 통계가 silent 절단 위장. assertSelectOk 통일 후 error 시 throw.
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
    "in",
    "gte",
    "lte",
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

interface SeasonsMockOptions {
  teamsError?: { message: string } | null;
  gamesError?: { message: string } | null;
}

function makeAdminMock(opts: SeasonsMockOptions = {}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "teams") {
        return makeChainBuilder({
          data: opts.teamsError
            ? null
            : [{ id: 1, code: "HT", name_ko: "KIA 타이거즈" }],
          error: opts.teamsError ?? null,
        });
      }
      if (table === "games") {
        return makeChainBuilder({
          data: opts.gamesError ? null : [],
          error: opts.gamesError ?? null,
        });
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let adminMock: ReturnType<typeof makeAdminMock>;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminMock,
}));

describe("seasons lib — cycle 173 silent drift family `.error` 미체크 회귀 가드", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("buildSeasonSummary teams select error → assertSelectOk throw", async () => {
    adminMock = makeAdminMock({
      teamsError: { message: "RLS violation" },
    });
    const { buildSeasonSummary } = await import("../buildSeasonSummary");
    await expect(buildSeasonSummary(2026)).rejects.toThrow(
      /buildSeasonSummary teams year=2026 select failed: RLS violation/,
    );
  });

  it("buildSeasonSummary games select error → assertSelectOk throw", async () => {
    adminMock = makeAdminMock({
      gamesError: { message: "syntax error" },
    });
    const { buildSeasonSummary } = await import("../buildSeasonSummary");
    await expect(buildSeasonSummary(2026)).rejects.toThrow(
      /buildSeasonSummary games year=2026 from=0 select failed: syntax error/,
    );
  });
});
