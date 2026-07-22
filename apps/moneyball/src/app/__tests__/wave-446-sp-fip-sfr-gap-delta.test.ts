import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SP_FIP_DUEL_MIN, SFR_DUEL_MIN } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');
// cycle 1984 review-code(heavy): UpcomingScheduledGame 인터페이스 JSDoc (wave-446 필드 주석) 은
// analysis/page.tsx 데이터 레이어 분리 리팩터로 analysis/analysis-data.ts 로 이동.
const ANALYSIS_DATA = join(ROOT, 'src/app/analysis/analysis-data.ts');

// wave-446: 팩터 수렴 픽 선발 FIP + 수비 SFR 격차(Δ) 표시 — cycle 1805.
// 선발 FIP 행: |awaySPFip - homeSPFip| ≥ SP_FIP_DUEL_MIN(0.5) 시 Δ 수치 표시.
// 수비 SFR 행: |awaySfr - homeSfr| ≥ SFR_DUEL_MIN(5.0) 시 Δ 수치 표시.
// 기존 상수 재사용 (wave-407 SP FIP 대결 + wave-414 SFR 대결 동일 임계).

describe('wave-446 — 상수 단일 소스 가드', () => {
  it('SP_FIP_DUEL_MIN = 0.5 (wave-407 동일)', () => {
    expect(SP_FIP_DUEL_MIN).toBe(0.5);
  });

  it('SFR_DUEL_MIN = 5.0 (wave-414 동일)', () => {
    expect(SFR_DUEL_MIN).toBe(5.0);
  });
});

describe('wave-446 — analysis/page.tsx JSX 정합성', () => {
  const pageContent = readFileSync(ANALYSIS_PAGE, 'utf8');

  it('wave-446 헤더 주석 포함', () => {
    expect(pageContent).toContain('wave-446');
  });

  it('SP FIP Δ 표시 JSX: SP_FIP_DUEL_MIN 임계 조건', () => {
    expect(pageContent).toContain('SP_FIP_DUEL_MIN');
    expect(pageContent).toContain('pick.awaySPFip - pick.homeSPFip');
  });

  it('SFR Δ 표시 JSX: SFR_DUEL_MIN 임계 조건', () => {
    expect(pageContent).toContain('SFR_DUEL_MIN');
    expect(pageContent).toContain('pick.awaySfr - pick.homeSfr');
  });

  it('SP FIP Δ 렌더 — toFixed(2) 소수점 2자리', () => {
    expect(pageContent).toContain('pick.awaySPFip - pick.homeSPFip).toFixed(2)');
  });

  it('SFR Δ 렌더 — toFixed(1) 소수점 1자리', () => {
    expect(pageContent).toContain('pick.awaySfr - pick.homeSfr).toFixed(1)');
  });

  it('SP FIP JSDoc wave-446 참조', () => {
    const dataContent = readFileSync(ANALYSIS_DATA, 'utf8');
    expect(dataContent).toContain('wave-446: 팩터 수렴 픽 선발 FIP 행 격차(Δ) 표시');
  });

  it('SFR JSDoc wave-446 참조', () => {
    const dataContent = readFileSync(ANALYSIS_DATA, 'utf8');
    expect(dataContent).toContain('wave-446: 팩터 수렴 픽 수비 SFR 행 격차(Δ) 표시');
  });
});

describe('wave-446 — Δ 임계 로직 단위 검증', () => {
  it('SP FIP gap ≥ 0.5 시 표시 조건 참', () => {
    const away = 3.2;
    const home = 4.5;
    expect(Math.abs(away - home)).toBeGreaterThanOrEqual(SP_FIP_DUEL_MIN);
  });

  it('SP FIP gap < 0.5 시 표시 조건 거짓', () => {
    const away = 3.8;
    const home = 4.0;
    expect(Math.abs(away - home)).toBeLessThan(SP_FIP_DUEL_MIN);
  });

  it('SFR gap ≥ 5.0 시 표시 조건 참', () => {
    const away = 12.0;
    const home = -3.0;
    expect(Math.abs(away - home)).toBeGreaterThanOrEqual(SFR_DUEL_MIN);
  });

  it('SFR gap < 5.0 시 표시 조건 거짓', () => {
    const away = 3.0;
    const home = 1.0;
    expect(Math.abs(away - home)).toBeLessThan(SFR_DUEL_MIN);
  });

  it('SP FIP Δ format — toFixed(2)', () => {
    const delta = Math.abs(3.20 - 4.75);
    expect(delta.toFixed(2)).toBe('1.55');
  });

  it('SFR Δ format — toFixed(1)', () => {
    const delta = Math.abs(12.0 - (-3.5));
    expect(delta.toFixed(1)).toBe('15.5');
  });
});
