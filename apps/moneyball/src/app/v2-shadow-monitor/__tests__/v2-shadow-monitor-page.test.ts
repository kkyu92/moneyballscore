import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { metadata as pageMetadata } from "@/app/v2-shadow-monitor/page";
import {
  V2_SHADOW_MONITOR_ISR_HOURS,
  V2_SHADOW_MONITOR_ISR_SECONDS,
} from "@moneyball/shared";

const REPO_ROOT = process.cwd();
const PAGE_SRC = readFileSync(
  join(REPO_ROOT, "src/app/v2-shadow-monitor/page.tsx"),
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

describe("/v2-shadow-monitor metadata", () => {
  it("title '/v2 섀도우 모니터'", () => {
    expect(pageMetadata.title).toBe("v2 섀도우 모니터");
  });

  it("canonical URL 박제", () => {
    expect(pageMetadata.alternates?.canonical).toBe(
      `${SITE_URL}/v2-shadow-monitor`,
    );
  });

  it("noindex — 결론된 실험 archive (v1.8 확정 이후, cycle 1802 IA)", () => {
    const r = pageMetadata.robots;
    expect(typeof r === "object" && r !== null && r.index === false).toBe(true);
  });

  it("og + twitter card 박제", () => {
    expect(pageMetadata.openGraph?.url).toBe(`${SITE_URL}/v2-shadow-monitor`);
    expect(pageMetadata.twitter).toBeTruthy();
  });
});

describe("/v2-shadow-monitor page shape", () => {
  it("Breadcrumb + h1 + JSON-LD script 박제", () => {
    expect(PAGE_SRC).toContain("Breadcrumb");
    expect(PAGE_SRC).toMatch(/v2 섀도우 모니터/);
    expect(PAGE_SRC).toContain("application/ld+json");
  });

  it(`revalidate ISR 박제 (${V2_SHADOW_MONITOR_ISR_SECONDS} = ${V2_SHADOW_MONITOR_ISR_HOURS}시간)`, () => {
    expect(PAGE_SRC).toMatch(/export const revalidate = 3600\b/);
    expect(V2_SHADOW_MONITOR_ISR_SECONDS).toBe(V2_SHADOW_MONITOR_ISR_HOURS * 60 * 60);
  });

  it("loader.loadLatestCohort import + cohort fallback 메시지", () => {
    expect(PAGE_SRC).toContain("loadLatestCohort");
    expect(PAGE_SRC).toMatch(/최신 cohort 데이터를 찾을 수 없습니다/);
  });

  it("related link cluster — methodology / v2-preview / changelog / dashboard", () => {
    expect(PAGE_SRC).toContain("/methodology");
    expect(PAGE_SRC).toContain("/v2-preview");
    expect(PAGE_SRC).toContain("/changelog");
    expect(PAGE_SRC).toContain("/dashboard");
  });
});

describe("/v2-shadow-monitor Footer + sitemap 진입 path", () => {
  it("Footer active link 에서 제거 — noindex archive (cycle 1929 IA wave-556)", () => {
    // cycle 1929: footer noindex 2건 제거 (/v2-shadow-monitor, /accuracy/shadow)
    // comment 라인 제외 후 active href 검사
    const activeLines = FOOTER_SRC
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(activeLines).not.toContain('"/v2-shadow-monitor"');
  });

  it("sitemap staticRoutes 에서 제거 — noindex archive (cycle 1802 IA)", () => {
    // v2-shadow-monitor noindex 처리 → sitemap active route 제외 (comment 라인 허용)
    const activeRoutes = SITEMAP_SRC
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(activeRoutes).not.toContain('"/v2-shadow-monitor"');
  });
});
