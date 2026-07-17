import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FACTOR_LABELS_SHORT } from '@/lib/predictions/factorLabels';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');
const FACTOR_LABELS_FILE = join(ROOT, 'src/lib/predictions/factorLabels.ts');

// wave-430: 종합 우세 배지 우세 팩터 항목 나열 — cycle 1784.
// 기존 "{favoredName} {count}팩터 우세" → "{favoredName} {count}팩터 우세 (선발·타선·Elo)"
// FACTOR_LABELS_SHORT 단축 레이블 + compositeDuelHomeSlugs/AwaySlugs 사용.

describe('wave-430 — FACTOR_LABELS_SHORT 정합성', () => {
  const expectedSlugs = [
    'sp_fip', 'sp_xfip', 'lineup_woba', 'bullpen_fip',
    'recent_form', 'war', 'head_to_head', 'park_factor', 'elo', 'sfr',
  ];

  it('10팩터 슬러그 모두 FACTOR_LABELS_SHORT 에 존재', () => {
    for (const slug of expectedSlugs) {
      expect(FACTOR_LABELS_SHORT[slug]).toBeTruthy();
    }
  });

  it('단축 레이블 길이 ≤ 5 (인라인 나열 적합)', () => {
    for (const slug of expectedSlugs) {
      expect(FACTOR_LABELS_SHORT[slug].length).toBeLessThanOrEqual(5);
    }
  });

  it('sp_fip → "선발"', () => {
    expect(FACTOR_LABELS_SHORT.sp_fip).toBe('선발');
  });

  it('elo → "Elo"', () => {
    expect(FACTOR_LABELS_SHORT.elo).toBe('Elo');
  });

  it('war → "WAR"', () => {
    expect(FACTOR_LABELS_SHORT.war).toBe('WAR');
  });
});

describe('wave-430 — computeCompositeDuel slug → 단축 레이블 매핑', () => {
  it('홈 우세 slugs 를 FACTOR_LABELS_SHORT 로 join 시 비어 있지 않음', () => {
    const result = computeCompositeDuel({
      homeCode: 'LG',
      homeLineupWoba: 0.380,
      awayLineupWoba: 0.310,
      homeSfr: 15,
      awaySfr: -5,
      homeBullpenFip: 3.2,
      awayBullpenFip: 4.8,
      homeSPFip: 3.0,
      awaySPFip: 4.5,
      homeSPXfip: 3.1,
      awaySPXfip: 4.6,
      homeWar: 25,
      awayWar: 10,
      homeElo: 1600,
      awayElo: 1450,
      homeRecentForm: 0.8,
      awayRecentForm: 0.3,
      h2hHomeWins: 8,
      h2hAwayWins: 2,
    });

    expect(result.homeFavoredSlugs.length).toBeGreaterThanOrEqual(7);
    const inline = result.homeFavoredSlugs
      .map((s) => FACTOR_LABELS_SHORT[s] ?? s)
      .join('·');
    expect(inline).not.toBe('');
    expect(inline).toContain('선발');
    expect(inline).toContain('타선');
    expect(inline).toContain('Elo');
  });
});

describe('wave-430 — analysis/page.tsx JSDoc 정합', () => {
  let src: string;
  let labelsSrc: string;

  beforeAll(() => {
    src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    labelsSrc = readFileSync(FACTOR_LABELS_FILE, 'utf-8');
  });

  it('wave-430 주석 존재 (analysis/page.tsx)', () => {
    expect(src).toContain('wave-430');
  });

  it('FACTOR_LABELS_SHORT import 추가 (analysis/page.tsx)', () => {
    expect(src).toContain('FACTOR_LABELS_SHORT');
  });

  it('factorInline 변수 사용 (우세 팩터 나열 로직)', () => {
    expect(src).toContain('factorInline');
  });

  it('compositeDuelHomeSlugs / compositeDuelAwaySlugs 참조 (slug 나열)', () => {
    expect(src).toContain('compositeDuelHomeSlugs');
    expect(src).toContain('compositeDuelAwaySlugs');
  });

  it('FACTOR_LABELS_SHORT 정의 존재 (factorLabels.ts)', () => {
    expect(labelsSrc).toContain('FACTOR_LABELS_SHORT');
    expect(labelsSrc).toContain('wave-430');
  });
});
