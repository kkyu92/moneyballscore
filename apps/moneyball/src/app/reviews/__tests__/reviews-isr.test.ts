import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const MISSES_SRC = readFileSync(
  resolve(__dirname, "../misses/page.tsx"),
  "utf8",
);
const WEEKLY_SRC = readFileSync(
  resolve(__dirname, "../weekly/[week]/page.tsx"),
  "utf8",
);
const MONTHLY_SRC = readFileSync(
  resolve(__dirname, "../monthly/[month]/page.tsx"),
  "utf8",
);

describe("reviews REVIEWS_*_ISR_SECONDS source-of-truth guard (silent drift wave 133 cycle 1355)", () => {
  it("reviews/page.tsx revalidate = 600 magic 부재 — REVIEWS_INDEX_ISR_SECONDS 사용", () => {
    expect(INDEX_SRC).not.toMatch(/export\s+const\s+revalidate\s*=\s*600\b/);
    expect(INDEX_SRC).toMatch(
      /export\s+const\s+revalidate\s*=\s*REVIEWS_INDEX_ISR_SECONDS/,
    );
  });

  it("reviews/page.tsx REVIEWS_INDEX_ISR_SECONDS @moneyball/shared import 포함", () => {
    expect(INDEX_SRC).toMatch(
      /import\s*\{[^}]*REVIEWS_INDEX_ISR_SECONDS[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
  });

  it("reviews/misses/page.tsx revalidate = 1800 magic 부재 — REVIEWS_WEEKLY_ISR_SECONDS 사용", () => {
    expect(MISSES_SRC).not.toMatch(/export\s+const\s+revalidate\s*=\s*1800\b/);
    expect(MISSES_SRC).toMatch(
      /export\s+const\s+revalidate\s*=\s*REVIEWS_WEEKLY_ISR_SECONDS/,
    );
  });

  it("reviews/misses/page.tsx REVIEWS_WEEKLY_ISR_SECONDS @moneyball/shared import 포함", () => {
    expect(MISSES_SRC).toMatch(
      /import\s*\{[^}]*REVIEWS_WEEKLY_ISR_SECONDS[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
  });

  it("reviews/weekly/[week]/page.tsx revalidate = 1800 magic 부재 — REVIEWS_WEEKLY_ISR_SECONDS 사용", () => {
    expect(WEEKLY_SRC).not.toMatch(/export\s+const\s+revalidate\s*=\s*1800\b/);
    expect(WEEKLY_SRC).toMatch(
      /export\s+const\s+revalidate\s*=\s*REVIEWS_WEEKLY_ISR_SECONDS/,
    );
  });

  it("reviews/weekly/[week]/page.tsx REVIEWS_WEEKLY_ISR_SECONDS @moneyball/shared import 포함", () => {
    expect(WEEKLY_SRC).toMatch(
      /import\s*\{[^}]*REVIEWS_WEEKLY_ISR_SECONDS[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
  });

  it("reviews/monthly/[month]/page.tsx revalidate = 3600 magic 부재 — REVIEWS_MONTHLY_ISR_SECONDS 사용", () => {
    expect(MONTHLY_SRC).not.toMatch(
      /export\s+const\s+revalidate\s*=\s*3600\b/,
    );
    expect(MONTHLY_SRC).toMatch(
      /export\s+const\s+revalidate\s*=\s*REVIEWS_MONTHLY_ISR_SECONDS/,
    );
  });

  it("reviews/monthly/[month]/page.tsx REVIEWS_MONTHLY_ISR_SECONDS @moneyball/shared import 포함", () => {
    expect(MONTHLY_SRC).toMatch(
      /import\s*\{[^}]*REVIEWS_MONTHLY_ISR_SECONDS[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
  });
});
