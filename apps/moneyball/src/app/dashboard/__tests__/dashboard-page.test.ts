import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const V2_PREVIEW_SRC = readFileSync(
  resolve(__dirname, "../../v2-preview/page.tsx"),
  "utf8",
);

describe("dashboard DASHBOARD_ISR_SECONDS source-of-truth guard (silent drift wave 131 cycle 1350)", () => {
  it("dashboard/page.tsx revalidate = 86400 magic 부재 — DASHBOARD_ISR_SECONDS 사용", () => {
        expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*86400\b/) // build guard: literal required;
  });

  it("v2-preview/page.tsx revalidate = 86400 magic 부재 — DASHBOARD_ISR_SECONDS 사용", () => {
        expect(V2_PREVIEW_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*86400\b/) // build guard: literal required;
  });

});
