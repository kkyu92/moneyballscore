import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import robots from "@/app/robots";
import {
  generateMetadata as archiveGenerateMetadata,
} from "@/app/lotto/archive/[date]/page";
import {
  metadata as methodologyMetadata,
} from "@/app/lotto/methodology/page";

const REPO_ROOT = process.cwd();
const METHODOLOGY_SRC = join(
  REPO_ROOT,
  "src/app/lotto/methodology/page.tsx",
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
    expect(methodologyMetadata.openGraph?.type).toBe("article");
    expect(methodologyMetadata.twitter?.card).toBe("summary_large_image");
  });
});

describe("/lotto/archive/[date] noindex metadata (regression guard)", () => {
  it("metadata.robots.index === false + follow === false", async () => {
    const meta = await archiveGenerateMetadata({
      params: Promise.resolve({ date: "2026-05-16" }),
    });
    const robotsMeta = meta.robots;
    expect(robotsMeta).toBeTruthy();
    if (typeof robotsMeta === "object" && robotsMeta !== null) {
      expect(robotsMeta.index).toBe(false);
      expect(robotsMeta.follow).toBe(false);
    } else {
      throw new Error("robots metadata expected object");
    }
  });

  it("googleBot index/follow false", async () => {
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
      expect(robotsMeta.googleBot.index).toBe(false);
      expect(robotsMeta.googleBot.follow).toBe(false);
    } else {
      throw new Error("googleBot metadata expected object");
    }
  });
});

describe("robots.ts — /lotto/archive disallow rules (regression guard)", () => {
  const r = robots();

  it("User-agent * disallow /lotto/archive", () => {
    const rule = r.rules.find((x) =>
      Array.isArray(x.userAgent) ? x.userAgent.includes("*") : x.userAgent === "*",
    );
    expect(rule).toBeTruthy();
    const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
    expect(dis).toContain("/lotto/archive");
  });

  it("Googlebot disallow /lotto/archive", () => {
    const rule = r.rules.find((x) =>
      Array.isArray(x.userAgent)
        ? x.userAgent.includes("Googlebot")
        : x.userAgent === "Googlebot",
    );
    expect(rule).toBeTruthy();
    const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
    expect(dis).toContain("/lotto/archive");
  });

  it("Mediapartners-Google + AdsBot-Google disallow /lotto/archive", () => {
    for (const ua of ["Mediapartners-Google", "AdsBot-Google"]) {
      const rule = r.rules.find((x) =>
        Array.isArray(x.userAgent) ? x.userAgent.includes(ua) : x.userAgent === ua,
      );
      expect(rule, `${ua} rule`).toBeTruthy();
      const dis = Array.isArray(rule!.disallow) ? rule!.disallow : [rule!.disallow];
      expect(dis, `${ua} disallow`).toContain("/lotto/archive");
    }
  });
});

describe("sitemap.ts — /lotto/archive 미포함 + /lotto/methodology 포함 (source-level guard)", () => {
  const src = readFileSync(SITEMAP_SRC, "utf-8");

  it("/lotto/methodology entry 박제", () => {
    expect(src).toMatch(/\/lotto\/methodology/);
  });

  it("/lotto/archive sitemap entry 부재 (noindex 정합)", () => {
    const archiveEntries = src
      .split("\n")
      .filter((line) => /url:.*\/lotto\/archive/.test(line));
    expect(archiveEntries).toEqual([]);
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
