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
let mlbPredResult: GamesQueryResult;
let mlbScheduleResult: GamesQueryResult;

function makeSupabaseMock() {
  const gamesBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => Promise.resolve(gamesResult)),
  };
  const predictionsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => Promise.resolve(mlbPredResult)),
  };
  const mlbScheduleBuilder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockImplementation(() => Promise.resolve(mlbScheduleResult)),
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "games") return gamesBuilder;
      if (table === "predictions") return predictionsBuilder;
      if (table === "mlb_schedule") return mlbScheduleBuilder;
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
    mlbPredResult = { data: [], error: null };
    mlbScheduleResult = { data: [], error: null };
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

  // cycle 810 v13-E — /changelog entries RSS feed 박제 regression guard.
  // 구독자 가치 (사이클별 변경 이력 RSS reader 즉시 수신) silent break 차단.
  it("changelog entries 포함 (link href + Cycle 라벨)", async () => {
    gamesResult = { data: [], error: null };

    const { GET } = await import("../route");
    const res = await GET();
    const xml = await res.text();
    // changelog deep-link 형식 (#anchor) 노출
    expect(xml).toMatch(/moneyballscore\.vercel\.app\/changelog#/);
    // Cycle 번호 라벨 또는 changelog 본문 markup 정리 (# / * 제거) 자취
    expect(xml).toMatch(/Cycle \d+/);
  });

  // cycle 2329 explore-idea — MLB 예측 RSS 항목 신규 추가 (KBO 전용이던 feed 확장)
  it("MLB 예측 게임 포함 — 종료 경기는 적중/실패 태그 + 스코어 표기", async () => {
    gamesResult = { data: [], error: null };
    mlbPredResult = {
      data: [
        { external_game_id: "mlb-1", home_win_prob: 0.62, mlb_game_date: "2026-08-19" },
      ],
      error: null,
    };
    mlbScheduleResult = {
      data: [
        {
          external_game_id: "mlb-1",
          home_team_code: "NYY",
          away_team_code: "BOS",
          status: "final",
          home_score: 5,
          away_score: 2,
          game_datetime_utc: "2026-08-19T23:05:00Z",
        },
      ],
      error: null,
    };

    const { GET } = await import("../route");
    const res = await GET();
    const xml = await res.text();
    expect(xml).toContain("[MLB]");
    expect(xml).toContain("BOS vs NYY");
    expect(xml).toContain("[적중]");
    expect(xml).toContain("/mlb/games/2026-08-19/NYY-vs-BOS");
  });

  it("MLB predictions select error → assertSelectOk throw", async () => {
    gamesResult = { data: [], error: null };
    mlbPredResult = { data: null, error: { message: "mlb predictions boom" } };

    const { GET } = await import("../route");
    await expect(GET()).rejects.toThrow(/feed getMlbFeedItems predictions select failed/);
  });
});
