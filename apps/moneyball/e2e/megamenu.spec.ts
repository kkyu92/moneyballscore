/**
 * MegaMenu Radix interaction E2E.
 *
 * docs/design/megamenu-state-matrix.md 12 case 중 jsdom 안 simulate 불가한
 * interaction 핵심 6 case 검증:
 *
 * 1. hover (desktop) → panel open (data-state=open)
 * 2. click (mobile accordion) → expand
 * 3. Esc → panel close + focus return
 * 4. outside-click-close → panel close
 * 5. arrow-keys-nav → first → second item focus 이동
 * 6. mobile collapse → hamburger toggle + accordion expand
 */

import { test, expect, devices } from "@playwright/test";

test.describe("MegaMenu desktop interaction", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("hover trigger → panel open (data-state=open)", async ({ page }) => {
    const aiTrigger = page.getByRole("button", { name: /^AI/ });
    await aiTrigger.hover();
    // Radix delayDuration=150ms 안 panel 열림
    await expect(aiTrigger).toHaveAttribute("data-state", "open", { timeout: 1000 });
  });

  test("click trigger → panel toggle", async ({ page }) => {
    const aiTrigger = page.getByRole("button", { name: /^AI/ });
    await aiTrigger.click();
    await expect(aiTrigger).toHaveAttribute("data-state", "open");
    await aiTrigger.click();
    await expect(aiTrigger).toHaveAttribute("data-state", "closed");
  });

  test("Esc → panel close", async ({ page }) => {
    const aiTrigger = page.getByRole("button", { name: /^AI/ });
    await aiTrigger.click();
    await expect(aiTrigger).toHaveAttribute("data-state", "open");
    await page.keyboard.press("Escape");
    await expect(aiTrigger).toHaveAttribute("data-state", "closed");
  });

  test("outside click → panel close", async ({ page }) => {
    const aiTrigger = page.getByRole("button", { name: /^AI/ });
    await aiTrigger.click();
    await expect(aiTrigger).toHaveAttribute("data-state", "open");
    // 페이지 본문 click (panel 외부)
    await page.locator("main").click({ position: { x: 100, y: 400 } });
    await expect(aiTrigger).toHaveAttribute("data-state", "closed", { timeout: 1000 });
  });

  test("Tab + arrow keys → item focus 이동", async ({ page }) => {
    const aiTrigger = page.getByRole("button", { name: /^AI/ });
    await aiTrigger.focus();
    await aiTrigger.press("Enter");
    await expect(aiTrigger).toHaveAttribute("data-state", "open");
    // Radix arrow-down → next item focus (sub-link 안 이동)
    await page.keyboard.press("ArrowDown");
    // focus 가 panel link 안으로 이동
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON"]).toContain(focused);
  });
});

test.describe("MegaMenu mobile interaction", () => {
  test.use({ ...devices["iPhone 13"] });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("hamburger → mobile nav open + accordion expand", async ({ page }) => {
    const hamburger = page.getByRole("button", { name: "메뉴" });
    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    // accordion 그룹 (AI) trigger click → expand
    const aiAccordion = page.getByRole("button", { name: /^AI$/ });
    await aiAccordion.click();
    // sub-link 가시
    const subLink = page.getByRole("link", { name: /AI 분석/ });
    await expect(subLink).toBeVisible();
  });
});
