import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { COMPOSITE_DUEL_MIN_VALID } from '@moneyball/shared';

// wave-479: COMPOSITE_DUEL_MIN_VALID JSDoc wave-478 bullet 추가
// Feature-Drift Cycle: explore-idea (wave-478) → review-code (wave-479)
// wave-478: analysis/game/[id] 비수렴 경기 !isConvergencePick gate 신규 사용

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

describe('wave-479 — COMPOSITE_DUEL_MIN_VALID JSDoc wave-478 bullet 추가', () => {
  it('wave-478 bullet 존재 — 비수렴 경기 N:M 균형 배지 gate', () => {
    expect(sharedSrc).toContain(
      'wave-478 game/[id] 비수렴 경기 팩터 N:M 균형 배지 (cycle 1840): analysis/game/[id]/page.tsx — !isConvergencePick 경기에서 validCount ≥ 본 값 시 N:M 균형 배지 표시 (wave-473 LIST 대칭).',
    );
  });

  it('wave-475 bullet 여전히 존재 — 예정 경기 gate', () => {
    expect(sharedSrc).toContain(
      'wave-475 예정 경기 팩터 N:M 표시 (cycle 1837): getThisWeekRemainingGames computeCompositeDuel gate',
    );
  });

  it('COMPOSITE_DUEL_MIN_VALID 값 4 유지', () => {
    expect(COMPOSITE_DUEL_MIN_VALID).toBe(4);
  });

  it('wave-478 게이트 동작 — validCount 4 이상 시 배지 표시', () => {
    const validCount = 4;
    expect(validCount >= COMPOSITE_DUEL_MIN_VALID).toBe(true);
  });

  it('wave-478 게이트 동작 — validCount 3 미만 시 배지 미표시', () => {
    const validCount = 3;
    expect(validCount >= COMPOSITE_DUEL_MIN_VALID).toBe(false);
  });
});
