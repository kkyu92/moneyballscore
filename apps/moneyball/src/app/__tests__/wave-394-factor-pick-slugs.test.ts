import { describe, it, expect } from 'vitest';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';

// wave-394: homeFavoredSlugs / awayFavoredSlugs 반환 검증
// SS(삼성/대구) parkPf=108 >= PARK_FACTOR_HITTER_MIN(105) → park_factor home
// SFR_DUEL_MIN=5.0 (절대값 단위)
describe('wave-394: computeCompositeDuel factor slug arrays', () => {
  it('홈 우세 팩터 slugs 반환', () => {
    // SS(삼성) home — park_factor 타자친화 → home
    const result = computeCompositeDuel({
      homeCode: 'SS',
      homeLineupWoba: 0.360,
      awayLineupWoba: 0.310,   // woba → home
      homeSfr: 30,
      awaySfr: 20,             // sfr diff=10 >= 5.0 → home
      homeBullpenFip: 3.5,
      awayBullpenFip: 4.5,     // bullpen → home
      homeSPFip: 3.2,
      awaySPFip: 4.0,          // sp_fip → home
      homeWar: 25,
      awayWar: 10,             // war → home
      homeElo: 1550,
      awayElo: 1400,           // elo → home
      homeRecentForm: 0.8,
      awayRecentForm: 0.3,     // recent_form → home
      h2hHomeWins: 10,
      h2hAwayWins: 3,          // h2h → home
      homeSPXfip: 3.0,
      awaySPXfip: 4.2,         // sp_xfip → home
    });

    // SS parkPf=108 → park_factor home + 9팩터 → 10개 home
    expect(result.homeFavoredSlugs.length).toBeGreaterThanOrEqual(7);
    expect(result.awayFavoredSlugs.length).toBe(0);
    expect(result.homeFavoredSlugs).toContain('lineup_woba');
    expect(result.homeFavoredSlugs).toContain('sfr');
    expect(result.homeFavoredSlugs).toContain('bullpen_fip');
    expect(result.homeFavoredSlugs).toContain('sp_fip');
    expect(result.homeFavoredSlugs).toContain('war');
    expect(result.homeFavoredSlugs).toContain('elo');
    expect(result.homeFavoredSlugs).toContain('recent_form');
    expect(result.homeFavoredSlugs).toContain('park_factor');
  });

  it('원정 우세 팩터 slugs 반환', () => {
    // LG home — park_factor 투수친화 → away
    const result = computeCompositeDuel({
      homeCode: 'LG',
      homeLineupWoba: 0.310,
      awayLineupWoba: 0.360,   // woba → away
      homeSfr: 20,
      awaySfr: 30,             // sfr diff=10 >= 5.0 → away
      homeBullpenFip: 4.5,
      awayBullpenFip: 3.5,     // bullpen → away
      homeSPFip: 4.0,
      awaySPFip: 3.2,          // sp_fip → away
      homeWar: 10,
      awayWar: 25,             // war → away
      homeElo: 1400,
      awayElo: 1550,           // elo → away
      homeRecentForm: 0.3,
      awayRecentForm: 0.8,     // recent_form → away
      h2hHomeWins: 3,
      h2hAwayWins: 10,         // h2h → away
      homeSPXfip: 4.2,
      awaySPXfip: 3.0,         // sp_xfip → away
    });

    // LG parkPf=95 → park_factor away + 9팩터 → 10개 away
    expect(result.awayFavoredSlugs.length).toBeGreaterThanOrEqual(7);
    expect(result.homeFavoredSlugs.length).toBe(0);
    expect(result.awayFavoredSlugs).toContain('lineup_woba');
    expect(result.awayFavoredSlugs).toContain('sfr');
    expect(result.awayFavoredSlugs).toContain('bullpen_fip');
    expect(result.awayFavoredSlugs).toContain('sp_xfip');
    expect(result.awayFavoredSlugs).toContain('park_factor');
  });

  it('slugs 배열 길이 = homeWins / awayWins 정합', () => {
    const result = computeCompositeDuel({
      homeCode: 'LG',
      homeLineupWoba: 0.360,
      awayLineupWoba: 0.310,   // home
      homeSfr: 20,
      awaySfr: 30,             // away (diff=10 >= 5)
      homeBullpenFip: 3.5,
      awayBullpenFip: 4.5,     // home
      homeSPFip: 3.2,
      awaySPFip: 4.0,          // home
      homeWar: 10,
      awayWar: 25,             // away
      homeElo: 1550,
      awayElo: 1400,           // home
      homeRecentForm: 0.3,
      awayRecentForm: 0.8,     // away
    });

    expect(result.homeFavoredSlugs.length).toBe(result.homeWins);
    expect(result.awayFavoredSlugs.length).toBe(result.awayWins);
  });

  it('데이터 없는 팩터는 slugs 미포함', () => {
    const result = computeCompositeDuel({
      homeCode: 'LG',
      homeLineupWoba: 0.360,
      awayLineupWoba: 0.310,
      // elo/form/h2h undefined
    });

    expect(result.homeFavoredSlugs).not.toContain('elo');
    expect(result.homeFavoredSlugs).not.toContain('recent_form');
    expect(result.homeFavoredSlugs).not.toContain('head_to_head');
  });

  it('park_factor: 타자친화 홈(SS) → home slug / 투수친화 홈(LG) → away slug', () => {
    const ssResult = computeCompositeDuel({ homeCode: 'SS', homeElo: 1500, awayElo: 1500 });
    const lgResult = computeCompositeDuel({ homeCode: 'LG', homeElo: 1500, awayElo: 1500 });

    // SS parkPf=108 → home
    expect(ssResult.homeFavoredSlugs).toContain('park_factor');
    expect(ssResult.awayFavoredSlugs).not.toContain('park_factor');

    // LG parkPf=95 → away
    expect(lgResult.awayFavoredSlugs).toContain('park_factor');
    expect(lgResult.homeFavoredSlugs).not.toContain('park_factor');
  });
});
