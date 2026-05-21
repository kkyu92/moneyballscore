import { describe, it, expect } from "vitest";
import { parseChangelogText } from "../parse";

describe("parseChangelogText — h2 boundary split", () => {
  it("빈 문자열 → 빈 배열", () => {
    expect(parseChangelogText("")).toEqual([]);
  });

  it("h1 (# 제목) skip — entry 0", () => {
    expect(parseChangelogText("# Changelog\n\n본문은 무시")).toEqual([]);
  });

  it("단일 ## entry 파싱", () => {
    const entries = parseChangelogText(
      "## v0.5.49 — cycle 651 (2026-05-19)\n\n본문 한 줄",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("v0.5.49 — cycle 651 (2026-05-19)");
    expect(entries[0].body).toBe("본문 한 줄");
  });

  it("여러 ## entry 박제 순서 유지", () => {
    const raw = "## A\n본문A\n## B\n본문B\n## C\n본문C";
    const entries = parseChangelogText(raw);
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.title)).toEqual(["A", "B", "C"]);
    expect(entries[0].body).toBe("본문A");
    expect(entries[2].body).toBe("본문C");
  });
});

describe("parseChangelogText — date 추출", () => {
  it("YYYY-MM-DD 패턴 추출", () => {
    const entries = parseChangelogText("## cycle 800 (2026-05-21)\n본문");
    expect(entries[0].date).toBe("2026-05-21");
  });

  it("date 부재 → null", () => {
    const entries = parseChangelogText("## 제목만 있음\n본문");
    expect(entries[0].date).toBeNull();
  });
});

describe("parseChangelogText — cycle 추출", () => {
  it("cycle N 패턴 추출 (소문자)", () => {
    const entries = parseChangelogText("## cycle 808 release\n본문");
    expect(entries[0].cycle).toBe(808);
  });

  it("Cycle N 대소문자 무시", () => {
    const entries = parseChangelogText("## Cycle 651 milestone\n본문");
    expect(entries[0].cycle).toBe(651);
  });

  it("cycle 공백 무관 매칭", () => {
    const entries = parseChangelogText("## cycle808 tight\n본문");
    expect(entries[0].cycle).toBe(808);
  });

  it("cycle 부재 → null", () => {
    const entries = parseChangelogText("## v1.0 release\n본문");
    expect(entries[0].cycle).toBeNull();
  });
});

describe("parseChangelogText — id slugify", () => {
  it("id 포맷 `${idx}-${slug}` index 0부터", () => {
    const entries = parseChangelogText("## first\nA\n## second\nB");
    expect(entries[0].id).toMatch(/^0-/);
    expect(entries[1].id).toMatch(/^1-/);
  });

  it("한글 + 영문 + 숫자 보존, 특수문자 제거", () => {
    const entries = parseChangelogText("## cycle 808 박제!!!\n본문");
    expect(entries[0].id).toBe("0-cycle-808-박제");
  });

  it("title 60자 초과 시 truncate", () => {
    const longTitle = "a".repeat(100);
    const entries = parseChangelogText(`## ${longTitle}\n본문`);
    expect(entries[0].id.length).toBeLessThanOrEqual(62); // "0-" + 60
  });

  it("빈 slug → fallback `entry`", () => {
    const entries = parseChangelogText("## !!!\n본문");
    expect(entries[0].id).toBe("0-entry");
  });
});

describe("parseChangelogText — body 처리", () => {
  it("body trim — 앞뒤 공백 제거", () => {
    const entries = parseChangelogText("## title\n\n\n본문\n\n");
    expect(entries[0].body).toBe("본문");
  });

  it("body 빈 entry 도 박제", () => {
    const entries = parseChangelogText("## title\n");
    expect(entries).toHaveLength(1);
    expect(entries[0].body).toBe("");
  });

  it("멀티라인 body 보존", () => {
    const entries = parseChangelogText("## title\nL1\nL2\nL3");
    expect(entries[0].body).toBe("L1\nL2\nL3");
  });

  it("## 안 ### h3 는 body 안 보존", () => {
    const entries = parseChangelogText("## title\n### subsection\n내용");
    expect(entries).toHaveLength(1);
    expect(entries[0].body).toContain("### subsection");
    expect(entries[0].body).toContain("내용");
  });
});
