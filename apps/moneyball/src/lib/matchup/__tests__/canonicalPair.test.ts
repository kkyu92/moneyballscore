import { describe, it, expect } from "vitest";
import {
  canonicalPair,
  pairsForTeam,
  allPairs,
} from "../canonicalPair";

describe("canonicalPair", () => {
  it("알파벳 순으로 정렬된 쌍 반환", () => {
    const p = canonicalPair("LG", "HT");
    expect(p).toEqual({
      codeA: "HT",
      codeB: "LG",
      path: "/matchup/HT/LG",
    });
  });

  it("이미 정렬된 입력도 동일하게 처리", () => {
    const p = canonicalPair("HT", "LG");
    expect(p?.path).toBe("/matchup/HT/LG");
  });

  it("같은 팀이면 null", () => {
    expect(canonicalPair("HT", "HT")).toBeNull();
  });

  it("유효하지 않은 코드는 null", () => {
    expect(canonicalPair("XX", "HT")).toBeNull();
    expect(canonicalPair("HT", "YY")).toBeNull();
    expect(canonicalPair("foo", "bar")).toBeNull();
  });

  it("canonical 동등성: (a,b)와 (b,a)는 같은 path", () => {
    const p1 = canonicalPair("KT", "OB");
    const p2 = canonicalPair("OB", "KT");
    expect(p1?.path).toBe(p2?.path);
  });
});

describe("pairsForTeam", () => {
  it("특정 팀의 상대 9개 반환", () => {
    const pairs = pairsForTeam("HT");
    expect(pairs).toHaveLength(9);
    // 모든 쌍에 HT 포함
    for (const p of pairs) {
      expect([p.codeA, p.codeB]).toContain("HT");
    }
  });

  it("자기 자신은 포함 안 함", () => {
    const pairs = pairsForTeam("LG");
    for (const p of pairs) {
      expect(p.codeA === "LG" && p.codeB === "LG").toBe(false);
    }
  });
});

describe("allPairs", () => {
  it("10팀 조합 45개", () => {
    const pairs = allPairs();
    expect(pairs).toHaveLength(45);
  });

  it("중복 없음 — 모든 path는 unique", () => {
    const pairs = allPairs();
    const paths = pairs.map((p) => p.path);
    const unique = new Set(paths);
    expect(paths.length).toBe(unique.size);
  });

  it("모든 쌍이 canonical (codeA < codeB)", () => {
    const pairs = allPairs();
    for (const p of pairs) {
      expect(p.codeA.localeCompare(p.codeB)).toBeLessThan(0);
    }
  });
});
