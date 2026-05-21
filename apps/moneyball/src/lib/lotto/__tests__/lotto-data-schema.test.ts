import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LottoDataSchema,
  RulesHistoryEntrySchema,
  OOSPassRateEntrySchema,
  ChainFireHistoryEntrySchema,
} from "../lotto-data-schema";

const dataPath = join(process.cwd(), "data", "lotto-data.json");

describe("LottoDataSchema", () => {
  it("apps/moneyball/data/lotto-data.json 정합 (build-time guard)", () => {
    const raw = JSON.parse(readFileSync(dataPath, "utf-8"));
    const parsed = LottoDataSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `lotto-data.json schema fail: ${JSON.stringify(parsed.error.format(), null, 2)}`
      );
    }
    expect(parsed.success).toBe(true);
  });

  it("rules_total 양의 정수", () => {
    const raw = JSON.parse(readFileSync(dataPath, "utf-8"));
    expect(raw.rules_total).toBeGreaterThan(0);
    expect(Number.isInteger(raw.rules_total)).toBe(true);
  });

  it("count_valid <= total_combinations (8,145,060) 정합", () => {
    const raw = JSON.parse(readFileSync(dataPath, "utf-8"));
    expect(raw.total_combinations).toBe(8_145_060);
    expect(raw.count_valid).toBeLessThanOrEqual(raw.total_combinations);
  });

  it("chain_fire_history 모든 entry outcome enum 정합", () => {
    const raw = JSON.parse(readFileSync(dataPath, "utf-8"));
    const valid = ["success", "partial", "fail", "interrupted", "retro-only"];
    for (const entry of raw.chain_fire_history) {
      expect(valid).toContain(entry.outcome);
    }
  });
});

describe("RulesHistoryEntrySchema", () => {
  it("정상 entry 통과", () => {
    expect(
      RulesHistoryEntrySchema.parse({ cycle: 823, count: 256, delta: 0 })
    ).toEqual({ cycle: 823, count: 256, delta: 0 });
  });

  it("negative cycle reject", () => {
    expect(
      RulesHistoryEntrySchema.safeParse({ cycle: -1, count: 256, delta: 0 })
        .success
    ).toBe(false);
  });

  it("delta 음수 허용 (rule 제거 사례)", () => {
    expect(
      RulesHistoryEntrySchema.safeParse({ cycle: 824, count: 255, delta: -1 })
        .success
    ).toBe(true);
  });
});

describe("OOSPassRateEntrySchema", () => {
  it("정상 entry 통과", () => {
    expect(
      OOSPassRateEntrySchema.parse({
        draw: 1224,
        date: "2026-05-16",
        passed: 1,
        failed: 0,
      })
    ).toBeDefined();
  });

  it("잘못된 date format reject", () => {
    expect(
      OOSPassRateEntrySchema.safeParse({
        draw: 1224,
        date: "2026/05/16",
        passed: 1,
        failed: 0,
      }).success
    ).toBe(false);
  });

  it("draw 0 reject (양의 정수)", () => {
    expect(
      OOSPassRateEntrySchema.safeParse({
        draw: 0,
        date: "2026-05-16",
        passed: 1,
        failed: 0,
      }).success
    ).toBe(false);
  });
});

describe("ChainFireHistoryEntrySchema", () => {
  it("success outcome 통과", () => {
    expect(
      ChainFireHistoryEntrySchema.safeParse({
        cycle: 823,
        outcome: "success",
        date: "2026-05-21",
      }).success
    ).toBe(true);
  });

  it("invalid outcome reject", () => {
    expect(
      ChainFireHistoryEntrySchema.safeParse({
        cycle: 823,
        outcome: "skipped",
        date: "2026-05-21",
      }).success
    ).toBe(false);
  });
});
