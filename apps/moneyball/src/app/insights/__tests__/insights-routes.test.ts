import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { metadata as hubMetadata } from "@/app/insights/page";
import { generateMetadata as dateGenerateMetadata } from "@/app/insights/[date]/page";
import {
  selectTopFactors,
  TOP_FACTOR_LIMIT,
} from "@/lib/insights/topFactors";

const REPO_ROOT = process.cwd();
const HUB_SRC = readFileSync(
  join(REPO_ROOT, "src/app/insights/page.tsx"),
  "utf8",
);
const DATE_SRC = readFileSync(
  join(REPO_ROOT, "src/app/insights/[date]/page.tsx"),
  "utf8",
);
const SITEMAP_SRC = readFileSync(
  join(REPO_ROOT, "src/app/sitemap.ts"),
  "utf8",
);

const SITE_URL = "https://moneyballscore.vercel.app";

describe("/insights hub metadata", () => {
  it("title + canonical 박제", () => {
    expect(hubMetadata.title).toBe("AI 인사이트");
    expect(hubMetadata.alternates?.canonical).toBe(`${SITE_URL}/insights`);
  });

  it("OG type article + Twitter summary_large_image", () => {
    const og = hubMetadata.openGraph as { type?: string; url?: string } | undefined;
    const tw = hubMetadata.twitter as { card?: string } | undefined;
    expect(og?.type).toBe("article");
    expect(og?.url).toBe(`${SITE_URL}/insights`);
    expect(tw?.card).toBe("summary_large_image");
  });
});

describe("/insights/[date] generateMetadata", () => {
  it("invalid date → robots noindex + nofollow", async () => {
    const meta = await dateGenerateMetadata({
      params: Promise.resolve({ date: "2026-13-99" }),
    });
    const r = meta.robots;
    expect(r).toBeTruthy();
    if (typeof r === "object" && r !== null) {
      expect(r.index).toBe(false);
      expect(r.follow).toBe(false);
    } else {
      throw new Error("robots metadata expected object");
    }
  });

  it("valid date → canonical + OG type article + publishedTime KST 00:00 + locale ko_KR", async () => {
    const date = "2026-05-21";
    const meta = await dateGenerateMetadata({
      params: Promise.resolve({ date }),
    });
    expect(meta.title).toBe(`${date} AI 인사이트`);
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/insights/${date}`);
    const og = meta.openGraph as {
      type?: string;
      url?: string;
      publishedTime?: string;
      locale?: string;
    } | undefined;
    expect(og?.type).toBe("article");
    expect(og?.url).toBe(`${SITE_URL}/insights/${date}`);
    expect(og?.publishedTime).toBe(`${date}T00:00:00+09:00`);
    expect(og?.locale).toBe("ko_KR");
  });

  it("invalid format (e.g. 1999-12-31, 26-05-21) → robots noindex", async () => {
    for (const bad of ["1999-12-31", "26-05-21", "2026/05/21", ""]) {
      const meta = await dateGenerateMetadata({
        params: Promise.resolve({ date: bad }),
      });
      const r = meta.robots;
      if (typeof r === "object" && r !== null) {
        expect(r.index).toBe(false);
      } else {
        throw new Error(`bad date ${bad} expected noindex metadata`);
      }
    }
  });
});

describe("/insights hub Article JSON-LD shape (regression guard)", () => {
  it('@context schema.org + @type Article + @id PAGE_URL', () => {
    expect(HUB_SRC).toMatch(/"@context":\s*"https:\/\/schema\.org"/);
    expect(HUB_SRC).toMatch(/"@type":\s*"Article"/);
    expect(HUB_SRC).toMatch(/"@id":\s*PAGE_URL/);
  });

  it("inLanguage ko-KR + datePublished + dateModified", () => {
    expect(HUB_SRC).toMatch(/inLanguage:\s*"ko-KR"/);
    expect(HUB_SRC).toMatch(/datePublished:\s*"2026-05-21"/);
    expect(HUB_SRC).toMatch(/dateModified:\s*latestDate/);
  });

  it("Organization author + publisher + mainEntityOfPage", () => {
    expect(HUB_SRC).toMatch(/"@type":\s*"Organization"/);
    expect(HUB_SRC).toMatch(/mainEntityOfPage:\s*PAGE_URL/);
    expect(HUB_SRC).toMatch(/name:\s*"MoneyBall Score"/);
  });

  it("application/ld+json script wire + dangerouslySetInnerHTML", () => {
    expect(HUB_SRC).toMatch(/type="application\/ld\+json"/);
    expect(HUB_SRC).toMatch(/dangerouslySetInnerHTML/);
  });
});

describe("/insights/[date] Article JSON-LD shape (regression guard)", () => {
  it("@context + @type Article + @id pageUrl per-date", () => {
    expect(DATE_SRC).toMatch(/"@context":\s*"https:\/\/schema\.org"/);
    expect(DATE_SRC).toMatch(/"@type":\s*"Article"/);
    expect(DATE_SRC).toMatch(/"@id":\s*pageUrl/);
  });

  it("datePublished + dateModified per date with KST offset", () => {
    expect(DATE_SRC).toMatch(/datePublished:\s*`\$\{date\}T00:00:00\+09:00`/);
    expect(DATE_SRC).toMatch(/dateModified:\s*`\$\{date\}T00:00:00\+09:00`/);
  });

  it("force-static + dynamicParams false + revalidate INSIGHTS_ISR_SECONDS ISR", () => {
    expect(DATE_SRC).toMatch(/dynamic\s*=\s*"force-static"/);
    expect(DATE_SRC).toMatch(/dynamicParams\s*=\s*false/);
    expect(DATE_SRC).not.toMatch(/revalidate\s*=\s*INSIGHTS_ISR_SECONDS/);
    expect(DATE_SRC).toMatch(/revalidate\s*=\s*86400/);
  });

  it("generateStaticParams uses listInsightsDates(90)", () => {
    expect(DATE_SRC).toMatch(/listInsightsDates\(90\)/);
  });
});

describe("/insights hub data fetch shape (regression guard)", () => {
  it("predictions select with FK alias home_team:teams!games_home_team_id_fkey", () => {
    expect(HUB_SRC).toMatch(
      /home_team:teams!games_home_team_id_fkey\(code\)/,
    );
    expect(HUB_SRC).toMatch(
      /away_team:teams!games_away_team_id_fkey\(code\)/,
    );
  });

  it("prediction_type pre_game filter", () => {
    expect(HUB_SRC).toMatch(/\.eq\("prediction_type",\s*"pre_game"\)/);
  });

  it("LIMIT 30 entries + over-fetch 4x", () => {
    expect(HUB_SRC).toMatch(/const LIMIT = 30/);
    expect(HUB_SRC).toMatch(/limit\(LIMIT \* 4\)/);
  });

  it("home_team_code / away_team_code 직접 컬럼 참조 X (사례 12 silent drift family guard)", () => {
    expect(HUB_SRC).not.toMatch(/home_team_code/);
    expect(HUB_SRC).not.toMatch(/away_team_code/);
  });
});

describe("/insights/[date] FactorBreakdown integration (plan #5 Step 3 regression guard)", () => {
  it("FactorBreakdown import wire", () => {
    expect(DATE_SRC).toMatch(
      /import\s*\{\s*FactorBreakdown\s*\}\s*from\s*"@\/components\/predictions\/FactorBreakdown"/,
    );
  });

  it("FactorBreakdown render after JudgeReasoningCard with item.factors guard", () => {
    expect(DATE_SRC).toMatch(/item\.factors\s*&&\s*\(/);
    expect(DATE_SRC).toMatch(
      /<FactorBreakdown[\s\S]*?factors=\{item\.factors\}[\s\S]*?homeTeam=\{item\.homeTeam\}[\s\S]*?awayTeam=\{item\.awayTeam\}/,
    );
  });
});

describe("insights loader factors column (plan #5 Step 2 regression guard)", () => {
  const LOADER_SRC = readFileSync(
    join(REPO_ROOT, "src/lib/insights/loader.ts"),
    "utf8",
  );

  it("InsightEntry interface includes factors Record<string,number> | null", () => {
    expect(LOADER_SRC).toMatch(
      /factors:\s*Record<string,\s*number>\s*\|\s*null/,
    );
  });

  it("getInsightsForDate select clause includes factors column", () => {
    expect(LOADER_SRC).toMatch(/"is_correct,\s*reasoning,\s*factors,/);
  });

  it("home_team_code / away_team_code 직접 컬럼 참조 X (사례 12/14 silent drift family guard)", () => {
    expect(LOADER_SRC).not.toMatch(/home_team_code/);
    expect(LOADER_SRC).not.toMatch(/away_team_code/);
  });
});

describe("sitemap.ts /insights URL coverage (regression guard)", () => {
  it("/insights hub URL priority 0.75 daily", () => {
    expect(SITEMAP_SRC).toMatch(
      /url:\s*`\$\{baseUrl\}\/insights`,[\s\S]*?priority:\s*0\.75/,
    );
  });

  it("insightsDateRoutes dynamic 90 day entries push", () => {
    expect(SITEMAP_SRC).toMatch(/insightsDateRoutes/);
    expect(SITEMAP_SRC).toMatch(/listInsightsDates\(90\)/);
    expect(SITEMAP_SRC).toMatch(/`\$\{baseUrl\}\/insights\/\$\{d\}`/);
  });
});

describe("/insights hub mini factor preview (plan #5 Step 4 regression guard)", () => {
  it("getRecentInsights select clause includes factors column", () => {
    expect(HUB_SRC).toMatch(/"confidence,\s*is_correct,\s*reasoning,\s*factors,/);
  });

  it("InsightRow interface includes factors Record<string,number> | null", () => {
    expect(HUB_SRC).toMatch(
      /factors:\s*Record<string,\s*number>\s*\|\s*null/,
    );
  });

  it("selectTopFactors import from topFactors.ts (extracted helper, plan #5 Step 5)", () => {
    expect(HUB_SRC).toMatch(
      /import\s*\{\s*selectTopFactors\s*\}\s*from\s*"@\/lib\/insights\/topFactors"/,
    );
  });

  it("mini factor preview render block with data-mini-factor-preview attr", () => {
    expect(HUB_SRC).toMatch(/data-mini-factor-preview/);
    expect(HUB_SRC).toMatch(/topFactors\.length\s*>\s*0/);
  });

  it("전체 팩터 보기 anchor link to /insights/${date}#factor-breakdown-${gameId} (cycle 886 deep link)", () => {
    expect(HUB_SRC).toMatch(
      /href=\{`\/insights\/\$\{item\.date\}#factor-breakdown-\$\{item\.gameId\}`\}/,
    );
    expect(HUB_SRC).toMatch(/전체 팩터 보기/);
  });
});

describe("FactorBreakdown — gameId deep link anchor (cycle 886)", () => {
  const FB_SRC = readFileSync(
    join(REPO_ROOT, "src/components/predictions/FactorBreakdown.tsx"),
    "utf-8",
  );

  it("gameId prop 박제 + id=factor-breakdown-${gameId}", () => {
    expect(FB_SRC).toMatch(/gameId\?:\s*number\s*\|\s*string/);
    expect(FB_SRC).toMatch(/factor-breakdown-\$\{gameId\}/);
  });

  it("scroll-mt-20 박제 (header sticky offset)", () => {
    expect(FB_SRC).toMatch(/scroll-mt-20/);
  });
});

describe("selectTopFactors behavior (plan #5 Step 5 — extracted helper unit test)", () => {
  it("(1) null factors → 빈 배열 (factors 부재 시 skip)", () => {
    expect(selectTopFactors(null)).toEqual([]);
  });

  it("(2) 빈 객체 / FACTOR_LABELS 미매칭 키 / 비정상 값 모두 filter (null-safe normalize)", () => {
    expect(selectTopFactors({})).toEqual([]);
    expect(selectTopFactors({ unknown_key: 0.9 })).toEqual([]);
    expect(
      selectTopFactors({
        sp_fip: Number.NaN,
        bullpen_fip: Number.POSITIVE_INFINITY,
        elo: 0.7,
      }),
    ).toEqual([
      { key: "elo", label: expect.any(String), pct: 70, favorable: "home" },
    ]);
  });

  it("(3) abs(value - 0.5) 거리 desc 정렬 + TOP_FACTOR_LIMIT=3 슬라이스", () => {
    const factors = {
      sp_fip: 0.52,
      bullpen_fip: 0.85,
      lineup_woba: 0.15,
      recent_form: 0.5,
      elo: 0.7,
      war: 0.55,
    };
    const top = selectTopFactors(factors);
    expect(top).toHaveLength(TOP_FACTOR_LIMIT);
    expect(top[0].key).toBe("bullpen_fip");
    expect(top[1].key).toBe("lineup_woba");
    expect(top[2].key).toBe("elo");
  });

  it("(4) favorable home / away / neutral 분류 (NEUTRAL 0.45~0.55 경계)", () => {
    const factors = {
      sp_fip: 0.7,
      bullpen_fip: 0.3,
      elo: 0.5,
    };
    const top = selectTopFactors(factors);
    expect(top.find((f) => f.key === "sp_fip")?.favorable).toBe("home");
    expect(top.find((f) => f.key === "bullpen_fip")?.favorable).toBe("away");
    expect(top.find((f) => f.key === "elo")?.favorable).toBe("neutral");
  });

  it("(5) pct = Math.round(value * 100) (정수 % 박제)", () => {
    const factors = { sp_fip: 0.723, elo: 0.314 };
    const top = selectTopFactors(factors);
    expect(top.find((f) => f.key === "sp_fip")?.pct).toBe(72);
    expect(top.find((f) => f.key === "elo")?.pct).toBe(31);
  });
});
