import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { COMPOSITE_DUEL_FACTOR_LABEL_LIMIT } from '@moneyball/shared';
import { FACTOR_LABELS_SHORT } from '@/lib/predictions/factorLabels';

// wave-480: game/[id] 비수렴 N:M 배지 우세 팩터 단축 레이블 인라인 표시
// Feature-Drift Cycle: review-code (wave-479) → explore-idea (wave-480)
// wave-430(analysis LIST 수렴 팩터 레이블) 패턴을 game/[id] 비수렴 배지에 적용

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

const gameDetailSrc = readFileSync(
  join(__dirname, '../analysis/game/[id]/page.tsx'),
  'utf8',
);

describe('wave-480 — game/[id] 비수렴 N:M 배지 팩터 레이블 표시', () => {
  it('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT 값 3', () => {
    expect(COMPOSITE_DUEL_FACTOR_LABEL_LIMIT).toBe(3);
  });

  it('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT JSDoc wave-480 bullet 존재', () => {
    expect(sharedSrc).toContain('wave-480 (cycle 1843)');
  });

  it('game/[id] page wave-480 comment 존재', () => {
    expect(gameDetailSrc).toContain('wave-480');
  });

  it('game/[id] page COMPOSITE_DUEL_FACTOR_LABEL_LIMIT import 존재', () => {
    expect(gameDetailSrc).toContain('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT');
  });

  it('FACTOR_LABELS_SHORT 모든 컴포짓 팩터 slug 커버', () => {
    const requiredSlugs = [
      'sp_fip', 'sp_xfip', 'lineup_woba', 'bullpen_fip',
      'recent_form', 'war', 'head_to_head', 'park_factor', 'elo', 'sfr',
    ];
    for (const slug of requiredSlugs) {
      expect(FACTOR_LABELS_SHORT[slug], `${slug} label missing`).toBeTruthy();
    }
  });

  it('favoredSlugs slice 동작 — limit 3 적용', () => {
    const slugs = ['sp_fip', 'lineup_woba', 'elo', 'recent_form', 'war'];
    const limited = slugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT);
    expect(limited).toHaveLength(3);
    expect(limited).toEqual(['sp_fip', 'lineup_woba', 'elo']);
  });

  it('factorInline 조인 포맷 — 중점 구분자', () => {
    const slugs = ['sp_fip', 'lineup_woba', 'elo'];
    const inline = slugs.map((s) => FACTOR_LABELS_SHORT[s] ?? s).join('·');
    expect(inline).toBe('선발·타선·Elo');
  });

  it('빈 slug 배열 시 factorInline 빈 문자열', () => {
    const slugs: string[] = [];
    const inline = slugs.map((s) => FACTOR_LABELS_SHORT[s] ?? s).join('·');
    expect(inline).toBe('');
  });
});
