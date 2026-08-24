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
  teamsData?: unknown;
  gamesData?: unknown;
}

function makeAdminMock(opts: SeasonsMockOptions = {}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "teams") {
        return makeChainBuilder({
          data: opts.teamsError
            ? null
            : (opts.teamsData ?? [{ id: 1, code: "HT", name_ko: "KIA 타이거즈" }]),
          error: opts.teamsError ?? null,
        });
      }
      if (table === "games") {
        return makeChainBuilder({
          data: opts.gamesError ? null : (opts.gamesData ?? []),
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

describe("buildSeasonSummary — findChampionship 동점(우승 미확정) 회귀 가드 (cycle 2453)", () => {
  // findChampionship docstring 이 "우승 결정 안 난 상태 (동점) → null 반환" 을
  // 명시하지만 기존 구현엔 tie 분기가 없어 winsA<=winsB 시 무조건 idB 를
  // 우승팀으로 오판정하던 silent drift. KS 진행 중 truncated 데이터 수집
  // 시나리오(4경기 2-2 동점) 로 재현.
  afterEach(() => {
    vi.clearAllMocks();
  });

  const teamsData = [
    { id: 1, code: "HT", name_ko: "KIA 타이거즈" },
    { id: 2, code: "OB", name_ko: "두산 베어스" },
  ];

  function tiedSeriesGame(id: number, date: string, homeId: number, awayId: number, winnerId: number) {
    return {
      id,
      game_date: date,
      stadium: null,
      status: "final",
      home_team_id: homeId,
      away_team_id: awayId,
      winner_team_id: winnerId,
      home_score: winnerId === homeId ? 5 : 2,
      away_score: winnerId === awayId ? 5 : 2,
    };
  }

  it("한국시리즈 4경기 2-2 동점 → championship=null (우승팀 오판정 금지)", async () => {
    const gamesData = [
      tiedSeriesGame(1, "2025-11-01", 1, 2, 1), // HT win
      tiedSeriesGame(2, "2025-11-02", 2, 1, 2), // OB win
      tiedSeriesGame(3, "2025-11-03", 1, 2, 1), // HT win
      tiedSeriesGame(4, "2025-11-04", 2, 1, 2), // OB win — 2-2 tie, 시리즈 미종료
    ];
    adminMock = makeAdminMock({ teamsData, gamesData });
    const { buildSeasonSummary } = await import("../buildSeasonSummary");
    const summary = await buildSeasonSummary(2025);
    expect(summary?.championship).toBeNull();
  });

  it("한국시리즈 4경기 3-1 확정 → championship 정상 판정 (회귀 대비)", async () => {
    const gamesData = [
      tiedSeriesGame(1, "2025-11-01", 1, 2, 1), // HT win
      tiedSeriesGame(2, "2025-11-02", 2, 1, 1), // HT win
      tiedSeriesGame(3, "2025-11-03", 1, 2, 2), // OB win
      tiedSeriesGame(4, "2025-11-04", 2, 1, 1), // HT win — 3-1 HT 우승
    ];
    adminMock = makeAdminMock({ teamsData, gamesData });
    const { buildSeasonSummary } = await import("../buildSeasonSummary");
    const summary = await buildSeasonSummary(2025);
    expect(summary?.championship?.winnerCode).toBe("HT");
    expect(summary?.championship?.score).toBe("3-1");
  });
});
