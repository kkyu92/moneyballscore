import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MLB_GRADIENT_GAMES_INDIGO_135,
  MLB_GRADIENT_NAVY_135,
  MLB_GRADIENT_PLAYERS_GREEN_135,
  MLB_GRADIENT_PLAYERS_VIOLET_135,
  MLB_GRADIENT_POSTSEASON_135,
  MLB_GRADIENT_STANDINGS_135,
  MLB_GRADIENT_TEAM_SKY_135,
  MLB_GRADIENT_WILD_CARD_135,
  NEUTRAL_GRADIENT_135,
} from "../../lib/design-tokens";

const ROOT = join(__dirname, "..");

const GRADIENTS_AND_FILES: Array<{
  const_name: string;
  value: string;
  files: string[];
}> = [
  {
    const_name: "MLB_GRADIENT_NAVY_135",
    value: MLB_GRADIENT_NAVY_135,
    files: [
      "mlb/opengraph-image.tsx",
      "mlb/twitter-image.tsx",
      "en/mlb/opengraph-image.tsx",
      "en/mlb/twitter-image.tsx",
    ],
  },
  {
    const_name: "MLB_GRADIENT_WILD_CARD_135",
    value: MLB_GRADIENT_WILD_CARD_135,
    files: [
      "mlb/wild-card/opengraph-image.tsx",
      "mlb/wild-card/twitter-image.tsx",
      "en/mlb/wild-card/opengraph-image.tsx",
      "en/mlb/wild-card/twitter-image.tsx",
    ],
  },
  {
    const_name: "MLB_GRADIENT_POSTSEASON_135",
    value: MLB_GRADIENT_POSTSEASON_135,
    files: [
      "mlb/postseason/opengraph-image.tsx",
      "mlb/postseason/twitter-image.tsx",
      "en/mlb/postseason/opengraph-image.tsx",
      "en/mlb/postseason/twitter-image.tsx",
    ],
  },
  {
    const_name: "MLB_GRADIENT_STANDINGS_135",
    value: MLB_GRADIENT_STANDINGS_135,
    files: [
      "mlb/standings/opengraph-image.tsx",
      "mlb/standings/twitter-image.tsx",
      "en/mlb/standings/opengraph-image.tsx",
      "en/mlb/standings/twitter-image.tsx",
    ],
  },
  {
    const_name: "MLB_GRADIENT_TEAM_SKY_135",
    value: MLB_GRADIENT_TEAM_SKY_135,
    files: [
      "mlb/games/[date]/opengraph-image.tsx",
      "en/mlb/team/opengraph-image.tsx",
      "en/mlb/team/twitter-image.tsx",
      "en/mlb/team/[code]/opengraph-image.tsx",
      "en/mlb/games/[date]/opengraph-image.tsx",
    ],
  },
  {
    const_name: "MLB_GRADIENT_PLAYERS_VIOLET_135",
    value: MLB_GRADIENT_PLAYERS_VIOLET_135,
    files: ["mlb/players/opengraph-image.tsx", "mlb/players/twitter-image.tsx"],
  },
  {
    const_name: "MLB_GRADIENT_PLAYERS_GREEN_135",
    value: MLB_GRADIENT_PLAYERS_GREEN_135,
    files: [
      "en/mlb/players/opengraph-image.tsx",
      "en/mlb/players/twitter-image.tsx",
      "en/mlb/players/[id]/opengraph-image.tsx",
    ],
  },
  {
    const_name: "MLB_GRADIENT_GAMES_INDIGO_135",
    value: MLB_GRADIENT_GAMES_INDIGO_135,
    files: [
      "mlb/games/[date]/[slug]/opengraph-image.tsx",
      "en/mlb/games/[date]/[slug]/opengraph-image.tsx",
    ],
  },
  {
    const_name: "NEUTRAL_GRADIENT_135",
    value: NEUTRAL_GRADIENT_135,
    files: [
      "contact/opengraph-image.tsx",
      "privacy/opengraph-image.tsx",
      "terms/opengraph-image.tsx",
    ],
  },
];

describe("silent drift family wave 144 — MLB/neutral OG gradients consolidated into design-tokens", () => {
  it("9 gradient constants exported and have 135deg linear-gradient shape", () => {
    for (const { const_name, value } of GRADIENTS_AND_FILES) {
      expect(value, `${const_name} value`).toMatch(/^linear-gradient\(135deg, #[0-9a-f]{6} 0%, #[0-9a-f]{6} 50%, #[0-9a-f]{6} 100%\)$/);
    }
  });

  it.each(GRADIENTS_AND_FILES.flatMap(({ const_name, files }) => files.map((f) => [f, const_name] as const)))(
    "%s imports %s (no raw hex)",
    (rel, constName) => {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src, `${rel} should import ${constName}`).toContain(constName);
      expect(src, `${rel} should import from @/lib/design-tokens`).toContain('from "@/lib/design-tokens"');
    },
  );

  it.each(GRADIENTS_AND_FILES.flatMap(({ value, files }) => files.map((f) => [f, value] as const)))(
    "%s no longer contains raw gradient literal",
    (rel, gradValue) => {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src, `${rel} should not have raw '${gradValue}' literal`).not.toContain(`"${gradValue}"`);
    },
  );
});
