import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// cycle 2603 review-code(heavy): notice/warning box rounded-md(6px) -> card tier
// cycle 2602 explicitly excluded "알림박스" role as out-of-scope (md tier candidate).
// Re-review found 3 outliers vs ~29 sibling amber/yellow notice boxes using
// rounded-lg(8px)/rounded-xl(12px, DESIGN.md "카드" tier).
const APP_ROOT = join(__dirname, "..", "..", "..", "..", "..");

function read(rel: string) {
  return readFileSync(join(APP_ROOT, rel), "utf-8");
}

describe("silent-drift-cycle-2603: notice box rounded-md -> card tier", () => {
  it("accuracy/shadow role=status yellow box uses rounded-xl, not rounded-md", () => {
    const content = read("src/app/accuracy/shadow/page.tsx");
    const line = content
      .split("\n")
      .find((l) => l.includes('border-yellow-300') && l.includes('bg-yellow-50'));
    expect(line).toBeDefined();
    expect(line).not.toMatch(/rounded-md/);
    expect(line).toMatch(/rounded-xl/);
  });

  it("v2-preview role=status yellow box uses rounded-xl, not rounded-md", () => {
    const content = read("src/app/v2-preview/page.tsx");
    const line = content
      .split("\n")
      .find((l) => l.includes('border-yellow-300') && l.includes('bg-yellow-50'));
    expect(line).toBeDefined();
    expect(line).not.toMatch(/rounded-md/);
    expect(line).toMatch(/rounded-xl/);
  });

  it("mlb/factors placeholder warning strip aligns with TeamBiasTable twin (rounded-lg)", () => {
    const factorsContent = read("src/app/mlb/factors/page.tsx");
    const factorsLine = factorsContent
      .split("\n")
      .find((l) => l.includes("bg-amber-50") && l.includes("px-3 py-2"));
    expect(factorsLine).toBeDefined();
    expect(factorsLine).not.toMatch(/rounded-md/);
    expect(factorsLine).toMatch(/rounded-lg/);

    const twinContent = read("src/components/accuracy/TeamBiasTable.tsx");
    const twinLine = twinContent
      .split("\n")
      .find((l) => l.includes("bg-amber-50") && l.includes("px-3 py-2"));
    expect(twinLine).toBeDefined();
    expect(twinLine).toMatch(/rounded-lg/);
  });
});
