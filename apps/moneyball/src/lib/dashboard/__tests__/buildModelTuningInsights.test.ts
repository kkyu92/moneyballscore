import { afterEach, describe, expect, it, vi } from "vitest";

// cycle 152 silent drift family — buildModelTuningInsights.ts 의 supabase predictions
// select `.error` 미체크 회귀 차단. 기존엔 `const { data } = await supabase.from(...)`
// 직접 destruct → DB 오류 시 data=null silent fallback → 빈 sample 배열 → "수집 중"
// report 가 사용자에게 노출 (실제로는 DB 오류). assertSelectOk 통일 후 error 시 throw
// → /dashboard page boundary (error.tsx) 가 처리.
//
// cycle 147~151 family (buildMatchupProfile / analysis page / feed/route /
// opengraph-image / buildTeamProfile) 와 동일 패턴. apps/moneyball lib/dashboard
// 차원 silent drift family detection 첫 진입.

interface SupabaseMockOptions {
  selectError?: { message: string } | null;
  rows?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockResolvedValue({
      data: opts.selectError ? null : (opts.rows ?? []),
      error: opts.selectError ?? null,
    }),
  };
  return {
    from: vi.fn(() => builder),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

// cycle 486 — vi.mock("@/config/model") 제거. 기존 fixture mock 은 key/value 둘 다
// source 와 mismatch:
//   - mock: { model_version: "v2.0-debate" }
//   - source (config/model.ts): { debate_version: CURRENT_DEBATE_VERSION = 'v2-persona4' }
// supabase mock 의 .match() 가 mockReturnThis() 라 런타임 영향 X (검증 X). 단 source 변경
// 시 fixture 자동 동기 X = silent drift family 28번째 surface. mock 제거 → 실제 config
// import (DEBATE_VERSION_PREGAME 순수 상수 chain, side effect X). buildAccuracyData test
// 패턴 (cycle 482/483) 과 동일.

describe("buildModelTuningInsights — cycle 152 silent drift family `.error` 미체크 회귀 가드", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("predictions select error → assertSelectOk throw (silent 빈 report '수집 중' 위장 차단)", async () => {
    supabaseMock = makeSupabaseMock({
      selectError: { message: "connection refused" },
    });

    const { buildModelTuningInsights } = await import(
      "../buildModelTuningInsights"
    );
    await expect(buildModelTuningInsights()).rejects.toThrow(
      /buildModelTuningInsights predictions select failed: connection refused/,
    );
  });

  it("predictions select success → analyzeFactorAccuracy 정상 호출 (회귀)", async () => {
    supabaseMock = makeSupabaseMock({
      rows: [],
    });

    const { buildModelTuningInsights } = await import(
      "../buildModelTuningInsights"
    );
    const report = await buildModelTuningInsights();
    // 빈 sample → minSamples 30 미달 보고. throw X.
    expect(report).toBeDefined();
    expect(report.totalSamples).toBe(0);
  });
});
