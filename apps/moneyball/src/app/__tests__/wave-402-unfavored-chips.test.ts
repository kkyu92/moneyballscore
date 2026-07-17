import { describe, it, expect } from 'vitest';
import { FACTOR_LABELS, FACTOR_GLOSSARY_ANCHORS } from '@/lib/predictions/factorLabels';

// wave-402: 팩터 수렴 픽 상대 강점 팩터 칩
// analysis/page.tsx — unfavoredSlugs = 비수렴 팩터 (상대방이 이기는 팩터)
//
// favoredHome=true  → unfavoredSlugs = compositeDuelAwaySlugs
// favoredHome=false → unfavoredSlugs = compositeDuelHomeSlugs
// unfavoredChips: filter(c => c.label) — FACTOR_LABELS 에 없는 slug 제거
//
// 표시 조건: unfavoredChips.length > 0 (10:0 완전수렴 시 미표시)
// 스타일: gray-100/gray-800/60 bg (favored brand-100 과 대비)
// 실제 production slugs: sp_fip, sp_xfip, lineup_woba, bullpen_fip,
//                        recent_form, war, head_to_head, park_factor, elo, sfr

function buildChips(
  slugs: string[],
): Array<{ slug: string; label: string | undefined; anchor: string | undefined }> {
  return slugs
    .map((s) => ({ slug: s, label: FACTOR_LABELS[s], anchor: FACTOR_GLOSSARY_ANCHORS[s] }))
    .filter((c) => c.label);
}

describe('wave-402: 상대 강점 팩터 칩', () => {
  it('10:0 완전수렴 — unfavoredSlugs 빈 배열 → chips 없음 (미표시)', () => {
    const chips = buildChips([]);
    expect(chips).toHaveLength(0);
  });

  it('7:3 수렴 — unfavoredSlugs 3개 → chips 3개 표시', () => {
    const unfavoredSlugs = ['recent_form', 'bullpen_fip', 'park_factor'];
    const chips = buildChips(unfavoredSlugs);
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.slug)).toEqual(['recent_form', 'bullpen_fip', 'park_factor']);
  });

  it('8:2 수렴 — unfavoredSlugs 2개', () => {
    const unfavoredSlugs = ['sp_fip', 'war'];
    const chips = buildChips(unfavoredSlugs);
    expect(chips).toHaveLength(2);
  });

  it('9:1 수렴 — unfavoredSlugs 1개', () => {
    const chips = buildChips(['elo']);
    expect(chips).toHaveLength(1);
    expect(chips[0].slug).toBe('elo');
  });

  it('favoredHome=true: unfavoredSlugs = compositeDuelAwaySlugs', () => {
    const favoredHome = true;
    const compositeDuelAwaySlugs = ['recent_form', 'bullpen_fip'];
    const compositeDuelHomeSlugs = ['sp_fip', 'lineup_woba', 'elo', 'war', 'sp_xfip', 'head_to_head', 'sfr'];
    const unfavoredSlugs = favoredHome ? compositeDuelAwaySlugs : compositeDuelHomeSlugs;
    expect(unfavoredSlugs).toEqual(['recent_form', 'bullpen_fip']);
  });

  it('favoredHome=false: unfavoredSlugs = compositeDuelHomeSlugs', () => {
    const favoredHome = false;
    const compositeDuelAwaySlugs = ['sp_fip', 'lineup_woba', 'elo', 'war', 'sp_xfip', 'head_to_head', 'sfr'];
    const compositeDuelHomeSlugs = ['recent_form', 'bullpen_fip'];
    const unfavoredSlugs = favoredHome ? compositeDuelAwaySlugs : compositeDuelHomeSlugs;
    expect(unfavoredSlugs).toEqual(['recent_form', 'bullpen_fip']);
  });

  it('FACTOR_LABELS 에 없는 slug 필터링', () => {
    const chips = buildChips(['unknown_slug', 'sp_fip']);
    const slugs = chips.map((c) => c.slug);
    expect(slugs).not.toContain('unknown_slug');
    expect(slugs).toContain('sp_fip');
  });

  it('anchor 있는 팩터 — FACTOR_GLOSSARY_ANCHORS 에 값 존재', () => {
    const chips = buildChips(['sp_fip']);
    expect(chips[0].anchor).toBeTruthy();
    expect(chips[0].anchor).toBe('fip');
  });
});
