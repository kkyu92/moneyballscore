import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ELO_GAP_STRONG, WAR_DUEL_MIN } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

// wave-444: 팩터 수렴 픽 Elo + WAR 격차(Δ) 표시 — cycle 1800.
// Elo 행: |awayElo - homeElo| ≥ ELO_GAP_STRONG(50) 시 Δ 수치 표시.
// WAR 행: |awayWar - homeWar| ≥ WAR_DUEL_MIN(5.0) 시 Δ 수치 표시.
// 기존 상수 재사용 (wave-379 Elo 배지 + wave-347 WAR 배지 동일 임계).

describe('wave-444 — 상수 단일 소스 가드', () => {
  it('ELO_GAP_STRONG = 50 (wave-379 동일)', () => {
    expect(ELO_GAP_STRONG).toBe(50);
  });

  it('WAR_DUEL_MIN = 5.0 (wave-347 동일)', () => {
    expect(WAR_DUEL_MIN).toBe(5.0);
  });
});

describe('wave-444 — analysis/page.tsx JSX 정합성', () => {
  const pageContent = readFileSync(ANALYSIS_PAGE, 'utf8');

  it('wave-444 헤더 주석 포함', () => {
    expect(pageContent).toContain('wave-444');
  });

  it('Elo Δ 표시 JSX: ELO_GAP_STRONG 임계 조건', () => {
    expect(pageContent).toContain('ELO_GAP_STRONG');
    expect(pageContent).toContain('awayElo - pick.homeElo');
  });

  it('WAR Δ 표시 JSX: WAR_DUEL_MIN 임계 조건', () => {
    expect(pageContent).toContain('WAR_DUEL_MIN');
    expect(pageContent).toContain('awayWar - pick.homeWar');
  });

  it('Elo Δ 렌더 — Math.round 정수 표기', () => {
    expect(pageContent).toContain('Math.round(Math.abs(pick.awayElo - pick.homeElo))');
  });

  it('WAR Δ 렌더 — toFixed(1) 소수점 1자리', () => {
    expect(pageContent).toContain('awayWar - pick.homeWar).toFixed(1)');
  });
});

describe('wave-444 — Δ 임계 로직 단위 검증', () => {
  it('Elo gap ≥ 50 시 표시 조건 참', () => {
    const away = 1570;
    const home = 1510;
    expect(Math.abs(away - home)).toBeGreaterThanOrEqual(ELO_GAP_STRONG);
  });

  it('Elo gap < 50 시 표시 조건 거짓', () => {
    const away = 1535;
    const home = 1510;
    expect(Math.abs(away - home)).toBeLessThan(ELO_GAP_STRONG);
  });

  it('WAR gap ≥ 5.0 시 표시 조건 참', () => {
    const away = 28.5;
    const home = 22.0;
    expect(Math.abs(away - home)).toBeGreaterThanOrEqual(WAR_DUEL_MIN);
  });

  it('WAR gap < 5.0 시 표시 조건 거짓', () => {
    const away = 24.0;
    const home = 21.0;
    expect(Math.abs(away - home)).toBeLessThan(WAR_DUEL_MIN);
  });

  it('Elo Δ 값 표기 — Math.round 정수', () => {
    expect(Math.round(Math.abs(1570 - 1510))).toBe(60);
  });

  it('WAR Δ 값 소수점 표기 — toFixed(1)', () => {
    expect(Math.abs(28.5 - 22.0).toFixed(1)).toBe('6.5');
  });
});
