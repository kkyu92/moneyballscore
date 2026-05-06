import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// cycle 151 silent drift family — buildTeamProfile.ts 의 supabase select `.error` 미체크
// 회귀 차단. 기존엔 `const { data: teamRow }` / `const { data }` 직접 destruct → DB
// 오류 시 data=null silent fallback → 빈 팀 프로필 반환되어 사용자에게 "이 팀 데이터
// 없음" 으로 오해 (실제로는 DB 오류). assertSelectOk 통일 후 error 시 throw → page
// boundary 처리.
//
// cycle 147~150 family (buildMatchupProfile teams+games / analysis page / feed/route /
// opengraph-image) 와 동일 패턴. apps/moneyball lib 차원 silent drift family detection
// 두 번째 진입 (147 buildMatchupProfile 후속).

const HT_ID = 1;

interface SupabaseMockOptions {
  teamsError?: { message: string } | null;
  gamesError?: { message: string } | null;
  teamRow?: { id: number } | null;
  games?: unknown[];
}

function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const teamsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.teamsError ? null : (opts.teamRow ?? { id: HT_ID }),
      error: opts.teamsError ?? null,
    }),
  };
  const gamesBuilder = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: opts.gamesError ? null : (opts.games ?? []),
      error: opts.gamesError ?? null,
    }),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "teams") return teamsBuilder;
      if (table === "games") return gamesBuilder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

let supabaseMock: ReturnType<typeof makeSupabaseMock>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(supabaseMock),
}));

describe("buildTeamProfile — cycle 151 silent drift family `.error` 미체크 회귀 가드", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("teams select error → assertSelectOk throw (silent 빈 프로필 fallback 차단)", async () => {
    supabaseMock = makeSupabaseMock({
      teamsError: { message: "connection refused" },
    });

    const { buildTeamProfile } = await import("../buildTeamProfile");
    await expect(buildTeamProfile("HT")).rejects.toThrow(
      /buildTeamProfile teams select failed: connection refused/,
    );
  });

  it("games select error → assertSelectOk throw (silent 빈 record 위장 차단)", async () => {
    supabaseMock = makeSupabaseMock({
      gamesError: { message: "syntax error at or near 'and'" },
    });

    const { buildTeamProfile } = await import("../buildTeamProfile");
    await expect(buildTeamProfile("HT")).rejects.toThrow(
      /buildTeamProfile games select failed: syntax error/,
    );
  });

  it("teams .maybeSingle() 빈 row (data=null, error=null) → 정상 fallback 빈 프로필 반환", async () => {
    supabaseMock = makeSupabaseMock({ teamRow: null });

    const { buildTeamProfile } = await import("../buildTeamProfile");
    const profile = await buildTeamProfile("HT");

    expect(profile).not.toBeNull();
    expect(profile?.code).toBe("HT");
    expect(profile?.predictedGames).toBe(0);
    expect(profile?.recentGames).toEqual([]);
    expect(profile?.topPitchers).toEqual([]);
  });

  it("정상 case (teams + games 모두 success, data=[]) → 빈 통계 프로필 정상 반환", async () => {
    supabaseMock = makeSupabaseMock({
      teamRow: { id: HT_ID },
      games: [],
    });

    const { buildTeamProfile } = await import("../buildTeamProfile");
    const profile = await buildTeamProfile("HT");

    expect(profile).not.toBeNull();
    expect(profile?.code).toBe("HT");
    expect(profile?.predictedGames).toBe(0);
    expect(profile?.verifiedN).toBe(0);
    expect(profile?.factorAverages.spFip).toBeNull();
    expect(profile?.recentGames).toEqual([]);
  });

  it("KBO_TEAMS 미등록 코드 → null 반환 (DB 콜 X)", async () => {
    supabaseMock = makeSupabaseMock();

    const { buildTeamProfile } = await import("../buildTeamProfile");
    // @ts-expect-error - 미등록 코드 회귀 가드
    const profile = await buildTeamProfile("ZZ");
    expect(profile).toBeNull();
  });
});
