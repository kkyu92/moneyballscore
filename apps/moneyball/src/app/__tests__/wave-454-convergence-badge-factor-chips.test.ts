import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FACTOR_LABELS_SHORT, FACTOR_GLOSSARY_ANCHORS } from '@/lib/predictions/factorLabels';

// wave-454: 팩터 수렴 픽 배지 — 우세 팩터 칩 표시

const gameDetailSrc = readFileSync(
  join(__dirname, '../analysis/game/[id]/page.tsx'),
  'utf8',
);

describe('wave-454 — 팩터 수렴 픽 배지 우세 팩터 칩', () => {
  it('game/[id]/page.tsx: FACTOR_LABELS_SHORT import 존재', () => {
    expect(gameDetailSrc).toContain('FACTOR_LABELS_SHORT');
  });

  it('game/[id]/page.tsx: FACTOR_GLOSSARY_ANCHORS import 존재', () => {
    expect(gameDetailSrc).toContain('FACTOR_GLOSSARY_ANCHORS');
  });

  it('game/[id]/page.tsx: wave-454 칩 렌더링 존재', () => {
    expect(gameDetailSrc).toContain('wave-454');
    expect(gameDetailSrc).toContain('favoredSlugs.map');
  });

  it('game/[id]/page.tsx: Link import 존재 (glossary 링크)', () => {
    expect(gameDetailSrc).toContain("import Link from 'next/link'");
  });

  it('FACTOR_LABELS_SHORT — 10 production slug 모두 단축 레이블 보유', () => {
    const productionSlugs = [
      'sp_fip', 'sp_xfip', 'lineup_woba', 'bullpen_fip',
      'recent_form', 'war', 'head_to_head', 'park_factor', 'elo', 'sfr',
    ];
    for (const slug of productionSlugs) {
      expect(FACTOR_LABELS_SHORT[slug], `${slug} 단축 레이블 부재`).toBeTruthy();
    }
  });

  it('FACTOR_GLOSSARY_ANCHORS — 10 production slug 모두 anchor 보유', () => {
    const productionSlugs = [
      'sp_fip', 'sp_xfip', 'lineup_woba', 'bullpen_fip',
      'recent_form', 'war', 'head_to_head', 'park_factor', 'elo', 'sfr',
    ];
    for (const slug of productionSlugs) {
      expect(FACTOR_GLOSSARY_ANCHORS[slug], `${slug} glossary anchor 부재`).toBeTruthy();
    }
  });

  it('FACTOR_LABELS_SHORT 대표값 검증', () => {
    expect(FACTOR_LABELS_SHORT['sp_fip']).toBe('선발');
    expect(FACTOR_LABELS_SHORT['lineup_woba']).toBe('타선');
    expect(FACTOR_LABELS_SHORT['elo']).toBe('Elo');
    expect(FACTOR_LABELS_SHORT['recent_form']).toBe('폼');
    expect(FACTOR_LABELS_SHORT['war']).toBe('WAR');
  });
});
