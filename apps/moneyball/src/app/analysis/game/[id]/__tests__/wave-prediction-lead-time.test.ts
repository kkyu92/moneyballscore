import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("prediction lead-time chip (cycle 2156, explore-idea)", () => {
  it("selects predicted_at from the predictions table", () => {
    expect(PAGE_SRC).toMatch(/model_version, debate_version, predicted_at,/);
  });

  it("computes lead hours from predicted_at to game start via HOUR_MS", () => {
    expect(PAGE_SRC).toContain("predictionLeadHours");
    expect(PAGE_SRC).toContain("preGame?.predicted_at");
    expect(PAGE_SRC).toMatch(/getTime\(\) - new Date\(preGame\.predicted_at\)\.getTime\(\)\) \/ HOUR_MS/);
  });

  it("renders the lead-time chip inside the model-meta details block", () => {
    expect(PAGE_SRC).toContain("전 예측 생성");
  });
});
