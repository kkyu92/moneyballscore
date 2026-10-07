import { describe, it, expect } from "vitest";
import { compareCohortFilenames, COHORT_FILENAME_REGEX } from "../loader";

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

  it("orders -cohort-split.md (cron 실제 산출 파일명) by date", () => {
    const files = ["2026-09-21-cohort-split.md", "2026-09-28-cohort-split.md"];
    expect(files.sort(compareCohortFilenames)).toEqual([
      "2026-09-21-cohort-split.md",
      "2026-09-28-cohort-split.md",
    ]);
  });
});

describe("COHORT_FILENAME_REGEX", () => {
  it("cron 산출 파일명(-cohort-split.md) 매칭 — 디렉토리 불일치 회귀 가드 (cycle 2990)", () => {
    expect(COHORT_FILENAME_REGEX.test("2026-09-28-cohort-split.md")).toBe(true);
  });

  it("legacy -cohort.md / -cohort-cycle-N.md 매칭 유지", () => {
    expect(COHORT_FILENAME_REGEX.test("2026-06-01-cohort.md")).toBe(true);
    expect(COHORT_FILENAME_REGEX.test("2026-06-10-cohort-cycle-1138.md")).toBe(true);
  });

  it("같은 디렉토리의 비-cohort 파일(mlb-elo-backtest.md 등)은 제외", () => {
    expect(COHORT_FILENAME_REGEX.test("2026-08-25-mlb-elo-backtest.md")).toBe(false);
  });
});
