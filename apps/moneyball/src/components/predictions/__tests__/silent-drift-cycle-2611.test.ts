import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// cycle 2611 review-code (heavy): the "AI" circular avatar badge
// (`inline-flex items-center justify-center ... rounded-full
// bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold text-2xs`
// wrapping the literal text "AI") appears in 3 files — DebateTimeline.tsx
// and JudgeReasoningCard.tsx use w-6 h-6, but predictions/[date]/page.tsx
// header used w-5 h-5, a 1-notch size drift for the identical role.
// Aligned to the 2/3 majority (w-6 h-6).

const PREDICTIONS_DIR = join(__dirname, "..");
const SRC_ROOT = join(__dirname, "..", "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      walk(full, out);
    } else if (entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

const AI_BADGE_MARKER =
  "rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold text-2xs";

describe("silent-drift-cycle-2611: 'AI' avatar badge uses consistent w-6 h-6 sizing", () => {
  it("JudgeReasoningCard AI badge is w-6 h-6", () => {
    const content = readFileSync(join(PREDICTIONS_DIR, "JudgeReasoningCard.tsx"), "utf-8");
    expect(content).toContain(`w-6 h-6 ${AI_BADGE_MARKER}`);
  });

  it("no source file has an AI badge sized w-5 h-5", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const content = readFileSync(file, "utf-8");
      if (content.includes(`w-5 h-5 ${AI_BADGE_MARKER}`)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
