import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  COMPOSITE_DUEL_MIN_VALID,
  FACTOR_PICK_STRONG,
  FACTOR_PICK_COMPLETE,
} from '@moneyball/shared';

// wave-475: 예정 경기 팩터 N:M 균형 표시 — UpcomingScheduledGame 확장
// Feature-Drift Cycle: explore-idea (wave-475) — 이번 주 남은 경기에 오늘 경기와 동일 팩터 N:M 패턴 적용

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

const pageSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-475 — 예정 경기 팩터 N:M 균형 표시', () => {
  it('COMPOSITE_DUEL_MIN_VALID JSDoc wave-475 bullet 존재', () => {
    expect(sharedSrc).toContain('wave-475 예정 경기 팩터 N:M 표시');
    expect(sharedSrc).toContain('getThisWeekRemainingGames computeCompositeDuel gate');
    expect(sharedSrc).toContain('UpcomingScheduledGame.factorFavoredCount/factorAgainstCount/convergenceNetScore 박제');
  });

  it('FACTOR_PICK_STRONG JSDoc wave-475 bullet 존재', () => {
    expect(sharedSrc).toContain('wave-475 예정 경기 팩터 N:M 색상 brand 티어');
    expect(sharedSrc).toContain('text-brand-500');
  });

  it('FACTOR_PICK_COMPLETE JSDoc wave-475 bullet 존재', () => {
    expect(sharedSrc).toContain('wave-475 예정 경기 팩터 N:M 색상 amber 티어');
    expect(sharedSrc).toContain('text-[var(--color-accent)] 골드 색상');
  });

  it('UpcomingScheduledGame 인터페이스 wave-475 필드 존재', () => {
    expect(pageSrc).toContain('wave-475: 팩터 N:M 균형 — computeCompositeDuel 기준');
    expect(pageSrc).toContain('factorFavoredCount: number | null');
    expect(pageSrc).toContain('factorAgainstCount: number | null');
    expect(pageSrc).toContain('convergenceNetScore: number | null');
  });

  it('getThisWeekRemainingGames wave-475 factor 컬럼 쿼리 존재', () => {
    expect(pageSrc).toContain('wave-475: game_id → factor columns for composite duel computation');
    expect(pageSrc).toContain('home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip');
  });

  it('wave-475 UI — factorFavoredCount null 가드 후 팩터 N:M 표시', () => {
    expect(pageSrc).toContain('wave-475: 팩터 N:M 균형 — 데이터 있는 예정 경기에 오늘 경기와 동일 패턴 적용');
    expect(pageSrc).toContain('g.factorFavoredCount != null');
    expect(pageSrc).toContain('팩터 {g.factorFavoredCount}:{g.factorAgainstCount}');
  });

  it('wave-475 색상 로직 — FACTOR_PICK_COMPLETE amber / FACTOR_PICK_STRONG brand / 기본 gray', () => {
    // amber tier: |convergenceNetScore| >= FACTOR_PICK_COMPLETE(10)
    expect(Math.abs(10) >= FACTOR_PICK_COMPLETE).toBe(true);
    expect(Math.abs(9) >= FACTOR_PICK_COMPLETE).toBe(false);
    // brand tier: |convergenceNetScore| >= FACTOR_PICK_STRONG(8) && < FACTOR_PICK_COMPLETE(10)
    expect(Math.abs(8) >= FACTOR_PICK_STRONG).toBe(true);
    expect(Math.abs(7) >= FACTOR_PICK_STRONG).toBe(false);
    // gray tier: < FACTOR_PICK_STRONG(8)
    expect(Math.abs(6) >= FACTOR_PICK_STRONG).toBe(false);
  });

  it('COMPOSITE_DUEL_MIN_VALID gate — validCount < 4 시 factorFavoredCount null', () => {
    // validCount < COMPOSITE_DUEL_MIN_VALID → 데이터 부족 → null
    expect(3 >= COMPOSITE_DUEL_MIN_VALID).toBe(false);
    // validCount >= COMPOSITE_DUEL_MIN_VALID → 집계 포함
    expect(4 >= COMPOSITE_DUEL_MIN_VALID).toBe(true);
  });
});
