import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// cycle 2616 review-code (heavy): AgentVoteCard's per-agent letter badge
// (Σ/H/A/C/J) is the same role as the "AI" circular avatar badge in
// DebateTimeline.tsx / JudgeReasoningCard.tsx (agent-identity label, small
// circle, bold text) but used w-7 h-7 + hardcoded text-[12px] instead of
// the w-6 h-6 + text-2xs token pair every other instance uses. Aligned to
// the shared convention.

const INSIGHTS_DIR = join(__dirname, "..");

describe("silent-drift-cycle-2616: AgentVoteCard letter badge sized like other agent-identity badges", () => {
  it("uses w-6 h-6 + text-2xs, not w-7 h-7 + text-[12px]", () => {
    const content = readFileSync(join(INSIGHTS_DIR, "AgentVoteCard.tsx"), "utf-8");
    expect(content).toContain("w-6 h-6 rounded-full bg-white/80 dark:bg-black/30 text-2xs font-bold");
    expect(content).not.toContain("w-7 h-7");
    expect(content).not.toContain("text-[12px]");
  });
});
