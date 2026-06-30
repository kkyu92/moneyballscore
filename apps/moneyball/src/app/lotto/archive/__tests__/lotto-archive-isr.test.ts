import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const DATE_PAGE_SRC = readFileSync(resolve(__dirname, "../[date]/page.tsx"), "utf8");

describe("lotto/archive LOTTO_ARCHIVE_ISR_SECONDS source-of-truth guard (silent drift family wave 156 cycle 1388)", () => {
  it("lotto/archive/page.tsx revalidate = 86400 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*86400\b/);
  });

  it("lotto/archive/[date]/page.tsx revalidate = 86400 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(DATE_PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*86400\b/);
  });

});
