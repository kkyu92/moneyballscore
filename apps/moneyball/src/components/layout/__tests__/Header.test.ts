/**
 * Header nav locale test — cycle 2140 fix-incident.
 *
 * cycle 2139 발견: MLB_NAV href 가 KO 경로 하드코딩이라 /en/mlb/* 페이지에서
 * 헤더 메가메뉴 클릭 시 KO 페이지로 이탈. localizeNavItems() 가 /en 접두 보정.
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

  it("EN pathname(/en/mlb/*) → 모든 /mlb href 가 /en 접두로 치환", () => {
    const result = localizeNavItems(LEAGUE_NAVS.mlb, "/en/mlb/standings");
    for (const href of collectHrefs(result)) {
      expect(href.startsWith("/en/mlb") || href === "/en/mlb").toBe(true);
    }
  });

  it("EN pathname=/en/mlb (정확 일치) 도 치환", () => {
    const result = localizeNavItems(LEAGUE_NAVS.mlb, "/en/mlb");
    expect(collectHrefs(result)[0]).toBe("/en/mlb");
  });

  it("KBO_NAV 는 EN 페이지라도 변경 X (EN 대응 라우트 부재)", () => {
    const result = localizeNavItems(LEAGUE_NAVS.kbo, "/en/mlb");
    expect(collectHrefs(result)).toEqual(collectHrefs(LEAGUE_NAVS.kbo));
  });
});
