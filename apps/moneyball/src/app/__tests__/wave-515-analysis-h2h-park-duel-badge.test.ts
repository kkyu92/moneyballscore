import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { H2H_DOMINANT_RATE, H2H_WEAK_RATE, PARK_FACTOR_HITTER_MIN, PARK_FACTOR_PITCHER_MAX } from '@moneyball/shared';

// wave-515: analysis 오늘 AI 예측 카드 H2H·구장 직접 대결 배지 (10팩터 완성)
// explore-idea (heavy) — cycle 1882
// Feature-Drift Cycle: review-code (wave-514 H2H/park JSDoc sync) → explore-idea (wave-515)
// gap: AI 예측 카드에 SP FIP(499)/wOBA(501)/불펜FIP(504)/Elo(506)/WAR(508)/SFR(510)/폼(511)/xFIP(513) 8개 배지
//      head_to_head + park_factor 2개 미구현 → wave-515 추가로 10팩터 배지 완성

const analysisSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-515 — analysis H2H 직접 대결 배지', () => {
  it('H2H_DOMINANT_RATE 값은 0.6', () => {
    expect(H2H_DOMINANT_RATE).toBe(0.6);
  });

  it('H2H_WEAK_RATE 값은 0.4', () => {
    expect(H2H_WEAK_RATE).toBe(0.4);
  });

  it('analysis/page.tsx 에 wave-515 마커 존재', () => {
    expect(analysisSrc).toContain('wave-515');
  });

  it('analysis/page.tsx 에 h2hFavoredHome 조건 존재', () => {
    expect(analysisSrc).toContain('h2hFavoredHome');
  });

  it('analysis/page.tsx 에 H2H_DOMINANT_RATE 임계 조건 존재', () => {
    expect(analysisSrc).toContain('H2H_DOMINANT_RATE');
  });

  it('H2H duel 로직: 홈 승률 >= 0.6 = 홈팀 우세', () => {
    const h2hHomeWins = 7;
    const h2hAwayWins = 3;
    const homeRate = h2hHomeWins / (h2hHomeWins + h2hAwayWins);
    expect(homeRate).toBeGreaterThanOrEqual(H2H_DOMINANT_RATE);
  });

  it('H2H duel 로직: 홈 승률 <= 0.4 = 원정팀 우세', () => {
    const h2hHomeWins = 3;
    const h2hAwayWins = 7;
    const homeRate = h2hHomeWins / (h2hHomeWins + h2hAwayWins);
    expect(homeRate).toBeLessThanOrEqual(H2H_WEAK_RATE);
  });

  it('H2H duel 로직: 0.4 < 홈 승률 < 0.6 → 배지 없음', () => {
    const h2hHomeWins = 5;
    const h2hAwayWins = 5;
    const homeRate = h2hHomeWins / (h2hHomeWins + h2hAwayWins);
    expect(homeRate).toBeGreaterThan(H2H_WEAK_RATE);
    expect(homeRate).toBeLessThan(H2H_DOMINANT_RATE);
  });

  it('analysis/page.tsx H2H 배지가 xFIP 배지(wave-513) 이후에 위치', () => {
    const wave513Idx = analysisSrc.indexOf('wave-513');
    const h2hBadgeIdx = analysisSrc.indexOf('h2hFavoredHome');
    expect(wave513Idx).toBeGreaterThan(-1);
    expect(h2hBadgeIdx).toBeGreaterThan(wave513Idx);
  });

  it('analysis/page.tsx H2H 배지 display: {wins}승{losses}패 포함', () => {
    const wave515Idx = analysisSrc.indexOf('wave-515');
    const wave415Idx = analysisSrc.lastIndexOf('wave-415');
    const snippet = analysisSrc.slice(wave515Idx, wave415Idx);
    expect(snippet).toContain('승');
    expect(snippet).toContain('패');
    expect(snippet).toContain('H2H');
  });
});

describe('wave-515 — analysis 구장 직접 대결 배지', () => {
  it('PARK_FACTOR_HITTER_MIN 값은 105', () => {
    expect(PARK_FACTOR_HITTER_MIN).toBe(105);
  });

  it('PARK_FACTOR_PITCHER_MAX 값은 95', () => {
    expect(PARK_FACTOR_PITCHER_MAX).toBe(95);
  });

  it('analysis/page.tsx 에 parkFavoredHome 조건 존재', () => {
    expect(analysisSrc).toContain('parkFavoredHome');
  });

  it('analysis/page.tsx 에 PARK_FACTOR_HITTER_MIN 임계 조건 존재', () => {
    expect(analysisSrc).toContain('PARK_FACTOR_HITTER_MIN');
  });

  it('park duel 로직: PF >= 105 = 타자 친화(홈팀 우세)', () => {
    const pf = 108; // SS 삼성
    expect(pf >= PARK_FACTOR_HITTER_MIN).toBe(true);
  });

  it('park duel 로직: PF <= 95 = 투수 친화(원정팀 우세)', () => {
    const pf = 95; // LG/OB
    expect(pf <= PARK_FACTOR_PITCHER_MAX).toBe(true);
  });

  it('park duel 로직: 96 <= PF <= 104 → 배지 없음', () => {
    const pf = 100; // NC/HT 중립
    expect(pf >= PARK_FACTOR_HITTER_MIN).toBe(false);
    expect(pf <= PARK_FACTOR_PITCHER_MAX).toBe(false);
  });

  it('analysis/page.tsx 구장 배지 display: 타자친화|투수친화 포함', () => {
    const wave515Idx = analysisSrc.indexOf('wave-515');
    const wave415Idx = analysisSrc.lastIndexOf('wave-415');
    const snippet = analysisSrc.slice(wave515Idx, wave415Idx);
    expect(snippet).toContain('타자친화');
    expect(snippet).toContain('투수친화');
    expect(snippet).toContain('구장');
  });

  it('analysis/page.tsx 구장 배지가 팩터 수렴 배지(wave-415) 이전에 위치', () => {
    const parkBadgeIdx = analysisSrc.indexOf('parkFavoredHome');
    const wave415Idx = analysisSrc.lastIndexOf('wave-415');
    expect(parkBadgeIdx).toBeGreaterThan(-1);
    expect(wave415Idx).toBeGreaterThan(parkBadgeIdx);
  });
});
