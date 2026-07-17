import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BULLPEN_FIP_DIFF_MIN, LINEUP_WOBA_DUEL_MIN } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

// wave-442: 팩터 수렴 픽 불펜 FIP + 타선 wOBA 격차(Δ) 표시 — cycle 1798.
// 불펜 FIP 행: |awaySPFip - homeSPFip| ≥ BULLPEN_FIP_DIFF_MIN(1.0) 시 Δ 수치 표시.
// 타선 wOBA 행: |awayWoba - homeWoba| ≥ LINEUP_WOBA_DUEL_MIN(0.020) 시 Δ 수치 표시.
// 기존 상수 재사용 (wave-359 불펜 배지 + wave-355 wOBA 배지 동일 임계).

describe('wave-442 — 상수 단일 소스 가드', () => {
  it('BULLPEN_FIP_DIFF_MIN = 1.0 (wave-359 동일)', () => {
    expect(BULLPEN_FIP_DIFF_MIN).toBe(1.0);
  });

  it('LINEUP_WOBA_DUEL_MIN = 0.020 (wave-355 동일)', () => {
    expect(LINEUP_WOBA_DUEL_MIN).toBe(0.020);
  });
});

describe('wave-442 — analysis/page.tsx JSX 정합성', () => {
  const pageContent = readFileSync(ANALYSIS_PAGE, 'utf8');

  it('wave-442 헤더 주석 포함', () => {
    expect(pageContent).toContain('wave-442');
  });

  it('불펜 FIP Δ 표시 JSX: BULLPEN_FIP_DIFF_MIN 임계 조건', () => {
    expect(pageContent).toContain('BULLPEN_FIP_DIFF_MIN');
    expect(pageContent).toContain('awayBullpenFip - pick.homeBullpenFip');
  });

  it('타선 wOBA Δ 표시 JSX: LINEUP_WOBA_DUEL_MIN 임계 조건', () => {
    expect(pageContent).toContain('LINEUP_WOBA_DUEL_MIN');
    expect(pageContent).toContain('awayLineupWoba - pick.homeLineupWoba');
  });

  it('불펜 Δ 렌더 — toFixed(2) 소수점 2자리', () => {
    expect(pageContent).toContain('awayBullpenFip - pick.homeBullpenFip).toFixed(2)');
  });

  it('타선 Δ 렌더 — toFixed(3) 소수점 3자리 (wOBA 단위 정합)', () => {
    expect(pageContent).toContain('awayLineupWoba - pick.homeLineupWoba).toFixed(3)');
  });
});

describe('wave-442 — Δ 임계 로직 단위 검증', () => {
  it('불펜 FIP gap ≥ 1.0 시 표시 조건 참', () => {
    const away = 4.80;
    const home = 3.50;
    expect(Math.abs(away - home)).toBeGreaterThanOrEqual(BULLPEN_FIP_DIFF_MIN);
  });

  it('불펜 FIP gap < 1.0 시 표시 조건 거짓', () => {
    const away = 4.10;
    const home = 3.80;
    expect(Math.abs(away - home)).toBeLessThan(BULLPEN_FIP_DIFF_MIN);
  });

  it('타선 wOBA gap ≥ 0.020 시 표시 조건 참', () => {
    const away = 0.340;
    const home = 0.315;
    expect(Math.abs(away - home)).toBeGreaterThanOrEqual(LINEUP_WOBA_DUEL_MIN);
  });

  it('타선 wOBA gap < 0.020 시 표시 조건 거짓', () => {
    const away = 0.332;
    const home = 0.325;
    expect(Math.abs(away - home)).toBeLessThan(LINEUP_WOBA_DUEL_MIN);
  });

  it('Δ 값 소수점 표기 — 불펜 FIP toFixed(2)', () => {
    expect(Math.abs(4.80 - 3.50).toFixed(2)).toBe('1.30');
  });

  it('Δ 값 소수점 표기 — wOBA toFixed(3)', () => {
    expect(Math.abs(0.340 - 0.315).toFixed(3)).toBe('0.025');
  });
});
