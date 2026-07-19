import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { COMPOSITE_DUEL_MIN_VALID } from '@moneyball/shared';

// wave-487: COMPOSITE_DUEL_MIN_VALID JSDoc wave-482/484 bullet 추가
// Feature-Drift Cycle: explore-idea (wave-486) → review-code (wave-487)
// wave-482: analysis/page.tsx LIST 비수렴 배지 gate — duel.validCount >= COMPOSITE_DUEL_MIN_VALID
// wave-484: analysis/page.tsx 이번 주 남은 경기 factorFavoredSlugs gate — duel.validCount >= COMPOSITE_DUEL_MIN_VALID

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

describe('wave-487 — COMPOSITE_DUEL_MIN_VALID JSDoc wave-482/484 bullet 추가', () => {
  it('wave-482 bullet 존재 — analysis/page.tsx 비수렴 LIST 배지 gate', () => {
    expect(sharedSrc).toContain(
      'wave-482 analysis/page.tsx 비수렴 LIST 배지 (cycle 1845): analysis/page.tsx — duel.validCount ≥ 본 값 시 factorFavoredCount/factorAgainstCount/convergenceNetScore 박제 (wave-478 game/[id] LIST 대칭).',
    );
  });

  it('wave-484 bullet 존재 — analysis/page.tsx 이번 주 남은 경기 factorFavoredSlugs gate', () => {
    expect(sharedSrc).toContain(
      'wave-484 analysis/page.tsx 이번 주 남은 경기 비수렴 레이블 (cycle 1847): analysis/page.tsx — duel.validCount ≥ 본 값 시 factorFavoredSlugs 박제 — 비수렴 단축 레이블 gate (wave-480 game/[id] 레이블 대칭).',
    );
  });

  it('wave-480 bullet 보존 — wave-487 추가 후 wave-479 박제 보존', () => {
    expect(sharedSrc).toContain(
      'wave-480 game/[id] 비수렴 N:M 배지 팩터 레이블 표시 (cycle 1843): analysis/game/[id]/page.tsx — COMPOSITE_DUEL_FACTOR_LABEL_LIMIT 수 만큼 favoredSlugs → FACTOR_LABELS_SHORT 인라인 표시 (wave-430 LIST 수렴 패턴 대칭).',
    );
  });

  it('wave-478 bullet 보존 — game/[id] 비수렴 배지 gate', () => {
    expect(sharedSrc).toContain(
      'wave-478 game/[id] 비수렴 경기 팩터 N:M 균형 배지 (cycle 1840): analysis/game/[id]/page.tsx — !isConvergencePick 경기에서 validCount ≥ 본 값 시 N:M 균형 배지 표시 (wave-473 LIST 대칭).',
    );
  });

  it('wave-475 bullet 보존 — 예정 경기 N:M 표시 gate', () => {
    expect(sharedSrc).toContain(
      'wave-475 예정 경기 팩터 N:M 표시 (cycle 1837): getThisWeekRemainingGames computeCompositeDuel gate',
    );
  });

  it('COMPOSITE_DUEL_MIN_VALID 값 — 4 (10팩터 중 40% 이상 유효)', () => {
    expect(COMPOSITE_DUEL_MIN_VALID).toBe(4);
  });
});
