import { describe, it, expect } from 'vitest';
import {
  MetricRegistry,
  getProductionMetrics,
  isMetricValueValid,
  renderMetricForLLM,
} from '../context/metrics';
import { DEFAULT_WEIGHTS, ACTIVE_FACTOR_KEYS } from '@moneyball/shared';

describe('MetricRegistry (plan #23 Step 1)', () => {
  it('DEFAULT_WEIGHTS 12 key 모두 박제 — drift 차단', () => {
    const sharedKeys = new Set(Object.keys(DEFAULT_WEIGHTS));
    const registryKeys = new Set(Object.keys(MetricRegistry));
    expect(registryKeys).toEqual(sharedKeys);
  });

  it('weight_v18 = DEFAULT_WEIGHTS mirror — single source of truth', () => {
    for (const slug of Object.keys(MetricRegistry) as Array<keyof typeof MetricRegistry>) {
      expect(MetricRegistry[slug].weight_v18).toBe(DEFAULT_WEIGHTS[slug]);
    }
  });

  it('각 metric 필수 필드 박제 + slug == key', () => {
    for (const [key, def] of Object.entries(MetricRegistry)) {
      expect(def.slug).toBe(key);
      expect(def.ko_name.length).toBeGreaterThan(0);
      expect(def.description_ko.length).toBeGreaterThan(0);
      expect(def.bounds.min).toBeLessThan(def.bounds.max);
      expect(['ratio', 'rate', 'count', 'elo', 'percent']).toContain(def.unit);
      expect(['kbo', 'fancystats', 'fangraphs', 'derived']).toContain(def.source);
      expect(['lower-better', 'higher-better']).toContain(def.direction);
    }
  });
});

describe('getProductionMetrics — v1.8 active factor 10 종', () => {
  it('ACTIVE_FACTOR_KEYS 와 길이 일치 (10)', () => {
    const production = getProductionMetrics();
    expect(production).toHaveLength(ACTIVE_FACTOR_KEYS.length);
  });

  it('shadow-only factor (park_weather / umpire_sz) 제외', () => {
    const slugs = getProductionMetrics().map((m) => m.slug);
    expect(slugs).not.toContain('park_weather');
    expect(slugs).not.toContain('umpire_sz');
  });
});

describe('isMetricValueValid — LLM hallucination catch', () => {
  it('정상 범위 값 → true', () => {
    expect(isMetricValueValid('sp_fip', 3.45)).toBe(true);
    expect(isMetricValueValid('elo', 1520)).toBe(true);
    expect(isMetricValueValid('lineup_woba', 0.342)).toBe(true);
  });

  it('bounds 초과 값 (LLM hallucinate) → false', () => {
    expect(isMetricValueValid('sp_fip', 15.5)).toBe(false); // FIP 15 = 환각
    expect(isMetricValueValid('elo', 9999)).toBe(false);
    expect(isMetricValueValid('lineup_woba', 0.9)).toBe(false);
  });

  it('NaN / Infinity → false', () => {
    expect(isMetricValueValid('sp_fip', Number.NaN)).toBe(false);
    expect(isMetricValueValid('elo', Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('미등록 slug → true (보조 metric 차단 X)', () => {
    expect(isMetricValueValid('winner_prob', 0.65)).toBe(true);
    expect(isMetricValueValid('brier', 0.25)).toBe(true);
  });
});

describe('renderMetricForLLM — prompt 직접 삽입', () => {
  it('한글 풀이 + bounds + direction 포함', () => {
    const line = renderMetricForLLM('sp_fip');
    expect(line).toContain('선발 FIP');
    expect(line).toContain('sp_fip');
    expect(line).toContain('0~10');
    expect(line).toContain('낮을수록');
  });

  it('higher-better metric → "높을수록" 박제', () => {
    expect(renderMetricForLLM('lineup_woba')).toContain('높을수록');
  });
});
