/**
 * MegaMenu 12 case 시각 검증.
 *
 * docs/design/megamenu-state-matrix.md 12 case 의 시각 상태를 Playwright screenshot
 * 으로 박제. design review baseline + visual regression detection.
 *
 * 시각 검증 = `apps/moneyball/e2e/__screenshots__/` 안 baseline 박제. 후속 PR 변경
 * 시 diff 자동 검출 (Playwright snapshot matcher).
 *
 * 사용:
 *   cd apps/moneyball
 *   pnpm e2e:install                                          # 첫 1회
 *   pnpm e2e megamenu-states.spec.ts --update-snapshots       # baseline 갱신
 *   pnpm e2e megamenu-states.spec.ts                          # diff 검증
 */

import { test, expect, devices } from "@playwright/test";

const STATES = [
  { id: 1, name: "default", path: "/", action: null },
  { id: 2, name: "hover-desktop", path: "/", action: "hover" },
  { id: 3, name: "focus", path: "/", action: "focus" },
  { id: 4, name: "focus-visible-keyboard", path: "/", action: "focus-keyboard" },
  { id: 5, name: "active-route-match", path: "/analysis", action: null },
  { id: 6, name: "click-open", path: "/", action: "click" },
  { id: 7, name: "Esc-close", path: "/", action: "esc-close" },
  { id: 8, name: "outside-click-close", path: "/", action: "outside-close" },
  { id: 9, name: "arrow-keys-nav", path: "/", action: "arrow-down" },
  { id: 10, name: "Home-End", path: "/", action: null /* keyboard 위주, 시각 동일 */ },
  { id: 11, name: "disabled", path: "/", action: null /* 현재 disabled item 없음 */ },
  { id: 12, name: "mobile-collapse", path: "/", action: "mobile-toggle" },
];

test.describe("MegaMenu 12 case 시각 baseline", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const state of STATES.filter((s) => s.id !== 12)) {
    test(`case ${state.id} — ${state.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium-desktop", "desktop-only case");
      await page.goto(state.path);
      const aiTrigger = page.getByRole("button", { name: /^AI/ });

      if (state.action === "hover") {
        await aiTrigger.hover();
        await page.waitForTimeout(300); // Radix delayDuration 150ms + transition
      } else if (state.action === "focus") {
        await aiTrigger.focus();
      } else if (state.action === "focus-keyboard") {
        await page.keyboard.press("Tab"); // Tab 으로 첫 focus 진입
        await aiTrigger.focus(); // direct focus (focus-visible 강제)
      } else if (state.action === "click") {
        await aiTrigger.click();
        await page.waitForTimeout(200);
      } else if (state.action === "esc-close") {
        await aiTrigger.click();
        await page.waitForTimeout(200);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      } else if (state.action === "outside-close") {
        await aiTrigger.click();
        await page.waitForTimeout(200);
        await page.locator("main").click({ position: { x: 100, y: 400 } });
        await page.waitForTimeout(200);
      } else if (state.action === "arrow-down") {
        await aiTrigger.focus();
        await aiTrigger.press("Enter");
        await page.waitForTimeout(200);
        await page.keyboard.press("ArrowDown");
      }

      // header + nav 영역 screenshot (전체 페이지 X = 안정성)
      const header = page.locator("header").first();
      await expect(header).toHaveScreenshot(`case-${state.id}-${state.name}.png`, {
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe("MegaMenu mobile 12 case (case 12 mobile-collapse)", () => {
  // iPhone 13 device 의 viewport / userAgent / deviceScaleFactor / isMobile / hasTouch 만 사용.
  // defaultBrowserType 은 describe scope 안 test.use 에서 사용 불가 (worker 재할당 강제) — 제외.
  const iPhone13 = devices["iPhone 13"];
  test.use({
    viewport: iPhone13.viewport,
    userAgent: iPhone13.userAgent,
    deviceScaleFactor: iPhone13.deviceScaleFactor,
    isMobile: iPhone13.isMobile,
    hasTouch: iPhone13.hasTouch,
  });

  test("case 12 — mobile-collapse default + accordion expand", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "mobile-only case");

    await page.goto("/");

    // (a) 기본 햄버거 상태
    const header = page.locator("header").first();
    await expect(header).toHaveScreenshot("case-12a-mobile-default.png", {
      maxDiffPixelRatio: 0.01,
    });

    // (b) 햄버거 open
    const hamburger = page.getByRole("button", { name: "메뉴" });
    await hamburger.click();
    await page.waitForTimeout(200);
    await expect(page.locator('nav[aria-label="모바일 메뉴"]')).toHaveScreenshot("case-12b-mobile-open.png", {
      maxDiffPixelRatio: 0.01,
    });

    // (c) accordion expand (AI 그룹)
    const aiAccordion = page.getByRole("button", { name: /^AI$/ });
    await aiAccordion.click();
    await page.waitForTimeout(200);
    await expect(page.locator('nav[aria-label="모바일 메뉴"]')).toHaveScreenshot("case-12c-mobile-accordion-expand.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});
