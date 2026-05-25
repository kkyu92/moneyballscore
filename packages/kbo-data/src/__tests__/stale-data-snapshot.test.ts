import { describe, it, expect } from "vitest";
import { buildStaleSnapshot } from "../analytics/stale-data-snapshot";
import type { PredRowMin } from "../analytics/stale-data-snapshot";

const FIXED_DATE = new Date("2026-05-25T00:00:00Z");

function row(
  is_correct: boolean | null,
  scoring_rule: string | null,
  confidence: number | null,
  verified_at: string | null,
): PredRowMin {
  return { is_correct, scoring_rule, confidence, verified_at };
}

describe("buildStaleSnapshot", () => {
  it("returns zero totals for empty rows", () => {
    const snap = buildStaleSnapshot({ rows: [], generatedAt: FIXED_DATE });
    expect(snap.totalVerified).toBe(0);
    expect(snap.totalCorrect).toBe(0);
    expect(snap.overallAcc).toBe(0);
    expect(snap.scoringRules).toEqual([]);
    expect(snap.weekdays).toEqual([]);
    expect(snap.v18Progress.n).toBe(0);
    expect(snap.v18Progress.target).toBe(150);
    expect(snap.v18Progress.remaining).toBe(150);
    expect(snap.markdown).toContain("# stale-data snapshot (2026-05-25)");
    expect(snap.markdown).toContain("(검증된 prediction 0건)");
  });

  it("excludes rows with null is_correct", () => {
    const rows = [
      row(null, "v1.8", 0.6, "2026-05-20T10:00:00Z"),
      row(true, "v1.8", 0.7, "2026-05-21T10:00:00Z"),
    ];
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE });
    expect(snap.totalVerified).toBe(1);
    expect(snap.totalCorrect).toBe(1);
  });

  it("aggregates scoring_rule cohorts with Brier score", () => {
    const rows = [
      row(true, "v1.8", 0.7, "2026-05-20T10:00:00Z"),
      row(false, "v1.8", 0.6, "2026-05-21T10:00:00Z"),
      row(true, "v1.5", 0.8, "2026-05-22T10:00:00Z"),
    ];
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE });
    const v18 = snap.scoringRules.find((s) => s.rule === "v1.8");
    expect(v18).toBeDefined();
    expect(v18!.total).toBe(2);
    expect(v18!.correct).toBe(1);
    expect(v18!.acc).toBeCloseTo(50, 1);
    // Brier = ((0.7-1)^2 + (0.6-0)^2) / 2 = (0.09 + 0.36) / 2 = 0.225
    expect(v18!.brier).toBeCloseTo(0.225, 4);

    const v15 = snap.scoringRules.find((s) => s.rule === "v1.5");
    expect(v15!.total).toBe(1);
    expect(v15!.acc).toBe(100);
  });

  it("treats null scoring_rule as 'null' key", () => {
    const rows = [row(true, null, 0.6, "2026-05-20T10:00:00Z")];
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE });
    expect(snap.scoringRules.length).toBe(1);
    expect(snap.scoringRules[0].rule).toBe("null");
  });

  it("groups by UTC weekday and orders Mon-Sun", () => {
    const rows = [
      // 2026-05-25 = Monday (UTC)
      row(true, "v1.8", 0.6, "2026-05-25T10:00:00Z"),
      // 2026-05-22 = Friday (UTC)
      row(false, "v1.8", 0.5, "2026-05-22T10:00:00Z"),
      // 2026-05-24 = Sunday (UTC)
      row(true, "v1.8", 0.55, "2026-05-24T10:00:00Z"),
    ];
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE });
    const days = snap.weekdays.map((w) => w.weekday);
    expect(days).toEqual(["Mon", "Fri", "Sun"]);
    expect(snap.weekdays[0].total).toBe(1);
    expect(snap.weekdays[1].acc).toBe(0);
    expect(snap.weekdays[2].acc).toBe(100);
  });

  it("skips rows with null verified_at for weekday split but keeps in scoring_rule split", () => {
    const rows = [
      row(true, "v1.8", 0.6, null),
      row(true, "v1.8", 0.7, "2026-05-25T10:00:00Z"),
    ];
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE });
    expect(snap.totalVerified).toBe(2);
    expect(snap.scoringRules[0].total).toBe(2);
    expect(snap.weekdays.length).toBe(1);
    expect(snap.weekdays[0].total).toBe(1);
  });

  it("computes v1.8 progress against default target n=150", () => {
    const rows: PredRowMin[] = [];
    for (let i = 0; i < 39; i++) {
      rows.push(row(i % 2 === 0, "v1.8", 0.6, "2026-05-20T10:00:00Z"));
    }
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE });
    expect(snap.v18Progress.n).toBe(39);
    expect(snap.v18Progress.target).toBe(150);
    expect(snap.v18Progress.remaining).toBe(111);
    expect(snap.v18Progress.pct).toBeCloseTo(26, 0);
  });

  it("supports custom v18 target", () => {
    const rows = [row(true, "v1.8", 0.6, "2026-05-20T10:00:00Z")];
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE, v18Target: 100 });
    expect(snap.v18Progress.target).toBe(100);
    expect(snap.v18Progress.remaining).toBe(99);
  });

  it("clamps remaining to 0 when n exceeds target", () => {
    const rows: PredRowMin[] = [];
    for (let i = 0; i < 200; i++) {
      rows.push(row(true, "v1.8", 0.6, "2026-05-20T10:00:00Z"));
    }
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE });
    expect(snap.v18Progress.n).toBe(200);
    expect(snap.v18Progress.remaining).toBe(0);
  });

  it("emits markdown with all expected sections", () => {
    const rows = [
      row(true, "v1.8", 0.7, "2026-05-25T10:00:00Z"),
      row(false, "v1.6", 0.6, "2026-05-22T10:00:00Z"),
    ];
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE });
    expect(snap.markdown).toContain("# stale-data snapshot (2026-05-25)");
    expect(snap.markdown).toContain("## scoring_rule 성과");
    expect(snap.markdown).toContain("## 요일별 누적");
    expect(snap.markdown).toContain("## v2.0 가중치 upgrade 진행");
    expect(snap.markdown).toContain("v1.8 누적:");
    expect(snap.markdown).toContain("auto-commit risk 차단");
    expect(snap.markdown).toContain("CLAUDE.md 한줄 형식:");
  });

  it("ignores NaN-valued verified_at strings", () => {
    const rows = [
      row(true, "v1.8", 0.6, "not-a-date"),
      row(true, "v1.8", 0.7, "2026-05-25T10:00:00Z"),
    ];
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE });
    expect(snap.totalVerified).toBe(2);
    expect(snap.weekdays.length).toBe(1);
    expect(snap.weekdays[0].total).toBe(1);
  });

  it("falls back confidence=0.5 when null for Brier", () => {
    const rows = [
      row(false, "v1.8", null, "2026-05-25T10:00:00Z"),
      row(true, "v1.8", null, "2026-05-25T11:00:00Z"),
    ];
    const snap = buildStaleSnapshot({ rows, generatedAt: FIXED_DATE });
    // Brier = ((0.5-0)^2 + (0.5-1)^2) / 2 = (0.25 + 0.25) / 2 = 0.25
    expect(snap.scoringRules[0].brier).toBeCloseTo(0.25, 4);
  });
});
