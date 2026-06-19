import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const HUB_SRC = readFileSync(resolve(__dirname, "../../page.tsx"), "utf8");
const NOT_FOUND_SRC = readFileSync(resolve(__dirname, "../not-found.tsx"), "utf8");

describe("mlb/team/[code]/page.tsx — Plan B Tier C+D Task 4 정합 (cycle 1026)", () => {
  it("buildMlbTeamProfile import + 호출 — KBO 패턴 정합", () => {
    expect(PAGE_SRC).toMatch(/import\s*\{\s*buildMlbTeamProfile\s*\}\s*from\s*['"]@\/lib\/mlb\/buildMlbTeamProfile['"]/);
    expect(PAGE_SRC).toMatch(/await buildMlbTeamProfile\(code\)/);
  });

  it("generateStaticParams = MLB_TEAMS_PRE_RENDER 5팀 정합", () => {
    expect(PAGE_SRC).toMatch(/export function generateStaticParams\(\)/);
    expect(PAGE_SRC).toMatch(/MLB_TEAMS_PRE_RENDER\.map/);
  });

  it("revalidate = 1800 ISR", () => {
    expect(PAGE_SRC).toMatch(/export const revalidate = 1800/);
  });

  it("Breadcrumb 3 단계 (MLB 분석 → 팀 → name)", () => {
    expect(PAGE_SRC).toMatch(/\{ href: "\/mlb", label: "MLB 분석" \}/);
    expect(PAGE_SRC).toMatch(/\{ href: "\/mlb\/team", label: "팀" \}/);
  });

  it("JSON-LD SportsTeam + MLB memberOf", () => {
    expect(PAGE_SRC).toMatch(/"@type":\s*"SportsTeam"/);
    expect(PAGE_SRC).toMatch(/alternateName:\s*"MLB"/);
  });

  it("isMlbTeamCode guard → notFound() 호출", () => {
    expect(PAGE_SRC).toMatch(/if \(!isMlbTeamCode\(code\)\) notFound\(\);/);
  });

  it("SMALL_SAMPLE_N hedge 정합 — KBO 패턴 정합", () => {
    expect(PAGE_SRC).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
    expect(PAGE_SRC).toMatch(/\$\{SMALL_SAMPLE_N\}경기 이상부터/);
  });

  it("alternates languages en/ko 양 layer — i18n 정합", () => {
    expect(PAGE_SRC).toMatch(/en:.*\/en\/mlb\/team\//);
    expect(PAGE_SRC).toMatch(/ko:.*\/mlb\/team\//);
  });
});

describe("mlb/team/page.tsx hub — 30팀 division grid", () => {
  it("MLB_DIVISIONS import + AL/NL 분리 렌더", () => {
    expect(HUB_SRC).toMatch(/MLB_DIVISIONS/);
    expect(HUB_SRC).toMatch(/American League/);
    expect(HUB_SRC).toMatch(/National League/);
  });

  it("CollectionPage JSON-LD MLB_TEAM_COUNT item (wave 81 registry swap)", () => {
    expect(HUB_SRC).toMatch(/"@type":\s*"CollectionPage"/);
    expect(HUB_SRC).toMatch(/numberOfItems:\s*MLB_TEAM_COUNT/);
  });

  it("Breadcrumb 2 단계 (MLB 분석 → 팀)", () => {
    expect(HUB_SRC).toMatch(/\{ href: "\/mlb", label: "MLB 분석" \}/);
    expect(HUB_SRC).toMatch(/\{ label: "팀" \}/);
  });
});

describe("mlb/team/[code]/not-found.tsx", () => {
  it("noindex 보호", () => {
    expect(NOT_FOUND_SRC).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it("MLB 30팀 link grid", () => {
    expect(NOT_FOUND_SRC).toMatch(/MLB_TEAMS/);
    expect(NOT_FOUND_SRC).toMatch(/\/mlb\/team\/\$\{code\}/);
  });
});
