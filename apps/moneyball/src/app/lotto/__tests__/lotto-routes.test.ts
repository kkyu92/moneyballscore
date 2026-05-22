import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import robots from "@/app/robots";
import {
  generateMetadata as archiveGenerateMetadata,
} from "@/app/lotto/archive/[date]/page";
import { metadata as notFoundMetadata } from "@/app/lotto/archive/[date]/not-found";
import {
  metadata as methodologyMetadata,
} from "@/app/lotto/methodology/page";
import sitemap from "@/app/sitemap";
import { listArchiveDates } from "@/lib/lotto/archive";

const REPO_ROOT = process.cwd();
const METHODOLOGY_SRC = join(
  REPO_ROOT,
  "src/app/lotto/methodology/page.tsx",
);
const ARCHIVE_SRC = join(
  REPO_ROOT,
  "src/app/lotto/archive/[date]/page.tsx",
);
const SITEMAP_SRC = join(REPO_ROOT, "src/app/sitemap.ts");

describe("/lotto/methodology metadata + module load", () => {
  it("metadata title + canonical 박제", () => {
    expect(methodologyMetadata.title).toBe("Lotto 통계 방법론");
    expect(methodologyMetadata.alternates?.canonical).toBe(
      "https://moneyballscore.vercel.app/lotto/methodology",
    );
  });

  it("OG type article + Twitter summary_large_image", () => {
    const og = methodologyMetadata.openGraph as { type?: string } | undefined;
    const tw = methodologyMetadata.twitter as { card?: string } | undefined;
    expect(og?.type).toBe("article");
    expect(tw?.card).toBe("summary_large_image");
  });
});

describe("/lotto/archive/[date] indexable metadata (plan #6 Step A regression)", () => {
  it("metadata.robots.index === true + follow === true (Alt 3 변형)", async () => {
    const meta = await archiveGenerateMetadata({
      params: Promise.resolve({ date: "2026-05-16" }),
    });
    const robotsMeta = meta.robots;
    expect(robotsMeta).toBeTruthy();
    if (typeof robotsMeta === "object" && robotsMeta !== null) {
      expect(robotsMeta.index).toBe(true);
      expect(robotsMeta.follow).toBe(true);
    } else {
      throw new Error("robots metadata expected object");
    }
  });

  it("googleBot index/follow true (검색 색인 활성)", async () => {
    const meta = await archiveGenerateMetadata({
      params: Promise.resolve({ date: "2026-05-16" }),
    });
    const robotsMeta = meta.robots;
    if (
      typeof robotsMeta === "object" &&
      robotsMeta !== null &&
      typeof robotsMeta.googleBot === "object" &&
      robotsMeta.googleBot !== null
    ) {
      expect(robotsMeta.googleBot.index).toBe(true);
      expect(robotsMeta.googleBot.follow).toBe(true);
    } else {
      throw new Error("googleBot metadata expected object");
    }
  });

  it("alternates.canonical 박제 (date 별 unique URL)", async () => {
    const meta = await archiveGenerateMetadata({
      params: Promise.resolve({ date: "2026-05-16" }),
    });
    expect(meta.alternates?.canonical).toBe(
      "https://moneyballscore.vercel.app/lotto/archive/2026-05-16",
    );
  });
});

describe("/lotto/archive/[date]/not-found.tsx — noindex metadata (cycle 799 v13-A 정합)", () => {
  it("metadata.robots.index === false + follow === false", () => {
    const robotsMeta = notFoundMetadata.robots;
    expect(robotsMeta).toBeTruthy();
    if (typeof robotsMeta === "object" && robotsMeta !== null) {
      expect(robotsMeta.index).toBe(false);
      expect(robotsMeta.follow).toBe(false);
    } else {
      throw new Error("not-found robots metadata expected object");
    }
  });
});

interface RobotsRule {
  userAgent?: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
  crawlDelay?: number;
}

describe("robots.ts — Alt 3 변형 (plan #6 Step A)", () => {
  const r = robots();
  const rules = (Array.isArray(r.rules) ? r.rules : [r.rules]) as RobotsRule[];

  const findRule = (ua: string): RobotsRule | undefined =>
    rules.find((x) =>
      Array.isArray(x.userAgent) ? x.userAgent.includes(ua) : x.userAgent === ua,
    );

  it("User-agent * — /lotto/archive disallow 부재 (검색 색인 활성)", () => {
    const rule = findRule("*");
    expect(rule).toBeTruthy();
    const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
    expect(dis).not.toContain("/lotto/archive");
    expect(dis).not.toContain("/lotto");
  });

  it("Googlebot — /lotto/archive disallow 부재 (검색 색인 활성)", () => {
    const rule = findRule("Googlebot");
    expect(rule).toBeTruthy();
    const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
    expect(dis).not.toContain("/lotto/archive");
    expect(dis).not.toContain("/lotto");
  });

  it("Mediapartners-Google — /lotto + /lotto/archive 양쪽 sub-tree disallow 명시 (AdSense 차단)", () => {
    const rule = findRule("Mediapartners-Google");
    expect(rule).toBeTruthy();
    const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
    expect(dis).toContain("/lotto");
    expect(dis).toContain("/lotto/archive");
  });

  it("AdsBot-Google — /lotto + /lotto/archive 양쪽 sub-tree disallow 명시 (AdSense 차단)", () => {
    const rule = findRule("AdsBot-Google");
    expect(rule).toBeTruthy();
    const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
    expect(dis).toContain("/lotto");
    expect(dis).toContain("/lotto/archive");
  });
});

describe("sitemap.ts — /lotto/archive 동적 URL 포함 + /lotto/methodology static entry", () => {
  const src = readFileSync(SITEMAP_SRC, "utf-8");

  it("/lotto/methodology entry 박제", () => {
    expect(src).toMatch(/\/lotto\/methodology/);
  });

  it("lottoArchiveRoutes 동적 URL 박제 (listArchiveDates source)", () => {
    expect(src).toMatch(/lottoArchiveRoutes/);
    expect(src).toMatch(/listArchiveDates/);
  });

  it("lottoArchiveRoutes priority 0.6 + lastModified T20:45+09:00 정합", () => {
    expect(src).toMatch(/priority:\s*0\.6/);
    expect(src).toMatch(/T20:45:00\+09:00/);
  });

  it("sitemap() 호출 시 lottoArchiveRoutes entry 생성 (실제 박제된 date 있을 때)", async () => {
    const entries = await sitemap();
    const archiveDates = listArchiveDates();
    if (archiveDates.length > 0) {
      const archiveEntries = entries.filter((e) =>
        e.url.startsWith("https://moneyballscore.vercel.app/lotto/archive/"),
      );
      expect(archiveEntries.length).toBe(archiveDates.length);
      const firstDate = archiveDates[0];
      const sampleEntry = archiveEntries.find((e) =>
        e.url.endsWith(`/lotto/archive/${firstDate}`),
      );
      expect(sampleEntry).toBeTruthy();
      expect(sampleEntry?.priority).toBe(0.6);
      expect(sampleEntry?.changeFrequency).toBe("weekly");
    }
  });
});

describe("/lotto/archive/[date] — Breadcrumb 박제 (info-arch regression guard)", () => {
  const src = readFileSync(ARCHIVE_SRC, "utf-8");

  it("Breadcrumb import 박제", () => {
    expect(src).toMatch(/import\s*\{\s*Breadcrumb\s*\}\s*from\s*"@\/components\/shared\/Breadcrumb"/);
  });

  it("<Breadcrumb> render + /lotto/methodology href + date label", () => {
    expect(src).toMatch(/<Breadcrumb/);
    expect(src).toMatch(/href:\s*"\/lotto\/methodology"/);
    expect(src).toMatch(/label:\s*"Lotto 통계"/);
  });
});

describe("/lotto/methodology — AdSense surface signal grep (정체성 보존)", () => {
  const src = readFileSync(METHODOLOGY_SRC, "utf-8");
  const visibleText = src
    .split("\n")
    .filter((line) => !line.trim().startsWith("//") && !line.includes("당첨/베팅"))
    .join("\n");

  const forbiddenLiteral = ["당첨 번호", "베팅 추천", "조합 추천", "예상번호"];

  for (const term of forbiddenLiteral) {
    it(`"${term}" 표면 신호 0건`, () => {
      expect(visibleText).not.toContain(term);
    });
  }
});
