import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatSeriesTopic,
  parseSeriesTopic,
  listSeriesTopics,
} from "../series";
import {
  buildArticleJsonLd,
  buildBreadcrumbListJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";

describe("insights/series topic helpers", () => {
  it("formatSeriesTopic — alphabetic canonical (LG vs HT → ht-vs-lg)", () => {
    expect(formatSeriesTopic("LG", "HT")).toBe("ht-vs-lg");
    expect(formatSeriesTopic("HT", "LG")).toBe("ht-vs-lg");
    expect(formatSeriesTopic("KT", "NC")).toBe("kt-vs-nc");
  });

  it("parseSeriesTopic — canonical slug → SeriesTopic", () => {
    const topic = parseSeriesTopic("ht-vs-lg");
    expect(topic).not.toBeNull();
    expect(topic!.team1).toBe("HT");
    expect(topic!.team2).toBe("LG");
    expect(topic!.slug).toBe("ht-vs-lg");
  });

  it("parseSeriesTopic — invalid 입력 reject (non-canonical, same team, unknown code, garbage)", () => {
    // non-canonical order (LG > HT alphabetically) → null (redirect to canonical 권장)
    expect(parseSeriesTopic("lg-vs-ht")).toBeNull();
    // same team
    expect(parseSeriesTopic("lg-vs-lg")).toBeNull();
    // unknown team code
    expect(parseSeriesTopic("xx-vs-yy")).toBeNull();
    // garbage
    expect(parseSeriesTopic("")).toBeNull();
    expect(parseSeriesTopic("not-a-slug")).toBeNull();
    expect(parseSeriesTopic("lg-vs")).toBeNull();
    expect(parseSeriesTopic("lg")).toBeNull();
  });

  it("listSeriesTopics — 10 choose 2 = 45 canonical pairs, 모두 distinct", () => {
    const topics = listSeriesTopics();
    expect(topics).toHaveLength(45);

    const slugs = new Set(topics.map((t) => t.slug));
    expect(slugs.size).toBe(45);

    // 각 slug 가 canonical (alphabetic sort)
    for (const t of topics) {
      const [a, b] = t.slug.split("-vs-");
      expect(a < b).toBe(true);
    }
  });
});

describe("getSeriesByTopic — CE cohort inclusion (cycle 3061)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("scoring_rule 은 in()으로 PRODUCTION_COHORT_RULES(v1.8 + v1.8-credit-fail) 전체 포함 — CURRENT_MODEL_FILTER exact-match 사용 금지 (CE row silent 배제 재발 방지)", async () => {
    const inSpy = vi.fn().mockReturnThis();
    const matchSpy = vi.fn().mockReturnThis();
    const builder: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      match: matchSpy,
      eq: vi.fn().mockReturnThis(),
      in: inSpy,
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.resetModules();
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ from: () => builder }),
    }));

    const { getSeriesByTopic: freshGetSeriesByTopic } = await import("../series");
    await freshGetSeriesByTopic({ team1: "HT", team2: "LG", slug: "ht-vs-lg" });

    expect(inSpy).toHaveBeenCalledWith(
      "scoring_rule",
      expect.arrayContaining(["v1.8", "v1.8-credit-fail"]),
    );
    expect(matchSpy).not.toHaveBeenCalled();
  });
});

describe("seo/json-ld helpers", () => {
  it("buildArticleJsonLd shape — Article + ko-KR + Organization author/publisher", () => {
    const ld = buildArticleJsonLd({
      url: `${SITE_URL}/insights/series/ht-vs-lg`,
      headline: "KIA vs LG 시리즈",
      description: "AI 인사이트 시리즈",
      datePublished: "2026-05-28",
    });
    expect(ld["@type"]).toBe("Article");
    expect(ld.inLanguage).toBe("ko-KR");
    expect(ld.author.name).toBe("MoneyBall Score");
    expect(ld.publisher.name).toBe("MoneyBall Score");
    expect(ld.dateModified).toBe("2026-05-28");
    expect(ld.mainEntityOfPage).toBe(ld.url);
  });

  it("buildBreadcrumbListJsonLd — position 1-indexed", () => {
    const ld = buildBreadcrumbListJsonLd([
      { name: "홈", url: SITE_URL },
      { name: "AI 인사이트", url: `${SITE_URL}/insights` },
      { name: "KIA vs LG", url: `${SITE_URL}/insights/series/ht-vs-lg` },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[2].position).toBe(3);
    expect(ld.itemListElement[2].name).toBe("KIA vs LG");
  });
});
