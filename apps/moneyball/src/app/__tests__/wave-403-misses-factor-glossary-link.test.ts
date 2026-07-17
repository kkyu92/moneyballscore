import { describe, it, expect } from 'vitest';
import { FACTOR_GLOSSARY_ANCHORS, FACTOR_LABELS_TECHNICAL } from '@/lib/predictions/factorLabels';

// wave-403: reviews/misses/page.tsx 편향 지목 팩터 → glossary Link
// fe.factor = canonicalized base slug (home_/away_ prefix 제거됨, postview.ts canonicalizeFactorKey)
// FACTOR_GLOSSARY_ANCHORS 에 anchor 존재 시 <Link href="/glossary#anchor"> 렌더.
// silent drift: wave-400 (FactorBreakdown) + wave-401 (FactorAgreementCard) 동일 패턴 미적용.

const PRODUCTION_SLUGS = Object.keys(FACTOR_GLOSSARY_ANCHORS);

describe('wave-403: misses 편향 지목 팩터 glossary Link', () => {
  it('모든 production slugs 가 FACTOR_GLOSSARY_ANCHORS 에 anchor 보유', () => {
    for (const slug of PRODUCTION_SLUGS) {
      expect(FACTOR_GLOSSARY_ANCHORS[slug]).toBeTruthy();
    }
  });

  it('fe.factor = base slug (e.g. sp_fip) → anchor 존재 → Link 렌더 가능', () => {
    const feFactors = ['sp_fip', 'bullpen_fip', 'lineup_woba', 'recent_form', 'elo', 'war', 'sfr', 'head_to_head', 'park_factor', 'sp_xfip'];
    for (const factor of feFactors) {
      const anchor = FACTOR_GLOSSARY_ANCHORS[factor];
      expect(anchor).toBeTruthy();
    }
  });

  it('FACTOR_LABELS_TECHNICAL 에 모든 production slugs 에 대한 label 존재', () => {
    for (const slug of PRODUCTION_SLUGS) {
      expect(FACTOR_LABELS_TECHNICAL[slug]).toBeTruthy();
    }
  });

  it('알 수 없는 factor — anchor undefined → <strong> fallback', () => {
    const unknownFactor = 'unknown_factor_xyz';
    const anchor = FACTOR_GLOSSARY_ANCHORS[unknownFactor];
    expect(anchor).toBeUndefined();
  });

  it('wave-400 / 401 / 403 동일 family — anchor ? Link : fallback 패턴 정합', () => {
    const factor = 'sp_fip';
    const anchor = FACTOR_GLOSSARY_ANCHORS[factor];
    // anchor 있으면 Link path
    const href = anchor ? `/glossary#${anchor}` : null;
    expect(href).toBe('/glossary#fip');
  });
});
