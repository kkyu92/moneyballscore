import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { metadata as hubMetadata } from "@/app/v2-preview/page";

const REPO_ROOT = process.cwd();
const HUB_SRC = readFileSync(
  join(REPO_ROOT, "src/app/v2-preview/page.tsx"),
  "utf8",
);
const OG_SRC = readFileSync(
  join(REPO_ROOT, "src/app/v2-preview/opengraph-image.tsx"),
  "utf8",
);
const TWITTER_SRC = readFileSync(
  join(REPO_ROOT, "src/app/v2-preview/twitter-image.tsx"),
  "utf8",
);
const FOOTER_SRC = readFileSync(
  join(REPO_ROOT, "src/components/layout/Footer.tsx"),
  "utf8",
);
const SITEMAP_SRC = readFileSync(
  join(REPO_ROOT, "src/app/sitemap.ts"),
  "utf8",
);

const SITE_URL = "https://moneyballscore.vercel.app";

describe("/v2-preview metadata (noindex surface signal isolation)", () => {
  it("robots index=false follow=false 강제", () => {
    const r = hubMetadata.robots;
    expect(r).toBeTruthy();
    if (typeof r === "object" && r !== null) {
      expect(r.index).toBe(false);
      expect(r.follow).toBe(false);
    }
  });

  it("canonical URL 박제", () => {
    expect(hubMetadata.alternates?.canonical).toBe(`${SITE_URL}/v2-preview`);
  });

  it("title 'v2 시뮬레이션 미리보기'", () => {
    expect(hubMetadata.title).toBe("v2 시뮬레이션 미리보기");
  });
});

describe("/v2-preview page render shape", () => {
  it("disclaimer banner 박제 — '내부 시뮬레이션입니다'", () => {
    expect(HUB_SRC).toContain("내부 시뮬레이션입니다");
  });

  it("Breadcrumb wire", () => {
    expect(HUB_SRC).toContain("Breadcrumb");
    expect(HUB_SRC).toContain("v2 시뮬레이션 미리보기");
  });

  it("v2.1-B 가중치 grid 박제", () => {
    expect(HUB_SRC).toContain("V2_1_B_WEIGHTS");
    expect(HUB_SRC).toContain("v1.8 vs v2.1-B");
  });

  it("관련 자료 nav 3 chip (methodology / accuracy / changelog)", () => {
    expect(HUB_SRC).toContain('href="/methodology"');
    expect(HUB_SRC).toContain('href="/accuracy"');
    expect(HUB_SRC).toContain('href="/changelog"');
  });

  it("ISR 24h revalidate — DASHBOARD_ISR_SECONDS (silent drift wave 131 cycle 1350)", () => {
    expect(HUB_SRC).not.toMatch(/revalidate\s*=\s*86400/);
    expect(HUB_SRC).toMatch(/revalidate\s*=\s*DASHBOARD_ISR_SECONDS/);
  });
});

describe("/v2-preview OG/Twitter image File Convention", () => {
  it("opengraph-image.tsx — runtime nodejs + 1200x630 + image/png", () => {
    expect(OG_SRC).toContain('runtime = "nodejs"');
    expect(OG_SRC).toContain("width: 1200");
    expect(OG_SRC).toContain("height: 630");
    expect(OG_SRC).toContain('contentType = "image/png"');
  });

  it("opengraph-image alt — internal preview 정체성", () => {
    expect(OG_SRC).toContain("v2 Simulation Preview");
    expect(OG_SRC).toContain("Internal");
  });

  it("twitter-image.tsx — opengraph-image re-export + statically parsable", () => {
    expect(TWITTER_SRC).toContain('export { default } from "./opengraph-image"');
    expect(TWITTER_SRC).toContain('runtime = "nodejs"');
    expect(TWITTER_SRC).toContain("width: 1200");
    expect(TWITTER_SRC).toContain('contentType = "image/png"');
  });
});

describe("Footer 도움말 group entry", () => {
  it("'v2 시뮬레이션 미리보기' entry 박제", () => {
    expect(FOOTER_SRC).toContain('"/v2-preview"');
    expect(FOOTER_SRC).toContain("v2 시뮬레이션 미리보기");
  });
});

describe("sitemap noindex 정합", () => {
  it("/v2-preview URL 미포함 (noindex page)", () => {
    expect(SITEMAP_SRC).not.toContain("v2-preview");
  });
});
