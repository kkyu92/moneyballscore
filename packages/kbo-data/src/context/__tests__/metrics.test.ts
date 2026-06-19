/**
 * metrics.ts tests — plan #23 Step 1 (cycle 1231 silent drift wave 42 coverage).
 *
 * 검증 축:
 *   - MetricRegistry: WeightKey 12 entry 박제 + slug self-consistency
 *   - weight_v18 mirror: DEFAULT_WEIGHTS source 정합 (drift 차단)
 *   - getProductionMetrics: weight_v18 > 0 만 (10 production, shadow 2 제외)
 *   - isMetricValueValid: bounds + non-finite + 미등록 slug 처리
 *   - renderMetricForLLM: ko_name / slug / description / bounds / direction 포함
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS, ACTIVE_FACTOR_KEYS, type WeightKey } from '@moneyball/shared';
import {
  MetricRegistry,
  getProductionMetrics,
  isMetricValueValid,
  renderMetricForLLM,
  type MetricSlug,
} from '../metrics';

describe('MetricRegistry', () => {
  it('DEFAULT_WEIGHTS key 12개 모두 박제', () => {
    const weightKeys = Object.keys(DEFAULT_WEIGHTS) as WeightKey[];
    expect(weightKeys.length).toBe(12);
    for (const key of weightKeys) {
      expect((MetricRegistry as Record<string, unknown>)[key]).toBeDefined();
    }
  });

  it('각 entry 의 slug = key (self-consistency)', () => {
    for (const [key, def] of Object.entries(MetricRegistry)) {
      expect(def.slug).toBe(key);
    }
  });

  it('weight_v18 = DEFAULT_WEIGHTS[slug] mirror (drift 차단)', () => {
    for (const [key, def] of Object.entries(MetricRegistry)) {
      expect(def.weight_v18).toBe(DEFAULT_WEIGHTS[key as WeightKey]);
    }
  });

  it('shadow factor (park_weather / umpire_sz) weight_v18 = 0', () => {
    expect(MetricRegistry.park_weather.weight_v18).toBe(0);
    expect(MetricRegistry.umpire_sz.weight_v18).toBe(0);
  });
});

describe('getProductionMetrics', () => {
  it('production factor 10개만 반환 (shadow 2개 제외)', () => {
    const prod = getProductionMetrics();
    expect(prod.length).toBe(ACTIVE_FACTOR_KEYS.length);
    expect(prod.length).toBe(10);
  });

  it('모든 production metric weight_v18 > 0', () => {
    for (const m of getProductionMetrics()) {
      expect(m.weight_v18).toBeGreaterThan(0);
    }
  });

  it('shadow factor (park_weather / umpire_sz) 미포함', () => {
    const slugs = getProductionMetrics().map((m) => m.slug);
    expect(slugs).not.toContain('park_weather');
    expect(slugs).not.toContain('umpire_sz');
  });
});

describe('isMetricValueValid', () => {
  it('bounds 안 값 = true', () => {
    expect(isMetricValueValid('sp_fip', 3.5)).toBe(true);
    expect(isMetricValueValid('elo', 1500)).toBe(true);
    expect(isMetricValueValid('lineup_woba', 0.320)).toBe(true);
  });

  it('bounds 위 = false (LLM hallucination catch)', () => {
    expect(isMetricValueValid('sp_fip', 15.5)).toBe(false);
    expect(isMetricValueValid('elo', 2500)).toBe(false);
    expect(isMetricValueValid('lineup_woba', 0.9)).toBe(false);
  });

  it('bounds 아래 = false', () => {
    expect(isMetricValueValid('sp_fip', -1)).toBe(false);
    expect(isMetricValueValid('elo', 1000)).toBe(false);
  });

  it('non-finite (NaN / Infinity) = false', () => {
    expect(isMetricValueValid('sp_fip', NaN)).toBe(false);
    expect(isMetricValueValid('sp_fip', Infinity)).toBe(false);
    expect(isMetricValueValid('sp_fip', -Infinity)).toBe(false);
  });

  it('non-number = false', () => {
    expect(isMetricValueValid('sp_fip', '3.5' as unknown as number)).toBe(false);
    expect(isMetricValueValid('sp_fip', null as unknown as number)).toBe(false);
    expect(isMetricValueValid('sp_fip', undefined as unknown as number)).toBe(false);
  });

  it('미등록 slug = true (보조 metric 차단 X)', () => {
    expect(isMetricValueValid('winnerProb', 0.5)).toBe(true);
    expect(isMetricValueValid('brier', 0.25)).toBe(true);
    expect(isMetricValueValid('unknown_metric', 999)).toBe(true);
  });

  it('bounds 경계값 = true (>= min, <= max)', () => {
    expect(isMetricValueValid('sp_fip', 0)).toBe(true);
    expect(isMetricValueValid('sp_fip', 10)).toBe(true);
    expect(isMetricValueValid('park_factor', 0.7)).toBe(true);
    expect(isMetricValueValid('park_factor', 1.3)).toBe(true);
  });
});

describe('renderMetricForLLM', () => {
  it('lower-better metric → "낮을수록 우수"', () => {
    const out = renderMetricForLLM('sp_fip' as MetricSlug);
    expect(out).toContain('선발 FIP');
    expect(out).toContain('sp_fip');
    expect(out).toContain('낮을수록');
    expect(out).toContain('우수');
  });

  it('higher-better metric → "높을수록 우수"', () => {
    const out = renderMetricForLLM('elo' as MetricSlug);
    expect(out).toContain('Elo 레이팅');
    expect(out).toContain('elo');
    expect(out).toContain('높을수록');
  });

  it('bounds min~max 포함', () => {
    const out = renderMetricForLLM('lineup_woba' as MetricSlug);
    expect(out).toContain('0~0.6');
  });

  it('description_ko 포함', () => {
    const out = renderMetricForLLM('park_factor' as MetricSlug);
    expect(out).toContain('구장별 득점 보정');
  });
});
