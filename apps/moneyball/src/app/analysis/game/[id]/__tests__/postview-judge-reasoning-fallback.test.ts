import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("postview judgeReasoning dev-jargon fallback leak (cycle 2155)", () => {
  it("postview judgeReasoning is passed through presentJudgeReasoningWithFallback, not raw", () => {
    expect(PAGE_SRC).toMatch(
      /const postviewJudgeReasoning = presentJudgeReasoningWithFallback\(\s*postReasoning\?\.judgeReasoning,?\s*\)/,
    );
    expect(PAGE_SRC).toContain("judgeReasoning={postviewJudgeReasoning?.text ?? ''}");
    expect(PAGE_SRC).not.toContain("judgeReasoning={postReasoning.judgeReasoning ?? ''}");
  });
});
