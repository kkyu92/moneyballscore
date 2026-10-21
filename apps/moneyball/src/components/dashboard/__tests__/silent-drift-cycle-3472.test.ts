import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// cycle 3472 polish-ui (2-chain lock fallback, visual QA pass via /accuracy
// dark mode screenshot): CohortComparisonHeatmap's lowest accuracy tier
// (<ACCURACY_BASELINE) used `dark:bg-brand-50 dark:text-neutral-800` —
// brand-50 is the LIGHTEST shade in the brand ramp (#edf7f0, near-white).
// On the dark surface every other cell in the same table stays a solid,
// readable brand/neutral shade (brand-700/brand-500/brand-400/neutral-800),
// so the "weakest" cell ended up rendering as the single brightest,
// highest-contrast cell on the page — inverted from its intended "weak/muted"
// meaning. The sibling heatmap (ScoringRuleDayHeatmap, explicitly documented
// as the same "자매 view") never flips to a lighter dark-mode shade for its
// low tier (`bg-red-400 ... dark:bg-red-500`, i.e. stays equally bold/dark).
// Site-wide the dominant bg-brand-100/dark:bg-brand-900(-ish) badge pairing
// (30+ occurrences, e.g. PredictionCard, MyPicksClient, standings) also
// darkens (not lightens) for dark mode. Fixed to
// `dark:bg-brand-900 dark:text-brand-300` — darkest/most muted brand shade,
// consistent with the table's own gradient direction and the site-wide
// pairing convention.

const FILE = join(__dirname, "..", "CohortComparisonHeatmap.tsx");

describe("silent-drift-cycle-3472: CohortComparisonHeatmap low-tier cell dark mode", () => {
  it("low accuracy tier (<baseline) darkens instead of lightening in dark mode", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).toContain(
      "bg-brand-100 text-neutral-700 dark:bg-brand-900 dark:text-brand-300",
    );
  });

  it("no longer uses the inverted-lightness brand-50 dark variant", () => {
    const content = readFileSync(FILE, "utf-8");
    expect(content).not.toContain("dark:bg-brand-50");
  });
});
