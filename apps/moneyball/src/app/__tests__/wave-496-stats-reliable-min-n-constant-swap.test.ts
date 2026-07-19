import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { STATS_RELIABLE_MIN_N } from '@moneyball/shared';

// wave-496: STATS_RELIABLE_MIN_N 상수 추출 — 3 file 하드코딩 `30` swap
// review-code (heavy) — cycle 1862
// Feature-Drift Cycle: explore-idea (wave-495) → review-code (wave-496)
// silent drift: totalVerified >= 30 / bucket.n < 30 / v.n < 30 분산 magic number

const accuracyHeaderSrc = readFileSync(
  join(__dirname, '../../components/predictions/AccuracyHeaderCard.tsx'),
  'utf8',
);

const accuracyPageSrc = readFileSync(
  join(__dirname, '../accuracy/page.tsx'),
  'utf8',
);

const modelVersionSrc = readFileSync(
  join(__dirname, '../../components/accuracy/ModelVersionHistory.tsx'),
  'utf8',
);

describe('wave-496 — STATS_RELIABLE_MIN_N 상수 swap (CLT 30 임계)', () => {
  it('STATS_RELIABLE_MIN_N 값은 30 (CLT 실용 임계)', () => {
    expect(STATS_RELIABLE_MIN_N).toBe(30);
  });

  it('AccuracyHeaderCard: totalVerified >= 30 magic 없음', () => {
    expect(accuracyHeaderSrc).not.toMatch(/totalVerified\s*>=\s*30\b/);
  });

  it('AccuracyHeaderCard: STATS_RELIABLE_MIN_N 사용됨', () => {
    expect(accuracyHeaderSrc).toContain('STATS_RELIABLE_MIN_N');
    expect(accuracyHeaderSrc).toContain('totalVerified >= STATS_RELIABLE_MIN_N');
  });

  it('accuracy/page: bucket.n < 30 magic 없음', () => {
    expect(accuracyPageSrc).not.toMatch(/bucket\.n\s*<\s*30\b/);
  });

  it('accuracy/page: STATS_RELIABLE_MIN_N 사용됨', () => {
    expect(accuracyPageSrc).toContain('STATS_RELIABLE_MIN_N');
    expect(accuracyPageSrc).toContain('bucket.n < STATS_RELIABLE_MIN_N');
  });

  it('ModelVersionHistory: v.n < 30 magic 없음', () => {
    expect(modelVersionSrc).not.toMatch(/v\.n\s*<\s*30\b/);
  });

  it('ModelVersionHistory: STATS_RELIABLE_MIN_N 사용됨', () => {
    expect(modelVersionSrc).toContain('STATS_RELIABLE_MIN_N');
    expect(modelVersionSrc).toContain('v.n < STATS_RELIABLE_MIN_N');
  });
});
