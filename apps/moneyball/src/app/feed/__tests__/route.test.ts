import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// cycle 149 silent drift family — feed/route.ts 의 supabase select `.error` 미체크
// regression 차단. 기존엔 `const { data: games } = await supabase...` 직접 destruct
// → DB 오류 시 data=null silent fallback → game items 0건 RSS 응답 silent drift.
// assertSelectOk 통일 후 error 시 throw → Next.js route handler 가 500 반환.

interface GamesQueryResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

let gamesResult: GamesQueryResult;

function makeSupabaseMock() {
  const gamesBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => Promise.resolve(gamesResult)),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "games") return gamesBuilder;
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => makeSupabaseMock()),
}));

describe("feed/route — silent drift family detection (cycle 149)", () => {
  beforeEach(() => {
    gamesResult = { data: [], error: null };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("games select error → assertSelectOk throw (silent 빈 RSS feed 차단)", async () => {
    gamesResult = {
      data: null,
      error: { message: "syntax error at or near 'and'" },
    };

    const { GET } = await import("../route");
    await expect(GET()).rejects.toThrow(
      /feed getRssGames select failed: syntax error/,
    );
  });

  it("games select success (data=[]) → RSS 정상 응답 (review items 만)", async () => {
    gamesResult = { data: [], error: null };

    const { GET } = await import("../route");
    const res = await GET();
    expect(res.headers.get("Content-Type")).toMatch(/application\/rss\+xml/);
    const xml = await res.text();
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<rss");
    // game items 없어도 review items (weekly + monthly + misses) 는 항상 있음
    expect(xml).toContain("주간 리뷰");
  });
});
