import { describe, it, expect } from "vitest";
import {
  mlbCanonicalPair,
  mlbPairsForTeam,
  mlbAllPairs,
} from "../mlbCanonicalPair";

describe("mlbCanonicalPair", () => {
  it("알파벳 순으로 정렬된 쌍 반환", () => {
    const p = mlbCanonicalPair("NYY", "BOS");
    expect(p).toEqual({
      codeA: "BOS",
      codeB: "NYY",
      path: "/mlb/matchup/BOS/NYY",
    });
  });

  it("이미 정렬된 입력도 동일하게 처리", () => {
    const p = mlbCanonicalPair("BOS", "NYY");
    expect(p?.path).toBe("/mlb/matchup/BOS/NYY");
  });

  it("같은 팀이면 null", () => {
    expect(mlbCanonicalPair("NYY", "NYY")).toBeNull();
  });

  it("유효하지 않은 코드는 null", () => {
    expect(mlbCanonicalPair("XX", "NYY")).toBeNull();
    expect(mlbCanonicalPair("NYY", "YY")).toBeNull();
    expect(mlbCanonicalPair("foo", "bar")).toBeNull();
  });

  it("KBO 팀 코드는 null (MLB registry 비의존)", () => {
    expect(mlbCanonicalPair("HT", "LG")).toBeNull();
  });

  it("canonical 동등성: (a,b)와 (b,a)는 같은 path", () => {
    const p1 = mlbCanonicalPair("LAD", "SFG");
    const p2 = mlbCanonicalPair("SFG", "LAD");
    expect(p1?.path).toBe(p2?.path);
  });
});

describe("mlbPairsForTeam", () => {
  it("특정 팀의 상대 29개 반환", () => {
    const pairs = mlbPairsForTeam("NYY");
    expect(pairs).toHaveLength(29);
    for (const p of pairs) {
      expect([p.codeA, p.codeB]).toContain("NYY");
    }
  });

  it("자기 자신은 포함 안 함", () => {
    const pairs = mlbPairsForTeam("BOS");
    for (const p of pairs) {
      expect(p.codeA === "BOS" && p.codeB === "BOS").toBe(false);
    }
  });
});

describe("mlbAllPairs", () => {
  it("30팀 조합 435개 (30 choose 2)", () => {
    const pairs = mlbAllPairs();
    expect(pairs).toHaveLength(435);
  });

  it("중복 없음 — 모든 path는 unique", () => {
    const pairs = mlbAllPairs();
    const paths = pairs.map((p) => p.path);
    const unique = new Set(paths);
    expect(paths.length).toBe(unique.size);
  });

  it("모든 쌍이 canonical (codeA < codeB)", () => {
    const pairs = mlbAllPairs();
    for (const p of pairs) {
      expect(p.codeA.localeCompare(p.codeB)).toBeLessThan(0);
    }
  });
});
