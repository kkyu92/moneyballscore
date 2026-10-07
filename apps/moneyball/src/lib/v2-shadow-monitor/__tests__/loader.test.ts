import { describe, it, expect } from "vitest";
import { compareCohortFilenames } from "../loader";

describe("compareCohortFilenames", () => {
  it("orders by date first", () => {
    const files = ["2026-06-01-cohort-cycle-1098.md", "2026-06-10-cohort-cycle-1138.md"];
    expect(files.sort(compareCohortFilenames)).toEqual([
      "2026-06-01-cohort-cycle-1098.md",
      "2026-06-10-cohort-cycle-1138.md",
    ]);
  });

  it("orders by numeric cycle within same date, not lexicographic string", () => {
    const files = ["2026-06-15-cohort-cycle-100.md", "2026-06-15-cohort-cycle-99.md"];
    expect(files.sort(compareCohortFilenames)).toEqual([
      "2026-06-15-cohort-cycle-99.md",
      "2026-06-15-cohort-cycle-100.md",
    ]);
  });

  it("treats plain -cohort.md (no cycle number) as earliest for that date", () => {
    const files = ["2026-05-25-cohort-cycle-5.md", "2026-05-25-cohort.md"];
    expect(files.sort(compareCohortFilenames)).toEqual([
      "2026-05-25-cohort.md",
      "2026-05-25-cohort-cycle-5.md",
    ]);
  });
});
