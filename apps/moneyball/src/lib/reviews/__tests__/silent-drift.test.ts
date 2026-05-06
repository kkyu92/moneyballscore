/**
 * cycle 173 silent drift family apps/moneyball lib sub-dir 차원 (reviews)
 * 첫 진입 회귀 가드.
 *
 * missReport / monthly / weekly review 의 supabase select 가 .error 무시 시
 * 빈 review 반환 → 사용자엔 "검증 0" 으로 위장 = 정상 미검증 vs DB 오류 구분
 * 안 됨 = 모델 평가 차단. assertSelectOk 통일 후 error 시 throw.
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
  (builder as { then: unknown }).then = (
    resolve: (v: MockResult) => unknown,
  ) => Promise.resolve(result).then(resolve);
  return builder;
}

interface ReviewsMockOptions {
  // missReport 는 predictions 테이블 두 query (pre + post)
  // 단순화: 첫 호출 = pre, 두 번째 = post
  predictionsErrors?: Array<{ message: string } | null>;
}

let predictionsCallIdx = 0;

function makeSupabaseMock(opts: ReviewsMockOptions = {}) {
  predictionsCallIdx = 0;
  return {
    from: vi.fn((table: string) => {
      if (table === "predictions") {
        const idx = predictionsCallIdx++;
        const err = opts.predictionsErrors?.[idx] ?? null;
        return makeChainBuilder({
          data: err ? null : [],
          error: err,
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

describe("reviews lib — cycle 173 silent drift family `.error` 미체크 회귀 가드", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("buildMissReport pre_game select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      predictionsErrors: [{ message: "connection refused" }],
    });
    const { buildMissReport } = await import("../buildMissReport");
    await expect(buildMissReport()).rejects.toThrow(
      /buildMissReport pre_game select failed: connection refused/,
    );
  });

  it("buildMonthlyReview range select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      predictionsErrors: [{ message: "syntax error at or near 'and'" }],
    });
    const { buildMonthlyReview } = await import("../buildMonthlyReview");
    await expect(
      buildMonthlyReview({
        monthId: "2026-04",
        year: 2026,
        month: 4,
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        label: "2026년 4월",
      }),
    ).rejects.toThrow(
      /buildMonthlyReview range 2026-04-01~2026-04-30 select failed: syntax error/,
    );
  });

  it("buildWeeklyReview range select error → assertSelectOk throw", async () => {
    supabaseMock = makeSupabaseMock({
      predictionsErrors: [{ message: "timeout" }],
    });
    const { buildWeeklyReview } = await import("../buildWeeklyReview");
    await expect(
      buildWeeklyReview({
        weekId: "2026-W16",
        year: 2026,
        week: 16,
        startDate: "2026-04-15",
        endDate: "2026-04-21",
        label: "2026년 4월 15일 ~ 21일",
      }),
    ).rejects.toThrow(
      /buildWeeklyReview week 2026-04-15~2026-04-21 select failed: timeout/,
    );
  });
});
