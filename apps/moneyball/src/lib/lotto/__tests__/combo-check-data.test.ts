import { describe, it, expect } from "vitest";
import { loadAllPicks, loadAllWinners } from "../combo-check-data";

describe("combo-check-data (cycle 3061 — 기존 테스트 커버리지 공백 보강)", () => {
  it("loadAllPicks — 실제 lotto-picks 디렉토리에서 6-num key 세트 로드", () => {
    const { keys, picksByFile, totalSets } = loadAllPicks();
    expect(totalSets).toBeGreaterThan(0);
    expect(keys.length).toBeGreaterThan(0);
    expect(Object.keys(picksByFile).length).toBeGreaterThan(0);

    // 모든 key 는 "n1,n2,...,n6" (1-45, 오름차순 정렬) 형식
    for (const key of keys) {
      const nums = key.split(",").map(Number);
      expect(nums).toHaveLength(6);
      for (const n of nums) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(45);
      }
      const sorted = nums.slice().sort((a, b) => a - b);
      expect(nums).toEqual(sorted);
    }
  });

  it("loadAllWinners — 실제 lotto-data.json 역대 1등 조합 로드, key 가 6-num 정렬 join", () => {
    const { keyToRound } = loadAllWinners();
    const roundKeys = Object.keys(keyToRound);
    expect(roundKeys.length).toBeGreaterThan(0);

    const sampleKey = roundKeys[0];
    const entry = keyToRound[sampleKey];
    expect(entry.numbers).toHaveLength(6);
    const expectedKey = entry.numbers.slice().sort((a, b) => a - b).join(",");
    expect(sampleKey).toBe(expectedKey);
    expect(entry.round).toBeGreaterThan(0);
  });
});
