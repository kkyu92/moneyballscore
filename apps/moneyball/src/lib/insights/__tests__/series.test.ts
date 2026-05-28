import { describe, it, expect } from "vitest";
import {
  formatSeriesTopic,
  parseSeriesTopic,
  listSeriesTopics,
} from "../series";
import {
  buildSportsEventJsonLd,
  buildArticleJsonLd,
  buildBreadcrumbListJsonLd,
  buildSportsTeamJsonLd,
  buildPersonJsonLd,
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

describe("seo/json-ld helpers", () => {
  it("buildSportsEventJsonLd shape — SportsEvent + 필수 필드", () => {
    const ld = buildSportsEventJsonLd({
      gameId: 42,
      homeTeam: "LG",
      awayTeam: "HT",
      gameDate: "2026-05-28",
      gameTime: "18:30",
      status: "scheduled",
    });
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("SportsEvent");
    expect(ld.sport).toBe("Baseball");
    expect(ld.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(ld.name).toContain("KIA");
    expect(ld.name).toContain("LG");
    expect(ld.startDate).toBe("2026-05-28T18:30:00+09:00");
    expect(ld.url).toBe(`${SITE_URL}/analysis/game/42`);
    expect(ld.homeTeam.name).toBe("LG 트윈스");
    expect(ld.awayTeam.name).toBe("KIA 타이거즈");
    expect(ld.location.name).toContain("서울");
  });

  it("buildSportsEventJsonLd — final 상태 = EventCompleted, postponed = EventPostponed", () => {
    const final = buildSportsEventJsonLd({
      gameId: 1,
      homeTeam: "LG",
      awayTeam: "HT",
      gameDate: "2026-05-28",
      status: "final",
    });
    expect(final.eventStatus).toBe("https://schema.org/EventCompleted");

    const postponed = buildSportsEventJsonLd({
      gameId: 2,
      homeTeam: "LG",
      awayTeam: "HT",
      gameDate: "2026-05-28",
      status: "postponed",
    });
    expect(postponed.eventStatus).toBe("https://schema.org/EventPostponed");
  });

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

  it("buildSportsTeamJsonLd + buildPersonJsonLd basic shape", () => {
    const team = buildSportsTeamJsonLd({ team: "LG" });
    expect(team["@type"]).toBe("SportsTeam");
    expect(team.sport).toBe("Baseball");
    expect(team.url).toBe(`${SITE_URL}/teams/lg`);

    const person = buildPersonJsonLd({
      name: "오스틴 딘",
      jobTitle: "First Baseman",
      team: "LG",
    });
    expect(person["@type"]).toBe("Person");
    expect(person.jobTitle).toBe("First Baseman");
    expect((person as { affiliation: { name: string } }).affiliation.name).toBe(
      "LG 트윈스",
    );
  });
});
