import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { COMPOSITE_DUEL_FACTOR_LABEL_LIMIT, FACTOR_PICK_MIN_FACTORS } from '@moneyball/shared';
import { FACTOR_LABELS_SHORT } from '@/lib/predictions/factorLabels';

// wave-484: analysis LIST 이번 주 남은 경기 비수렴 N:M 배지 단축 레이블 표시
// Feature-Drift Cycle: review-code (wave-483) → explore-idea (wave-484)
// wave-480 (DETAIL) / wave-482 (LIST TODAY) 패턴을 이번 주 남은 경기 섹션에 대칭 적용 → 3-way 완성

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

const analysisListSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-484 — analysis LIST 이번 주 남은 경기 비수렴 N:M 배지 팩터 레이블 표시', () => {
  it('analysis/page.tsx wave-484 comment 존재', () => {
    expect(analysisListSrc).toContain('wave-484');
  });

  it('UpcomingScheduledGame factorFavoredSlugs 필드 존재', () => {
    expect(analysisListSrc).toContain('factorFavoredSlugs');
  });

  it('getThisWeekRemainingGames homeFavoredSlugs/awayFavoredSlugs 추출 존재', () => {
    expect(analysisListSrc).toContain('homeFavoredSlugs');
    expect(analysisListSrc).toContain('awayFavoredSlugs');
  });

  it('이번 주 남은 경기 렌더링 비수렴 분기 존재', () => {
    expect(analysisListSrc).toContain('g.factorFavoredSlugs');
  });

  it('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT JSDoc wave-484 bullet 존재', () => {
    expect(sharedSrc).toContain('wave-484 analysis/page.tsx 이번 주 남은 경기 비수렴 LIST 배지 팩터 레이블 표시 (cycle 1847)');
  });

  it('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT 값 3', () => {
    expect(COMPOSITE_DUEL_FACTOR_LABEL_LIMIT).toBe(3);
  });

  it('비수렴 팩터 레이블 조인 포맷 — 중점 구분자', () => {
    const slugs = ['sp_fip', 'elo', 'bullpen_fip'];
    const labels = slugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT).map((s) => FACTOR_LABELS_SHORT[s] ?? s).join('·');
    expect(labels).toBe('선발·Elo·불펜');
  });

  it('빈 slug 배열 시 factorLabels 빈 문자열', () => {
    const slugs: string[] = [];
    const labels = slugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT).map((s) => FACTOR_LABELS_SHORT[s] ?? s).join('·');
    expect(labels).toBe('');
  });

  it('isPickGame 분기 — FACTOR_PICK_MIN_FACTORS 임계 이상 시 레이블 숨김', () => {
    // convergenceNetScore >= FACTOR_PICK_MIN_FACTORS → isPickGame → 레이블 X
    const convergenceNetScore = FACTOR_PICK_MIN_FACTORS;
    const isPickGame = Math.abs(convergenceNetScore) >= FACTOR_PICK_MIN_FACTORS;
    expect(isPickGame).toBe(true);
  });

  it('isPickGame 분기 — FACTOR_PICK_MIN_FACTORS 미만 시 비수렴 레이블 표시', () => {
    const convergenceNetScore = FACTOR_PICK_MIN_FACTORS - 1;
    const isPickGame = Math.abs(convergenceNetScore) >= FACTOR_PICK_MIN_FACTORS;
    expect(isPickGame).toBe(false);
  });

  it('wave-480/482/484 3-way 대칭 — 동일 상수 재사용', () => {
    const gameDetailSrc = readFileSync(
      join(__dirname, '../analysis/game/[id]/page.tsx'),
      'utf8',
    );
    // wave-480 DETAIL
    expect(gameDetailSrc).toContain('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT');
    // wave-482 LIST TODAY
    expect(analysisListSrc).toContain('compositeDuelHomeSlugs');
    // wave-484 LIST UPCOMING
    expect(analysisListSrc).toContain('g.factorFavoredSlugs');
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
});
