import { describe, it, expect } from "vitest";
import { parseCohortMarkdown } from "../parse";

const SAMPLE = `# op-analysis cohort split (2026-06-01)

**총 n=220** (적중 117 / 53.2%)

## scoring_rule split

| rule | n | acc | Brier |
|---|---|---|---|
| v1.5 | 16 | 75.0% | 0.2131 |
| v1.8 | 42 | 57.1% | 0.2416 |

## 요일별

| 요일 | n | acc |
|---|---|---|
| 화 | 28 | 53.6% |
| 일 | 29 | 41.4% |

---

자동 생성 — plan #8 Tier 1 M7 op-analysis-weekly cron.
`;

describe("parseCohortMarkdown", () => {
  it("h1 title 박제", () => {
    const doc = parseCohortMarkdown(SAMPLE);
    expect(doc.title).toBe("op-analysis cohort split (2026-06-01)");
  });

  it("summary paragraph 박제", () => {
    const doc = parseCohortMarkdown(SAMPLE);
    expect(doc.summary).toBe("**총 n=220** (적중 117 / 53.2%)");
  });

  it("table 2 개 박제 — scoring_rule + 요일별", () => {
    const doc = parseCohortMarkdown(SAMPLE);
    expect(doc.tables).toHaveLength(2);
    expect(doc.tables[0]?.heading).toBe("scoring_rule split");
    expect(doc.tables[1]?.heading).toBe("요일별");
  });

  it("scoring_rule columns + 2 rows", () => {
    const doc = parseCohortMarkdown(SAMPLE);
    const t = doc.tables[0];
    expect(t?.columns).toEqual(["rule", "n", "acc", "Brier"]);
    expect(t?.rows).toEqual([
      ["v1.5", "16", "75.0%", "0.2131"],
      ["v1.8", "42", "57.1%", "0.2416"],
    ]);
  });

  it("요일별 columns + 2 rows", () => {
    const doc = parseCohortMarkdown(SAMPLE);
    const t = doc.tables[1];
    expect(t?.columns).toEqual(["요일", "n", "acc"]);
    expect(t?.rows).toEqual([
      ["화", "28", "53.6%"],
      ["일", "29", "41.4%"],
    ]);
  });

  it("hr 이후 footer 박제", () => {
    const doc = parseCohortMarkdown(SAMPLE);
    expect(doc.footer).toContain("자동 생성");
  });

  it("빈 body → 빈 doc", () => {
    const doc = parseCohortMarkdown("");
    expect(doc.title).toBe("");
    expect(doc.tables).toEqual([]);
  });
});
