import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// wave-483: COMPOSITE_DUEL_FACTOR_LABEL_LIMIT JSDoc wave-482 bullet description line 정정
// Feature-Drift Cycle: explore-idea (wave-482) → review-code (wave-483)
// wave-482: analysis/page.tsx !isPickGame LIST 비수렴 배지에 우세 팩터 단축 레이블 표시 (wave-480 DETAIL 대칭)

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

const factorLabelsSrc = readFileSync(
  join(__dirname, '../../lib/predictions/factorLabels.ts'),
  'utf8',
);

describe('wave-483 — COMPOSITE_DUEL_FACTOR_LABEL_LIMIT JSDoc wave-482 bullet 정정', () => {
  it('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT JSDoc wave-482 bullet 정밀 description 존재', () => {
    expect(sharedSrc).toContain(
      'wave-482 analysis/page.tsx 비수렴 LIST 배지 팩터 레이블 표시 (cycle 1845): analysis/page.tsx — !isPickGame: (pickFavoredHome ? compositeDuelHomeSlugs : compositeDuelAwaySlugs).slice(0, 본 값) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-480 DETAIL 대칭).',
    );
  });

  it('FACTOR_LABELS_SHORT JSDoc wave-482 bullet 추가 존재', () => {
    expect(factorLabelsSrc).toContain(
      'wave-482 analysis/page.tsx 비수렴 LIST 배지 팩터 레이블 표시 (cycle 1845): analysis/page.tsx — !isPickGame: (pickFavoredHome ? compositeDuelHomeSlugs : compositeDuelAwaySlugs).slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-480 DETAIL 대칭).',
    );
  });

  it('COMPOSITE_DUEL_FACTOR_LABEL_LIMIT wave-480 원본 설명 여전히 존재', () => {
    expect(sharedSrc).toContain(
      '비수렴 경기 팩터 N:M 배지 — 우세 팩터 단축 레이블 최대 표시 수 — wave-480 (cycle 1843).',
    );
  });

  it('FACTOR_LABELS_SHORT wave-480 bullet 여전히 존재 — wave-481 추가 보존', () => {
    expect(factorLabelsSrc).toContain(
      'wave-480 game/[id] 비수렴 N:M 배지 팩터 레이블 표시 (cycle 1843): analysis/game/[id]/page.tsx — favoredSlugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-430 LIST 수렴 패턴 대칭).',
    );
  });

  it('wave-430 원본 설명 여전히 존재', () => {
    expect(factorLabelsSrc).toContain('wave-430: 종합 우세 배지 인라인 나열용');
  });
});
