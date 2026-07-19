import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getConfidenceTierLabel } from '@moneyball/shared';

// wave-491: PredictionCard 신뢰도 티어 라벨 (강한 예측 / 보통 / 박빙)
// explore-idea (heavy) — cycle 1856
// Feature-Drift Cycle: review-code (wave-490) → explore-idea (wave-491)
// op-analysis 1855 근거: high-conf tier(≥65%) 63.6% vs 전체 57.1% — 6.5pp gap

const predCardSrc = readFileSync(
  join(__dirname, '../../components/predictions/PredictionCard.tsx'),
  'utf8',
);

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

describe('wave-491 — PredictionCard 신뢰도 티어 라벨', () => {
  it('getConfidenceTierLabel — 강한 예측 (≥ 65%)', () => {
    expect(getConfidenceTierLabel(65)).toBe('강한 예측');
    expect(getConfidenceTierLabel(80)).toBe('강한 예측');
  });

  it('getConfidenceTierLabel — 보통 (55~64%)', () => {
    expect(getConfidenceTierLabel(55)).toBe('보통');
    expect(getConfidenceTierLabel(64)).toBe('보통');
  });

  it('getConfidenceTierLabel — 박빙 (< 55%)', () => {
    expect(getConfidenceTierLabel(54)).toBe('박빙');
    expect(getConfidenceTierLabel(0)).toBe('박빙');
  });

  it('shared/index.ts — getConfidenceTierLabel export 존재', () => {
    expect(sharedSrc).toContain('export function getConfidenceTierLabel');
  });

  it('shared/index.ts — wave-491 JSDoc 존재', () => {
    expect(sharedSrc).toContain('wave-491');
  });

  it('PredictionCard.tsx — getConfidenceTierLabel import', () => {
    expect(predCardSrc).toContain('getConfidenceTierLabel');
  });

  it('PredictionCard.tsx — wave-491 주석 존재', () => {
    expect(predCardSrc).toContain('wave-491');
  });

  it('PredictionCard.tsx — 티어 라벨 p 요소 렌더링', () => {
    expect(predCardSrc).toMatch(/getConfidenceTierLabel\(confidencePct\)/);
  });
});
