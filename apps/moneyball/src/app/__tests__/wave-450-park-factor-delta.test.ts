import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PARK_FACTOR_DELTA_MIN, KBO_TEAMS } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

// wave-450: 팩터 수렴 픽 구장 행 PF 편차(Δ) 표시 — cycle 1810.
// 구장 행: |parkPf - 100| ≥ PARK_FACTOR_DELTA_MIN(3) 시 "Δ+X" / "Δ-X" 수치 명시.
// 10팩터 Δ 시리즈 최종 완성 — 구장보정 = 단일 PF값 기준 중립(100) 편차 방식.

describe('wave-450 — 상수 단일 소스 가드', () => {
  it('PARK_FACTOR_DELTA_MIN = 3', () => {
    expect(PARK_FACTOR_DELTA_MIN).toBe(3);
  });
});

describe('wave-450 — KBO 팀 parkPf 편차 적용 범위', () => {
  it('SS(삼성) parkPf=108: |108-100|=8 ≥ 3 → Δ+8 표시', () => {
    expect(Math.abs(KBO_TEAMS.SS.parkPf - 100)).toBeGreaterThanOrEqual(PARK_FACTOR_DELTA_MIN);
    expect(KBO_TEAMS.SS.parkPf - 100).toBe(8);
  });

  it('WO(키움) parkPf=92: |92-100|=8 ≥ 3 → Δ-8 표시', () => {
    expect(Math.abs(KBO_TEAMS.WO.parkPf - 100)).toBeGreaterThanOrEqual(PARK_FACTOR_DELTA_MIN);
    expect(KBO_TEAMS.WO.parkPf - 100).toBe(-8);
  });

  it('SK(SSG) parkPf=105: |105-100|=5 ≥ 3 → Δ+5 표시', () => {
    expect(Math.abs(KBO_TEAMS.SK.parkPf - 100)).toBeGreaterThanOrEqual(PARK_FACTOR_DELTA_MIN);
    expect(KBO_TEAMS.SK.parkPf - 100).toBe(5);
  });

  it('LG parkPf=95: |95-100|=5 ≥ 3 → Δ-5 표시', () => {
    expect(Math.abs(KBO_TEAMS.LG.parkPf - 100)).toBeGreaterThanOrEqual(PARK_FACTOR_DELTA_MIN);
    expect(KBO_TEAMS.LG.parkPf - 100).toBe(-5);
  });

  it('LT(롯데) parkPf=103: |103-100|=3 ≥ 3 → Δ+3 표시', () => {
    expect(Math.abs(KBO_TEAMS.LT.parkPf - 100)).toBeGreaterThanOrEqual(PARK_FACTOR_DELTA_MIN);
    expect(KBO_TEAMS.LT.parkPf - 100).toBe(3);
  });

  it('HT(KIA) parkPf=100: |100-100|=0 < 3 → Δ 미표시', () => {
    expect(Math.abs(KBO_TEAMS.HT.parkPf - 100)).toBeLessThan(PARK_FACTOR_DELTA_MIN);
  });

  it('NC parkPf=100: |100-100|=0 < 3 → Δ 미표시', () => {
    expect(Math.abs(KBO_TEAMS.NC.parkPf - 100)).toBeLessThan(PARK_FACTOR_DELTA_MIN);
  });

  it('KT parkPf=98: |98-100|=2 < 3 → Δ 미표시', () => {
    expect(Math.abs(KBO_TEAMS.KT.parkPf - 100)).toBeLessThan(PARK_FACTOR_DELTA_MIN);
  });

  it('HH(한화) parkPf=101: |101-100|=1 < 3 → Δ 미표시', () => {
    expect(Math.abs(KBO_TEAMS.HH.parkPf - 100)).toBeLessThan(PARK_FACTOR_DELTA_MIN);
  });
});

describe('wave-450 — analysis/page.tsx JSX 정합성', () => {
  const pageContent = readFileSync(ANALYSIS_PAGE, 'utf8');

  it('wave-450 헤더 주석 포함', () => {
    expect(pageContent).toContain('wave-450');
  });

  it('PARK_FACTOR_DELTA_MIN import', () => {
    expect(pageContent).toContain('PARK_FACTOR_DELTA_MIN');
  });

  it('parkDelta 계산 (parkPf - 100)', () => {
    expect(pageContent).toContain('parkPf - 100');
  });

  it('Δ 임계 조건 (Math.abs(parkDelta) >= PARK_FACTOR_DELTA_MIN)', () => {
    expect(pageContent).toContain('Math.abs(parkDelta) >= PARK_FACTOR_DELTA_MIN');
  });

  it('양수 편차 표시 포맷 (Δ+X)', () => {
    expect(pageContent).toContain('parkDelta > 0');
  });
});

describe('wave-450 — Δ 편차 로직 단위 검증', () => {
  it('parkPf=108 → parkDelta=+8, 표시 조건 참', () => {
    const parkPf = 108;
    const parkDelta = parkPf - 100;
    expect(Math.abs(parkDelta)).toBeGreaterThanOrEqual(PARK_FACTOR_DELTA_MIN);
    expect(parkDelta > 0 ? `+${parkDelta}` : `${parkDelta}`).toBe('+8');
  });

  it('parkPf=92 → parkDelta=-8, 표시 조건 참', () => {
    const parkPf = 92;
    const parkDelta = parkPf - 100;
    expect(Math.abs(parkDelta)).toBeGreaterThanOrEqual(PARK_FACTOR_DELTA_MIN);
    expect(parkDelta > 0 ? `+${parkDelta}` : `${parkDelta}`).toBe('-8');
  });

  it('parkPf=100 → parkDelta=0, 표시 조건 거짓', () => {
    const parkPf = 100;
    const parkDelta = parkPf - 100;
    expect(Math.abs(parkDelta)).toBeLessThan(PARK_FACTOR_DELTA_MIN);
  });

  it('parkPf=98 → parkDelta=-2, 표시 조건 거짓 (임계 미달)', () => {
    const parkPf = 98;
    const parkDelta = parkPf - 100;
    expect(Math.abs(parkDelta)).toBeLessThan(PARK_FACTOR_DELTA_MIN);
  });

  it('parkPf=103 → parkDelta=+3, 표시 조건 참 (임계 경계)', () => {
    const parkPf = 103;
    const parkDelta = parkPf - 100;
    expect(Math.abs(parkDelta)).toBeGreaterThanOrEqual(PARK_FACTOR_DELTA_MIN);
    expect(parkDelta > 0 ? `+${parkDelta}` : `${parkDelta}`).toBe('+3');
  });
});
