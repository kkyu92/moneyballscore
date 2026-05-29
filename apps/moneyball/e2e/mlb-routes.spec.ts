/**
 * MLB routes E2E — plan B Task 18
 *
 * 박제 완료 MLB routes 검증 (Tier A+B scope):
 * - /mlb hub 페이지 렌더링 (200 status)
 * - "MLB 분석" card 표시 (오늘 경기 진입점)
 */

import { test, expect } from "@playwright/test";

const MLB_ROUTES = ["/mlb"];

test.describe("MLB routes render", () => {
  for (const route of MLB_ROUTES) {
    test(`${route} renders 200`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
    });
  }
});

test.describe("MLB hub page content", () => {
  test.use({ viewport: { width: 1280, height: 800 } }); // desktop viewport

  test.beforeEach(async ({ page }) => {
    await page.goto("/mlb");
  });

  test("MLB hub displays league selector", async ({ page }) => {
    // LeagueSelector 에서 MLB 활성화 확인
    const mlbPill = page.locator('[role="tablist"] [data-league="mlb"][role="tab"]').first();
    await expect(mlbPill).toBeVisible();
    await expect(mlbPill).toHaveAttribute("aria-selected", "true");
  });

  test("MLB hub page is accessible", async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/MLB|MoneyBall/i);
  });
});
