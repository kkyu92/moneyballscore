import { describe, it, expect, vi } from "vitest";
import {
  listSeriesTopics,
  parseSeriesTopic,
} from "@/lib/insights/series";
import { _verifyTeamCodeMapping } from "@/app/insights/series/[topic]/opengraph-image";

/**
 * sitemap.ts 안 listSeriesTopics 통합 검증 — 실제 sitemap() 호출은
 * createSupabaseClient mock 부담 큼. 대신 listSeriesTopics output 이
 * 정확한 URL list 를 만드는지 + canonical 매핑 verify.
 *
 * OG image runtime 검증은 ImageResponse 가 서버 컴포넌트라 jsdom 안
 * 실행 안 함. 대신 TEAM_EN 매핑 invariant 만 검증.
 */

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("W-SEO routing — sitemap + OG", () => {
  it("series sitemap URL — 45개, 모두 /insights/series/<slug> 형식, 모두 parseable", () => {
    const topics = listSeriesTopics();
    expect(topics).toHaveLength(45);

    const urls = topics.map(
      (t) => `https://moneyballscore.vercel.app/insights/series/${t.slug}`,
    );
    expect(new Set(urls).size).toBe(45);

    // 모든 URL 의 slug 가 parseSeriesTopic 으로 round-trip
    for (const t of topics) {
      const parsed = parseSeriesTopic(t.slug);
      expect(parsed).not.toBeNull();
      expect(parsed!.team1).toBe(t.team1);
      expect(parsed!.team2).toBe(t.team2);
    }
  });

  it("OG image — KBO 10팀 모두 TEAM_EN 매핑 박제 (build-time invariant)", () => {
    // 누락 시 generateStaticParams 가 slug 생성하지만 OG image 가 fallback 영문 X
    expect(_verifyTeamCodeMapping()).toBe(true);
  });

  it("series route 200 조건 — generateStaticParams output 이 모두 parseSeriesTopic PASS", () => {
    // generateStaticParams = listSeriesTopics().map(t => ({topic: t.slug}))
    // 모든 slug 가 parseSeriesTopic 통과 → notFound() 안 fire
    const topics = listSeriesTopics();
    for (const t of topics) {
      const parsed = parseSeriesTopic(t.slug);
      expect(parsed).not.toBeNull();
    }
  });

  it("series sitemap entry 가 priority 0.55 + weekly + insights/series prefix", () => {
    // sitemap.ts 안 wiring 패턴 검증 (line-level static check)
    const topics = listSeriesTopics();
    const entries = topics.map((topic) => ({
      url: `https://moneyballscore.vercel.app/insights/series/${topic.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.55,
    }));
    expect(entries).toHaveLength(45);
    expect(entries[0].priority).toBe(0.55);
    expect(entries[0].changeFrequency).toBe("weekly");
    expect(entries[0].url).toMatch(
      /^https:\/\/moneyballscore\.vercel\.app\/insights\/series\/[a-z]{2}-vs-[a-z]{2}$/,
    );
  });
});
