/**
 * wave-253 regression guard — /v2-preview OG/Twitter image 사용자 가시 텍스트에서
 * stale "v2.1-B Weight Simulation" / "Reweight" / "Pending" 표현을 제거하고
 * rejected 상태 (v2.1-B rejected · v1.8 retained) 를 반영 (cycle 1556).
 *
 * Root cause: /v2-preview/page.tsx metadata 는 "v2.1-B rejected, v1.8 유지 확정" 반영
 *   완료 (2026-07-06 결정 cycle 1447 등). 하지만 opengraph-image.tsx / twitter-image.tsx
 *   는 여전히 "v2.1-B Weight Simulation" / "Reweight" / "Pending" 표현 유지 →
 *   OG/Twitter card 는 여전히 promotion 예정처럼 표시 = 사용자 가시 silent drift.
 *
 * fix:
 *   - alt: "Internal Weight Reweight" → "Internal · v2.1-B Rejected · v1.8 Retained"
 *   - title text: "v2.1-B Weight Simulation (Internal)" → "v2.1-B Simulation · Rejected (Internal)"
 *   - tag list: ["Brier 0.24830", "v2.1-B", "Reweight", "sfr 0", "h2h 2"]
 *              → ["v2.1-B Rejected", "v1.8 Retained", `n=${V2_PROMOTION_COHORT_N}`, "Shadow Brier 0.4635"]
 *   - footer: "N={n} Pending" → "N={n} Crossed · Rejected"
 *
 * silent drift family 253번째 wave (cycle 458 → cycle 1556).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "../../../../..");
const OG_SRC = readFileSync(
  join(REPO_ROOT, "apps/moneyball/src/app/v2-preview/opengraph-image.tsx"),
  "utf-8",
);
const TWITTER_SRC = readFileSync(
  join(REPO_ROOT, "apps/moneyball/src/app/v2-preview/twitter-image.tsx"),
  "utf-8",
);

describe("wave-253: /v2-preview OG image 사용자 가시 텍스트 = rejected 상태 반영", () => {
  it("alt: stale 'Weight Reweight' 제거", () => {
    expect(OG_SRC).not.toContain("Internal Weight Reweight");
    expect(TWITTER_SRC).not.toContain("Internal Weight Reweight");
  });

  it("alt: 'v2.1-B Rejected' + 'v1.8 Retained' 반영", () => {
    expect(OG_SRC).toContain("v2.1-B Rejected");
    expect(OG_SRC).toContain("v1.8 Retained");
    expect(TWITTER_SRC).toContain("v2.1-B Rejected");
    expect(TWITTER_SRC).toContain("v1.8 Retained");
  });

  it("title JSX: stale 'v2.1-B Weight Simulation' 제거", () => {
    expect(OG_SRC).not.toContain("v2.1-B Weight Simulation");
  });

  it("title JSX: 'v2.1-B Simulation · Rejected' 반영", () => {
    expect(OG_SRC).toContain("v2.1-B Simulation · Rejected");
  });

  it("tag list: stale 'Brier 0.24830' / 'Reweight' / 'sfr 0' / 'h2h 2' 제거", () => {
    expect(OG_SRC).not.toContain('"Brier 0.24830"');
    expect(OG_SRC).not.toContain('"Reweight"');
    expect(OG_SRC).not.toContain('"sfr 0"');
    expect(OG_SRC).not.toContain('"h2h 2"');
  });

  it("tag list: 'v2.1-B Rejected' / 'v1.8 Retained' / 'Shadow Brier 0.4635' 반영", () => {
    expect(OG_SRC).toContain('"v2.1-B Rejected"');
    expect(OG_SRC).toContain('"v1.8 Retained"');
    expect(OG_SRC).toContain('"Shadow Brier 0.4635"');
  });

  it("footer: stale 'Pending' 문구 제거 (v2 promotion 예정 misleading 차단)", () => {
    expect(OG_SRC).not.toContain("Pending</span>");
  });

  it("footer: 'Crossed · Rejected' 반영", () => {
    expect(OG_SRC).toContain("Crossed · Rejected");
  });
});
