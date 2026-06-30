import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTE_SRC = readFileSync(resolve(__dirname, "../route.ts"), "utf8");

describe("feed FEED_ISR_SECONDS source-of-truth guard (silent drift family wave 156 cycle 1388)", () => {
  it("feed/route.ts revalidate = 3600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(ROUTE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
  });

});
