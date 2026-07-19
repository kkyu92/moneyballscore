import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FACTOR_LABELS_SHORT } from '@/lib/predictions/factorLabels';

// wave-485: FACTOR_LABELS_SHORT JSDoc wave-484 bullet 추가
// Feature-Drift Cycle: explore-idea (wave-484) → review-code (wave-485)
// wave-484: analysis/page.tsx 이번 주 남은 경기 !isPickGame — factorFavoredSlugs → FACTOR_LABELS_SHORT 인라인 표시 (wave-480/482 3-way 대칭 완성)

const factorLabelsSrc = readFileSync(
  join(__dirname, '../../lib/predictions/factorLabels.ts'),
  'utf8',
);

describe('wave-485 — FACTOR_LABELS_SHORT JSDoc wave-484 bullet 추가', () => {
  it('wave-484 bullet 존재 — 이번 주 남은 경기 비수렴 LIST 배지 팩터 레이블 인라인 표시', () => {
    expect(factorLabelsSrc).toContain(
      'wave-484 analysis/page.tsx 이번 주 남은 경기 비수렴 LIST 배지 팩터 레이블 표시 (cycle 1847): analysis/page.tsx — !isPickGame: factorFavoredSlugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-480 DETAIL/wave-482 LIST TODAY 3-way 대칭 완성).',
    );
  });

  it('wave-480 bullet 보존 — wave-485 추가 후 wave-481 박제 보존', () => {
    expect(factorLabelsSrc).toContain(
      'wave-480 game/[id] 비수렴 N:M 배지 팩터 레이블 표시 (cycle 1843): analysis/game/[id]/page.tsx — favoredSlugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-430 LIST 수렴 패턴 대칭).',
    );
  });

  it('wave-482 bullet 보존 — wave-485 추가 후 wave-483 박제 보존', () => {
    expect(factorLabelsSrc).toContain(
      'wave-482 analysis/page.tsx 비수렴 LIST 배지 팩터 레이블 표시 (cycle 1845): analysis/page.tsx — !isPickGame: (pickFavoredHome ? compositeDuelHomeSlugs : compositeDuelAwaySlugs).slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-480 DETAIL 대칭).',
    );
  });

  it('wave-430 원본 설명 여전히 존재 — 종합 우세 배지 인라인 나열용', () => {
    expect(factorLabelsSrc).toContain(
      'wave-430: 종합 우세 배지 인라인 나열용',
    );
  });

  it('FACTOR_LABELS_SHORT 선발 레이블 — wave-484 이번 주 남은 경기 표시 대상', () => {
    expect(FACTOR_LABELS_SHORT['sp_fip']).toBe('선발');
  });

  it('FACTOR_LABELS_SHORT Elo 레이블 — wave-484 이번 주 남은 경기 표시 대상', () => {
    expect(FACTOR_LABELS_SHORT['elo']).toBe('Elo');
  });
});
