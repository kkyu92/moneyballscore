/**
 * Hreflang alternates E2E — plan #21 Step 3 (cycle 1094).
 *
 * 5 MLB page × 2 hreflang (en + ko) = 10 link assertion.
 * /en/mlb/* 영문 mirror 박제 wait — link target 404 OK (현재 시점).
 * 영문 mirror 박제 후 link target 200 assertion 갱신 carry-over.
 */

import { test, expect } from "@playwright/test";

const MLB_PAGES = [
  { route: "/mlb", slug: "mlb" },
  { route: "/mlb/standings", slug: "mlb/standings" },
  { route: "/mlb/team", slug: "mlb/team" },
  { route: "/mlb/players", slug: "mlb/players" },
  { route: "/mlb/factors", slug: "mlb/factors" },
];

test.describe("MLB hreflang alternates — en + ko link assertion", () => {
  for (const { route, slug } of MLB_PAGES) {
    test(`${route} has hreflang=en link`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);

      const enLink = page.locator('link[rel="alternate"][hreflang="en"]');
      await expect(enLink).toHaveCount(1);
      const href = await enLink.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(new RegExp(`/en/${slug}$`));
    });

    test(`${route} has hreflang=ko link`, async ({ page }) => {
      await page.goto(route);

      const koLink = page.locator('link[rel="alternate"][hreflang="ko"]');
      await expect(koLink).toHaveCount(1);
      const href = await koLink.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(new RegExp(`/${slug}$`));
    });
  }
});
