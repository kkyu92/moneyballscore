/**
 * wave-241 regression guard — buildEloTrend uses scoring_rule filter (PRODUCTION_COHORT_RULES)
 * instead of debate_version, so CREDIT_EXHAUSTED predictions (debate_version=null) are included.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

type SupabaseMock = ReturnType<typeof makeSupabaseMock>;
let supabaseMock: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

function makeSupabaseMock(data: unknown[] | null = [], error: { message: string } | null = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
  };
  return { from: vi.fn().mockReturnValue(builder), builder };
}

describe("buildEloTrend — wave-241 CREDIT_EXHAUSTED fix", () => {
  afterEach(() => vi.clearAllMocks());

  it("filters by scoring_rule not debate_version", async () => {
    supabaseMock = makeSupabaseMock([]);
    const { buildEloTrend } = await import("../buildEloTrend");
    await buildEloTrend();

    expect(supabaseMock.builder.in).toHaveBeenCalledWith(
      "predictions.scoring_rule",
      expect.arrayContaining(["v1.8", "v1.8-credit-fail"]),
    );
    const eqCalls = supabaseMock.builder.eq.mock.calls.map((c: unknown[]) => c[0]);
    expect(eqCalls).not.toContain("predictions.debate_version");
  });

  it("빈 데이터 시 빈 배열 반환", async () => {
    supabaseMock = makeSupabaseMock([]);
    const { buildEloTrend } = await import("../buildEloTrend");
    const result = await buildEloTrend();
    expect(result.points).toHaveLength(0);
    expect(result.teams).toHaveLength(0);
  });
});
