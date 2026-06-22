import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const SITEMAP_SRC = readFileSync(
  resolve(__dirname, "../../../sitemap.ts"),
  "utf8",
);

describe("mlb/standings/page.tsx — Plan B Tier C+D Task 6 (cycle 1027)", () => {
  it("MLB_DIVISIONS import + AL/NL × East/Central/West 렌더", () => {
    expect(PAGE_SRC).toMatch(/MLB_DIVISIONS/);
    expect(PAGE_SRC).toMatch(/American League/);
    expect(PAGE_SRC).toMatch(/National League/);
  });

  it("Breadcrumb 2 단계 (MLB 분석 → AL/NL 순위)", () => {
    expect(PAGE_SRC).toMatch(/\{ href: "\/mlb", label: "MLB 분석" \}/);
    expect(PAGE_SRC).toMatch(/\{ label: "AL\/NL 순위" \}/);
  });

  it("CollectionPage JSON-LD MLB_TEAM_COUNT item (wave 81 registry swap)", () => {
    expect(PAGE_SRC).toMatch(/"@type":\s*"CollectionPage"/);
    expect(PAGE_SRC).toMatch(/numberOfItems:\s*MLB_TEAM_COUNT/);
  });

  it("revalidate = MLB_ISR_SECONDS ISR (silent drift wave 124, /mlb/team hub 패턴 정합)", () => {
    expect(PAGE_SRC).toMatch(/export const revalidate = MLB_ISR_SECONDS/);
  });

  it("팀 link href = /mlb/team/${code}", () => {
    expect(PAGE_SRC).toMatch(/href=\{`\/mlb\/team\/\$\{code\}`\}/);
  });

  it("alternates languages en/ko 양 layer — i18n 정합", () => {
    expect(PAGE_SRC).toMatch(/en:.*\/en\/mlb\/standings/);
    expect(PAGE_SRC).toMatch(/ko:.*\/mlb\/standings/);
  });

  it("park tone bucket (타자/투수/중립) 3분류", () => {
    expect(PAGE_SRC).toMatch(/타자 친화/);
    expect(PAGE_SRC).toMatch(/투수 친화/);
    expect(PAGE_SRC).toMatch(/중립/);
  });
});

describe("sitemap.ts — /mlb/standings entry", () => {
  it("/mlb/standings 정합 + priority/changeFrequency", () => {
    expect(SITEMAP_SRC).toMatch(/\/mlb\/standings/);
    expect(SITEMAP_SRC).toMatch(
      /\$\{baseUrl\}\/mlb\/standings`,\s*lastModified:\s*now,\s*changeFrequency:\s*'daily'/,
    );
  });
});
