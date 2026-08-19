/**
 * Header nav locale test — cycle 2140 fix-incident (href) + cycle 2141 explore-idea (label/description).
 *
 * cycle 2139 발견: MLB_NAV href 가 KO 경로 하드코딩이라 /en/mlb/* 페이지에서
 * 헤더 메가메뉴 클릭 시 KO 페이지로 이탈. localizeNavItems() 가 /en 접두 보정.
 * cycle 2140 retro 발견: label/description 텍스트 자체도 여전히 KO 하드코딩 (href 는
 * 고쳤지만 화면에 보이는 텍스트는 그대로) — enLabel/enDescription 필드로 치환.
 */

import { describe, it, expect } from "vitest";
import { LEAGUE_NAVS, localizeNavItems, isNavGroup } from "../Header";

function collectHrefs(items: ReturnType<typeof localizeNavItems>): string[] {
  return items.flatMap((item) => (isNavGroup(item) ? item.items.map((sub) => sub.href) : [item.href]));
}

describe("localizeNavItems", () => {
  it("KO pathname → MLB_NAV href 그대로 (변경 없음)", () => {
    const result = localizeNavItems(LEAGUE_NAVS.mlb, "/mlb/standings");
    expect(collectHrefs(result)).toEqual(collectHrefs(LEAGUE_NAVS.mlb));
    expect(collectHrefs(result).every((h) => !h.startsWith("/en"))).toBe(true);
  });

  it("EN pathname(/en/mlb/*) → /mlb/reviews(하위 포함) 제외 모든 /mlb href 가 /en 접두로 치환", () => {
    const result = localizeNavItems(LEAGUE_NAVS.mlb, "/en/mlb/standings");
    for (const href of collectHrefs(result)) {
      if (href.startsWith("/mlb/reviews")) continue;
      expect(href.startsWith("/en/mlb") || href === "/en/mlb").toBe(true);
    }
  });

  it("EN pathname → /mlb/reviews(하위 포함) 는 EN 미러 부재라 KO href 유지 (cycle 2227 발견 — blanket 치환 시 404, cycle 2280 misses 추가분도 동일 가드로 커버)", () => {
    const result = localizeNavItems(LEAGUE_NAVS.mlb, "/en/mlb/standings");
    expect(collectHrefs(result)).toContain("/mlb/reviews");
    expect(collectHrefs(result)).toContain("/mlb/reviews/misses");
    expect(collectHrefs(result)).not.toContain("/en/mlb/reviews");
    expect(collectHrefs(result)).not.toContain("/en/mlb/reviews/misses");
  });

  it("EN pathname=/en/mlb (정확 일치) 도 치환", () => {
    const result = localizeNavItems(LEAGUE_NAVS.mlb, "/en/mlb");
    expect(collectHrefs(result)[0]).toBe("/en/mlb");
  });

  it("KBO_NAV 는 EN 페이지라도 변경 X (EN 대응 라우트 부재)", () => {
    const result = localizeNavItems(LEAGUE_NAVS.kbo, "/en/mlb");
    expect(collectHrefs(result)).toEqual(collectHrefs(LEAGUE_NAVS.kbo));
  });

  it("KO pathname → MLB_NAV label/description KO 유지 (변경 없음)", () => {
    const result = localizeNavItems(LEAGUE_NAVS.mlb, "/mlb/standings");
    expect(result[0].label).toBe("오늘");
    const gamesGroup = result.find((item) => isNavGroup(item) && item.label === "경기·팀");
    expect(gamesGroup).toBeTruthy();
  });

  it("EN pathname → MLB_NAV label/description 이 enLabel/enDescription 으로 치환", () => {
    const result = localizeNavItems(LEAGUE_NAVS.mlb, "/en/mlb");
    expect(result[0].label).toBe("Today");

    const gamesGroup = result.find((item) => isNavGroup(item) && item.label === "Games & Teams");
    expect(gamesGroup).toBeTruthy();
    if (gamesGroup && isNavGroup(gamesGroup)) {
      const accuracy = gamesGroup.items.find((sub) => sub.href === "/en/mlb/accuracy");
      expect(accuracy?.label).toBe("Accuracy Track Record");
      expect(accuracy?.description).toBe("AI prediction performance tracking");

      // enLabel 없는 항목(Statcast/Wild Card/Postseason)은 원본 label 유지 (이미 EN)
      const statcast = gamesGroup.items.find((sub) => sub.href === "/en/mlb/players");
      expect(statcast?.label).toBe("Statcast");
    }

    const postseasonGroup = result.find((item) => isNavGroup(item) && item.label === "Postseason");
    expect(postseasonGroup).toBeTruthy();
  });
});
