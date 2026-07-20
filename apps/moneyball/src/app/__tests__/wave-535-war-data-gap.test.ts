import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');
const COMPUTE_DUEL = join(ROOT, 'src/lib/analysis/computeCompositeDuel.ts');

// wave-535 (cycle 1906): WAR 데이터 갭 guard.
// Fancy Stats /leaders/ top-50 limit → Doosan/KT/Lotte/Kiwoom WAR=0.
// predictor wave-533: WAR=0 시 neutral(0.5). computeCompositeDuel 도 동일 guard 추가.
// UI: 수렴 픽 WAR 미집계 배지 + 이번 주 남은 경기 WAR 배지 WAR=0 skip.

describe('wave-535 — computeCompositeDuel WAR=0 data gap guard', () => {
  it('awayWar=0 (data gap): warResult=null, valid=false', () => {
    const result = computeCompositeDuel({
      homeCode: 'LG',
      homeWar: 18.5,
      awayWar: 0,
      homeElo: 1550,
      awayElo: 1450,
      homeRecentForm: 0.6,
      awayRecentForm: 0.4,
    });
    // WAR=0 팀 존재 → WAR valid=false → WAR 수렴 기여 X
    expect(result.homeFavoredSlugs).not.toContain('war');
    expect(result.awayFavoredSlugs).not.toContain('war');
  });

  it('homeWar=0 (data gap): warResult=null, valid=false', () => {
    const result = computeCompositeDuel({
      homeCode: 'OB',
      homeWar: 0,
      awayWar: 22.0,
      homeElo: 1420,
      awayElo: 1520,
    });
    expect(result.homeFavoredSlugs).not.toContain('war');
    expect(result.awayFavoredSlugs).not.toContain('war');
  });

  it('homeWar=0 && awayWar=0: WAR valid=false', () => {
    const result = computeCompositeDuel({
      homeCode: 'KT',
      homeWar: 0,
      awayWar: 0,
      homeElo: 1510,
      awayElo: 1490,
    });
    expect(result.homeFavoredSlugs).not.toContain('war');
    expect(result.awayFavoredSlugs).not.toContain('war');
  });

  it('homeWar=0 && awayWar=0: validCount 감소 (war 제외)', () => {
    const allDataResult = computeCompositeDuel({
      homeCode: 'LG',
      homeLineupWoba: 0.330,
      awayLineupWoba: 0.310,
      homeWar: 20.0,
      awayWar: 12.0,
      homeElo: 1550,
      awayElo: 1450,
    });
    const warGapResult = computeCompositeDuel({
      homeCode: 'LG',
      homeLineupWoba: 0.330,
      awayLineupWoba: 0.310,
      homeWar: 0,
      awayWar: 0,
      homeElo: 1550,
      awayElo: 1450,
    });
    expect(warGapResult.validCount).toBe(allDataResult.validCount - 1);
  });

  it('정상 WAR 양쪽 모두 > 0: WAR 수렴 정상 참여', () => {
    const result = computeCompositeDuel({
      homeCode: 'SS',
      homeWar: 25.0,
      awayWar: 8.0, // Δ=17.0 >= WAR_DUEL_MIN(5.0)
      homeElo: 1550,
      awayElo: 1450,
    });
    expect(result.homeFavoredSlugs).toContain('war');
  });

  it('awayWar > homeWar by >= 5.0: away slug (정상)', () => {
    const result = computeCompositeDuel({
      homeCode: 'WO',
      homeWar: 6.0,
      awayWar: 24.0, // Δ=18.0
      homeElo: 1480,
      awayElo: 1520,
    });
    expect(result.awayFavoredSlugs).toContain('war');
  });
});

describe('wave-535 — analysis/page.tsx + computeCompositeDuel source guard', () => {
  it('computeCompositeDuel.ts: WAR=0 guard 주석 포함', () => {
    const source = readFileSync(COMPUTE_DUEL, 'utf8');
    expect(source).toContain('wave-535');
    expect(source).toContain('g.homeWar > 0 && g.awayWar > 0');
  });

  it('analysis/page.tsx: wave-535 WAR 미집계 배지 JSX 포함', () => {
    const page = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(page).toContain('wave-535');
    expect(page).toContain('WAR 미집계');
  });

  it('analysis/page.tsx: 이번 주 남은 경기 WAR 배지 data gap guard 포함', () => {
    const page = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(page).toContain('g.homeWar > 0 && g.awayWar > 0');
  });
});
