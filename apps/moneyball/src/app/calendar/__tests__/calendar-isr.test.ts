import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("calendar CALENDAR_ISR_SECONDS source-of-truth guard (silent drift family wave 156 cycle 1388)", () => {
  it("calendar/page.tsx revalidate = 3600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
  });

  it("calendar/page.tsx CALENDAR_ISR_SECONDS @moneyball/shared import 포함", () => {
    expect(PAGE_SRC).toMatch(/import\s*\{[^}]*CALENDAR_ISR_SECONDS[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
  });
});
