import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { COMPOSITE_DUEL_FACTOR_LABEL_LIMIT } from '@moneyball/shared';
import { FACTOR_LABELS_SHORT } from '@/lib/predictions/factorLabels';

// wave-482: analysis LIST 비수렴 N:M 배지에 우세 팩터 단축 레이블 표시
// Feature-Drift Cycle: review-code (wave-481) → explore-idea (wave-482)
// wave-480 (game/[id] DETAIL 비수렴) 패턴을 analysis/page LIST 비수렴 배지에 대칭 적용

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

const analysisListSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-482 — analysis LIST 비수렴 N:M 배지 팩터 레이블 표시', () => {
  it('analysis/page.tsx wave-482 comment 존재', () => {
    expect(analysisListSrc).toContain('wave-482');
  });

  it('analysis/page.tsx COMPOSITE_DUEL_FACTOR_LABEL_LIMIT import 존재', () => {
    expect(analysisListSrc).toContain('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT');
  });

  it('analysis/page.tsx !isPickGame 분기 팩터 레이블 렌더링 존재', () => {
    expect(analysisListSrc).toContain('!isPickGame');
    expect(analysisListSrc).toContain('compositeDuelHomeSlugs');
    expect(analysisListSrc).toContain('compositeDuelAwaySlugs');
  });

  it('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT JSDoc wave-482 bullet 존재', () => {
    expect(sharedSrc).toContain('wave-482 analysis/page.tsx 비수렴 LIST 배지 팩터 레이블 표시 (cycle 1845)');
  });

  it('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT 값 3', () => {
    expect(COMPOSITE_DUEL_FACTOR_LABEL_LIMIT).toBe(3);
  });

  it('비수렴 팩터 레이블 조인 포맷 — 중점 구분자', () => {
    const slugs = ['sp_fip', 'elo', 'lineup_woba'];
    const labels = slugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT).map((s) => FACTOR_LABELS_SHORT[s] ?? s).join('·');
    expect(labels).toBe('선발·Elo·타선');
  });

  it('빈 slug 배열 시 factorLabels 빈 문자열', () => {
    const slugs: string[] = [];
    const labels = slugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT).map((s) => FACTOR_LABELS_SHORT[s] ?? s).join('·');
    expect(labels).toBe('');
  });

  it('FACTOR_LABELS_SHORT 10팩터 slug 전체 커버', () => {
    const requiredSlugs = [
      'sp_fip', 'sp_xfip', 'lineup_woba', 'bullpen_fip',
      'recent_form', 'war', 'head_to_head', 'park_factor', 'elo', 'sfr',
    ];
    for (const slug of requiredSlugs) {
      expect(FACTOR_LABELS_SHORT[slug], `${slug} label missing`).toBeTruthy();
    }
  });

  it('wave-480 DETAIL↔LIST 대칭 — 동일 상수 재사용', () => {
    // game/[id] page.tsx 와 analysis/page.tsx 모두 COMPOSITE_DUEL_FACTOR_LABEL_LIMIT 사용
    const gameDetailSrc = readFileSync(
      join(__dirname, '../analysis/game/[id]/page.tsx'),
      'utf8',
    );
    expect(gameDetailSrc).toContain('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT');
    expect(analysisListSrc).toContain('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT');
  });
});
