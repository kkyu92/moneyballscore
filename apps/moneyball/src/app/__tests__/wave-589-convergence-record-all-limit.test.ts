// wave-589: CONVERGENCE_RECORD_ALL_LIMIT 상수 추출 박제
// wave-584/586/588 에서 날짜 범위 전체 조회 시 사용된 Number.MAX_SAFE_INTEGER 를
// CONVERGENCE_RECORD_ALL_LIMIT 명시적 상수로 추출. 6 callsite 동시 적용.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const weeklyPageSrc = readFileSync(
  join(__dirname, '../reviews/weekly/[week]/page.tsx'),
  'utf-8',
);
const monthlyPageSrc = readFileSync(
  join(__dirname, '../reviews/monthly/[month]/page.tsx'),
  'utf-8',
);
const seasonPageSrc = readFileSync(
  join(__dirname, '../seasons/[year]/page.tsx'),
  'utf-8',
);

describe('wave-589: CONVERGENCE_RECORD_ALL_LIMIT 상수 추출', () => {
  it('weekly review 페이지가 CONVERGENCE_RECORD_ALL_LIMIT 사용', () => {
    expect(weeklyPageSrc).toContain('CONVERGENCE_RECORD_ALL_LIMIT');
    expect(weeklyPageSrc).not.toContain('Number.MAX_SAFE_INTEGER');
  });

  it('monthly review 페이지가 CONVERGENCE_RECORD_ALL_LIMIT 사용', () => {
    expect(monthlyPageSrc).toContain('CONVERGENCE_RECORD_ALL_LIMIT');
    expect(monthlyPageSrc).not.toContain('Number.MAX_SAFE_INTEGER');
  });

  it('seasons 페이지가 CONVERGENCE_RECORD_ALL_LIMIT 사용', () => {
    expect(seasonPageSrc).toContain('CONVERGENCE_RECORD_ALL_LIMIT');
    expect(seasonPageSrc).not.toContain('Number.MAX_SAFE_INTEGER');
  });
});
