import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config — plan #14 C2 Step 4 후속 (cycle 1021 plan #14 C2 carry-over).
 *
 * MegaMenu Radix interaction (hover/click/Esc/outside-click/arrow-keys/Home/End/
 * focus-trap) jsdom 안 simulate 불가 → 실제 browser interaction 검증.
 *
 * 사용:
 *   cd apps/moneyball
 *   pnpm exec playwright install chromium  # 첫 1회
 *   pnpm exec playwright test               # 전체 실행
 *   pnpm exec playwright test --ui          # UI 안 inspect
 */

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone 13"],
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
