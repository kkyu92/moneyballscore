import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const NOT_FOUND_SRC = readFileSync(resolve(__dirname, "../not-found.tsx"), "utf8");

describe("mlb/players/[id]/page.tsx — plan #21 Step 1 (cycle 1092)", () => {
  it("MLB_TEAMS / MLB_TEAMS_PRE_RENDER import — pre-render 5팀 + 30팀 guard", () => {
    expect(PAGE_SRC).toMatch(/MLB_TEAMS/);
    expect(PAGE_SRC).toMatch(/MLB_TEAMS_PRE_RENDER/);
  });

  it("generateStaticParams = MLB_TEAMS_PRE_RENDER 5팀 정합", () => {
    expect(PAGE_SRC).toMatch(/export function generateStaticParams\(\)/);
    expect(PAGE_SRC).toMatch(/MLB_TEAMS_PRE_RENDER\.map/);
  });

  it("revalidate = MLB_ISR_SECONDS ISR (silent drift wave 124)", () => {
    expect(PAGE_SRC).toMatch(/export const revalidate = MLB_ISR_SECONDS/);
  });

  it("Breadcrumb 3 단계 (MLB 분석 → Statcast 선수 → team)", () => {
    expect(PAGE_SRC).toMatch(/\{ href: "\/mlb", label: "MLB 분석" \}/);
    expect(PAGE_SRC).toMatch(/\{ href: "\/mlb\/players", label: "Statcast 선수" \}/);
  });

  it("JSON-LD SportsTeam + MLB memberOf", () => {
    expect(PAGE_SRC).toMatch(/"@type":\s*"SportsTeam"/);
    expect(PAGE_SRC).toMatch(/alternateName:\s*"MLB"/);
  });

  it("isMlbTeamCode guard → notFound() 호출", () => {
    expect(PAGE_SRC).toMatch(/if \(!isMlbTeamCode\(id\)\) notFound\(\);/);
  });

  it("alternates languages en/ko 양 layer — i18n 정합", () => {
    expect(PAGE_SRC).toMatch(/en:.*\/en\/mlb\/players\//);
    expect(PAGE_SRC).toMatch(/ko:.*\/mlb\/players\//);
  });

  it("Statcast 4 metrics 박제 (xwoba / barrelPct / hardHitPct / launchAngle)", () => {
    expect(PAGE_SRC).toMatch(/key:\s*"xwoba"/);
    expect(PAGE_SRC).toMatch(/key:\s*"barrelPct"/);
    expect(PAGE_SRC).toMatch(/key:\s*"hardHitPct"/);
    expect(PAGE_SRC).toMatch(/key:\s*"launchAngle"/);
  });

  it("cross-link 박제 (/mlb/team/[id] + /mlb/factors + /mlb/players hub)", () => {
    expect(PAGE_SRC).toMatch(/\/mlb\/team\/\$\{id\}/);
    expect(PAGE_SRC).toMatch(/href="\/mlb\/factors"/);
    expect(PAGE_SRC).toMatch(/href="\/mlb\/players"/);
  });

  it("선수별 deep-dive ETA placeholder 박제 (production cron X scope 정합)", () => {
    expect(PAGE_SRC).toMatch(/ETA 2026 시즌 후반|박제 중/);
  });
});

describe("mlb/players/[id]/not-found.tsx", () => {
  it("noindex meta robots 박제", () => {
    expect(NOT_FOUND_SRC).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it("30팀 grid link → /mlb/players/[code]", () => {
    expect(NOT_FOUND_SRC).toMatch(/MLB_TEAMS/);
    expect(NOT_FOUND_SRC).toMatch(/\/mlb\/players\/\$\{code\}/);
  });
});
