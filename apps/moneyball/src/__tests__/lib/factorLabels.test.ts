import { describe, expect, it } from "vitest";
import { topFavoringFactors } from "@/lib/predictions/factorLabels";

describe("topFavoringFactors", () => {
  const factors: Record<string, number> = {
    elo: 0.6,          // strong home favor
    sp_fip: 0.56,      // moderate home favor (>0.55 threshold)
    lineup_woba: 0.54, // below threshold — excluded
    bullpen_fip: 0.44, // below threshold for home — excluded
    recent_form: 0.3,  // strong away favor
    war: 0.5,          // neutral — excluded
  };

  it("홈팀 예측 시 threshold 0.55 초과 팩터만 반환", () => {
    const result = topFavoringFactors(factors, true, 3);
    expect(result).toContain("팀 전력");   // elo=0.6
    expect(result).toContain("선발 투수력"); // sp_fip=0.56
    expect(result).not.toContain("타선 화력"); // lineup_woba=0.54 (below 0.55)
  });

  it("원정팀 예측 시 threshold 0.45 미만 팩터만 반환", () => {
    const result = topFavoringFactors(factors, false, 3);
    expect(result).toContain("최근 폼");   // recent_form=0.3 (<0.45) → included
    expect(result).toContain("불펜 안정성"); // bullpen_fip=0.44 (<0.45) → included
    expect(result).not.toContain("타선 화력"); // lineup_woba=0.54 (>=0.45) → excluded
  });

  it("중립 팩터(0.5) 제외", () => {
    const result = topFavoringFactors(factors, true, 10);
    expect(result).not.toContain("팀 기여도"); // war=0.5
  });

  it("n개 제한 준수", () => {
    const result = topFavoringFactors(factors, true, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("팀 전력"); // elo=0.6이 가장 강한 홈 우위
  });

  it("FACTOR_LABELS에 없는 키 제외", () => {
    const withUnknown = { ...factors, unknown_factor: 0.9 };
    const result = topFavoringFactors(withUnknown, true, 10);
    expect(result.every((label) => label !== "unknown_factor")).toBe(true);
  });
});
