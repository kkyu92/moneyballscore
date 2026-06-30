import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const SHADOW_SRC = readFileSync(resolve(__dirname, "../shadow/page.tsx"), "utf8");

describe("accuracy ACCURACY_ISR_SECONDS source-of-truth guard (silent drift family wave 156 cycle 1388)", () => {
  it("accuracy/page.tsx revalidate = 3600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
  });

  it("accuracy/shadow/page.tsx revalidate = 3600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(SHADOW_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
  });

});
