import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND_GRADIENT_KBO_135, brand } from "../../lib/design-tokens";

const ROOT = join(__dirname, "..");

const OG_FILES = [
  "icon.tsx",
  "apple-icon.tsx",
  "opengraph-image.tsx",
  "guide/opengraph-image.tsx",
  "insights/opengraph-image.tsx",
  "insights/series/[topic]/opengraph-image.tsx",
  "analysis/game/[id]/opengraph-image.tsx",
  "changelog/opengraph-image.tsx",
  "methodology/opengraph-image.tsx",
  "leaderboard/opengraph-image.tsx",
  "accuracy/opengraph-image.tsx",
  "lotto/methodology/opengraph-image.tsx",
  "seasons/[year]/opengraph-image.tsx",
  "teams/[code]/opengraph-image.tsx",
  "teams/[code]/recent/opengraph-image.tsx",
  "glossary/opengraph-image.tsx",
  "v2-preview/opengraph-image.tsx",
  "predictions/opengraph-image.tsx",
  "predictions/twitter-image.tsx",
  "predictions/[date]/opengraph-image.tsx",
  "reviews/weekly/[week]/opengraph-image.tsx",
];

describe("silent drift family wave 141 — brand gradient hex → BRAND_GRADIENT_KBO_135 registry", () => {
  it("BRAND_GRADIENT_KBO_135 = brand.900/700/500 135deg gradient", () => {
    expect(BRAND_GRADIENT_KBO_135).toBe(
      `linear-gradient(135deg, ${brand[900]} 0%, ${brand[700]} 50%, ${brand[500]} 100%)`,
    );
  });

  it.each(OG_FILES)("%s imports BRAND_GRADIENT_KBO_135 (no raw hex)", (rel) => {
    const src = readFileSync(join(ROOT, rel), "utf8");
    expect(src).toContain('BRAND_GRADIENT_KBO_135 } from "@/lib/design-tokens"');
    expect(src).not.toMatch(/"linear-gradient\(135deg, #0a1f12 0%, #1a3d24 50%, #2d6b3f 100%\)"/);
  });

  it("manifest.ts uses brand[900]/brand[500] (no raw hex)", () => {
    const src = readFileSync(join(ROOT, "manifest.ts"), "utf8");
    expect(src).toContain('from "@/lib/design-tokens"');
    expect(src).toContain("brand[900]");
    expect(src).toContain("brand[500]");
    expect(src).not.toMatch(/background_color: "#0a1f12"/);
    expect(src).not.toMatch(/theme_color: "#2d6b3f"/);
  });

  it("layout.tsx themeColor entries use brand registry (no raw hex)", () => {
    const src = readFileSync(join(ROOT, "layout.tsx"), "utf8");
    expect(src).toMatch(/themeColor:\s*\[\s*\{\s*media:[^}]+color:\s*brand\[500\]\s*\}/);
    expect(src).toMatch(/\{\s*media:[^}]+color:\s*brand\[900\]\s*\}/);
  });
});
