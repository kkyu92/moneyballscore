import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dirname, "../server.ts"), "utf8");

describe("lib/supabase/server.ts cookie-free guard (cycle 3138 fix-incident)", () => {
  it("does not import next/headers cookies (forces every consuming route dynamic, killing ISR)", () => {
    expect(SRC).not.toMatch(/from\s+['"]next\/headers['"]/);
  });

  it("does not import @supabase/ssr createServerClient", () => {
    expect(SRC).not.toMatch(/from\s+['"]@supabase\/ssr['"]/);
  });

  it("uses plain @supabase/supabase-js client (matches app/sitemap.ts precedent)", () => {
    expect(SRC).toMatch(/@supabase\/supabase-js/);
  });
});
