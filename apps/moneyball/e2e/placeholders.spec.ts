/**
 * Placeholder pages E2E — plan B Task 18
 *
 * 박제 중 페이지들 검증:
 * - noindex 메타 태그 확인 (robots: { index: false })
 * - "박제 중" 카피 표시
 * - 접근성 확인
 *
 * hreflang spec 은 Tier C (en/mlb mirror 미박제) 로 스킵됨.
 */

import { test, expect } from "@playwright/test";

const PLACEHOLDER_PAGES = [
  { route: "/login", title: "로그인" },
  { route: "/settings", title: "설정" },
  { route: "/community", title: "커뮤니티" },
];

test.describe("Placeholder pages — noindex + 박제 중 카피", () => {
  for (const { route, title } of PLACEHOLDER_PAGES) {
    test(`${route} renders with 박제 중 message`, async ({ page }) => {
      await page.goto(route);
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);

      // "박제 중" 텍스트 표시 확인
      const freezeMessage = page.getByText("박제 중");
      await expect(freezeMessage).toBeVisible();
    });

    test(`${route} has noindex robots meta tag`, async ({ page }) => {
      await page.goto(route);

      // Metadata 에서 robots: { index: false } 로 설정되면
      // <meta name="robots" content="noindex,nofollow" /> 형태
      const robotsMeta = page.locator('meta[name="robots"]');
      const content = await robotsMeta.getAttribute("content");

      expect(content).toBeTruthy();
      expect(content?.toLowerCase()).toContain("noindex");
    });

    test(`${route} page is accessible`, async ({ page }) => {
      await page.goto(route);

      // h1 존재 (접근성)
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible();

      // 페이지 제목 검증
      await expect(page).toHaveTitle(/(박제|MoneyBall)/i);
    });
  }
});

test.describe("Placeholder pages — 박제 레이어", () => {
  test("login page shows member feature frozen message", async ({ page }) => {
    await page.goto("/login");
    const message = page.getByText(/회원 기능/);
    await expect(message).toBeVisible();
  });

  test("settings page exists and frozen", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveTitle(/박제|MoneyBall/i);
  });

  test("community page exists and frozen", async ({ page }) => {
    await page.goto("/community");
    await expect(page).toHaveTitle(/박제|MoneyBall/i);
  });

  test("placeholder pages do not index in search", async ({ page }) => {
    // 모든 placeholder 페이지가 noindex 설정
    for (const { route } of PLACEHOLDER_PAGES) {
      await page.goto(route);
      const robots = await page.locator('meta[name="robots"]').getAttribute("content");
      expect(robots?.toLowerCase()).toContain("noindex");
    }
  });
});
