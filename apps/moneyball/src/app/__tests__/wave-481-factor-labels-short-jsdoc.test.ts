import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FACTOR_LABELS_SHORT } from '@/lib/predictions/factorLabels';

// wave-481: FACTOR_LABELS_SHORT JSDoc wave-480 bullet 추가
// Feature-Drift Cycle: explore-idea (wave-480) → review-code (wave-481)
// wave-480: analysis/game/[id] 비수렴 N:M 배지에 favoredSlugs → FACTOR_LABELS_SHORT 인라인 표시

const factorLabelsSrc = readFileSync(
  join(__dirname, '../../lib/predictions/factorLabels.ts'),
  'utf8',
);

describe('wave-481 — FACTOR_LABELS_SHORT JSDoc wave-480 bullet 추가', () => {
  it('wave-480 bullet 존재 — 비수렴 N:M 배지 팩터 레이블 인라인 표시', () => {
    expect(factorLabelsSrc).toContain(
      'wave-480 game/[id] 비수렴 N:M 배지 팩터 레이블 표시 (cycle 1843): analysis/game/[id]/page.tsx — favoredSlugs.slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT) → FACTOR_LABELS_SHORT 매핑 인라인 표시 (wave-430 LIST 수렴 패턴 대칭).',
    );
  });

  it('wave-430 원본 설명 여전히 존재 — 종합 우세 배지 인라인 나열용', () => {
    expect(factorLabelsSrc).toContain(
      'wave-430: 종합 우세 배지 인라인 나열용',
    );
  });

  it('wave-454 · wave-456 칩 reference 여전히 존재', () => {
    expect(factorLabelsSrc).toContain(
      'wave-454 game/[id] 팩터 칩 (cycle 1814)',
    );
    expect(factorLabelsSrc).toContain(
      'wave-456 상대 팀 우세 팩터 칩 (cycle 1816)',
    );
  });

  it('FACTOR_LABELS_SHORT 선발 레이블 — wave-480 인라인 표시 대상', () => {
    expect(FACTOR_LABELS_SHORT['sp_fip']).toBe('선발');
  });

  it('FACTOR_LABELS_SHORT Elo 레이블 — wave-480 인라인 표시 대상', () => {
    expect(FACTOR_LABELS_SHORT['elo']).toBe('Elo');
  });
});
