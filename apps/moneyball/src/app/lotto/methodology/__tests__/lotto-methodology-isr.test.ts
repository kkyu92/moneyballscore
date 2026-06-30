import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("lotto/methodology LOTTO_ARCHIVE_ISR_SECONDS source-of-truth guard (silent drift family wave 175 cycle 1425)", () => {
  it("lotto/methodology/page.tsx revalidate = 86400 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*86400\b/);
  });
});
