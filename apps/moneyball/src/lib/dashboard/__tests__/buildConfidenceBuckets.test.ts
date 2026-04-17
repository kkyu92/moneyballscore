import { describe, it, expect } from 'vitest';
import { buildConfidenceBuckets } from '../buildConfidenceBuckets';

describe('buildConfidenceBuckets', () => {
  it('빈 배열 → gated, 모든 버킷 0', () => {
    const res = buildConfidenceBuckets([]);
    expect(res.gated).toBe(true);
    expect(res.totalVerified).toBe(0);
    expect(res.buckets.every((b) => b.total === 0)).toBe(true);
    expect(res.buckets.every((b) => b.accuracy === null)).toBe(true);
  });

  it('N < 10 → gated=true, 그래도 버킷 집계는 수행', () => {
    const res = buildConfidenceBuckets([
      { confidence: 0.56, is_correct: true },
      { confidence: 0.62, is_correct: false },
    ]);
    expect(res.gated).toBe(true);
    expect(res.totalVerified).toBe(2);
    expect(res.buckets[1].total).toBe(1);
    expect(res.buckets[2].total).toBe(1);
  });

  it('경계값 정확 할당 — 하한 포함, 상한 미포함', () => {
    const res = buildConfidenceBuckets([
      { confidence: 0.549, is_correct: true },
      { confidence: 0.55, is_correct: true },
      { confidence: 0.599, is_correct: true },
      { confidence: 0.6, is_correct: true },
      { confidence: 0.649, is_correct: true },
      { confidence: 0.65, is_correct: true },
      { confidence: 0.75, is_correct: true },
      { confidence: 0.85, is_correct: true },
      { confidence: 0.9, is_correct: true },
      { confidence: 0.4, is_correct: true },
    ]);
    expect(res.gated).toBe(false);
    expect(res.buckets[0].total).toBe(2);
    expect(res.buckets[1].total).toBe(2);
    expect(res.buckets[2].total).toBe(2);
    expect(res.buckets[3].total).toBe(4);
    expect(res.totalVerified).toBe(10);
  });

  it('한 버킷 쏠림 (55-60% 10건 전부 적중)', () => {
    const preds = Array.from({ length: 10 }, () => ({
      confidence: 0.58,
      is_correct: true,
    }));
    const res = buildConfidenceBuckets(preds);
    expect(res.gated).toBe(false);
    expect(res.buckets[1].total).toBe(10);
    expect(res.buckets[1].accuracy).toBe(100);
    expect(res.buckets[0].total).toBe(0);
    expect(res.buckets[0].accuracy).toBeNull();
  });
});
