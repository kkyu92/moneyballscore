import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getAccuracyColor } from '@moneyball/shared';

// wave-497: 홈 "오늘 예측" 카드 티어별 과거 적중률 인라인 표시
// explore-idea (heavy) — cycle 1864
// Feature-Drift Cycle: fix-incident (1863) → explore-idea (wave-497)
// accuracy.tierRates 재활용 (buildTierRates 이미 계산됨), 새 DB 쿼리 0

const pageSrc = readFileSync(
  join(__dirname, '../page.tsx'),
  'utf8',
);

describe('wave-497 — 홈 tier 분포 카드 과거 적중률 인라인', () => {
  it('getAccuracyColor import됨', () => {
    expect(pageSrc).toContain('getAccuracyColor');
  });

  it('accuracy.tierRates 재활용 — histPct 계산', () => {
    expect(pageSrc).toContain('accuracy.tierRates[tier]');
    expect(pageSrc).toContain('histPct');
  });

  it('histPct null 방어 — stat.total 0 체크', () => {
    expect(pageSrc).toContain('stat.total > 0');
  });

  it('histPct tooltip에 분모 노출', () => {
    expect(pageSrc).toContain('stat.correct}/${stat.total}');
  });

  it('getAccuracyColor 색상 임계 — 65% 이상 green', () => {
    expect(getAccuracyColor(65)).toBe('text-green-600');
    expect(getAccuracyColor(64)).toBe('text-yellow-600');
    expect(getAccuracyColor(54)).toBe('text-red-600');
  });
});
