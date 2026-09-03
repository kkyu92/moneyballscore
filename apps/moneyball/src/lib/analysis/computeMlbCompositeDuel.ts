import {
  type MlbTeamCode,
  MLB_TEAMS,
  LINEUP_WOBA_DUEL_MIN,
  BULLPEN_FIP_DIFF_MIN,
  SP_FIP_DUEL_MIN,
  SP_XFIP_DUEL_MIN,
  WAR_DUEL_MIN,
  PARK_FACTOR_HITTER_MIN,
  PARK_FACTOR_PITCHER_MAX,
  MLB_COMPOSITE_DUEL_MIN_VALID,
} from '@moneyball/shared';

type DuelResult = 'home' | 'away' | null;

interface MlbCompositeDuelInput {
  homeCode: MlbTeamCode;
  homeLineupWoba?: number | null;
  awayLineupWoba?: number | null;
  homeBullpenFip?: number | null;
  awayBullpenFip?: number | null;
  homeSPFip?: number | null;
  awaySPFip?: number | null;
  homeSPXfip?: number | null;
  awaySPXfip?: number | null;
  homeWar?: number | null;
  awayWar?: number | null;
}

interface MlbCompositeDuelResult {
  homeWins: number;
  awayWins: number;
  validCount: number;
  netScore: number;
  homeFavoredSlugs: string[];
  awayFavoredSlugs: string[];
}

/**
 * MLB 버전 composite duel — KBO computeCompositeDuel(analysis/computeCompositeDuel.ts)
 * 병렬 복제 (plan #24 Phase 3c, cycle 2070). elo/recent_form/head_to_head 는 cycle 2353
 * 이후 mlb-pipeline.ts 가 실제로 저장하지만(home_elo/away_elo/home_recent_form/
 * away_recent_form/head_to_head_rate) 본 함수 입력에는 아직 배선되지 않았고, sfr(defense_sfr)
 * 만 MLB 미구현 진짜 placeholder — 그래서 남는 6팩터만 집계 (cycle 2771 review-code heavy 정정).
 * validCount 게이팅은 MLB_COMPOSITE_DUEL_MIN_VALID(3/6) 사용.
 */
export function computeMlbCompositeDuel(g: MlbCompositeDuelInput): MlbCompositeDuelResult {
  const wobaResult: DuelResult =
    g.homeLineupWoba != null && g.awayLineupWoba != null
      ? g.homeLineupWoba - g.awayLineupWoba >= LINEUP_WOBA_DUEL_MIN
        ? 'home'
        : g.awayLineupWoba - g.homeLineupWoba >= LINEUP_WOBA_DUEL_MIN
          ? 'away'
          : null
      : null;

  const bullpenResult: DuelResult =
    g.homeBullpenFip != null && g.awayBullpenFip != null
      ? g.awayBullpenFip - g.homeBullpenFip >= BULLPEN_FIP_DIFF_MIN
        ? 'home'
        : g.homeBullpenFip - g.awayBullpenFip >= BULLPEN_FIP_DIFF_MIN
          ? 'away'
          : null
      : null;

  const spFipResult: DuelResult =
    g.homeSPFip != null && g.awaySPFip != null
      ? g.awaySPFip - g.homeSPFip >= SP_FIP_DUEL_MIN
        ? 'home'
        : g.homeSPFip - g.awaySPFip >= SP_FIP_DUEL_MIN
          ? 'away'
          : null
      : null;

  const spXfipResult: DuelResult =
    g.homeSPXfip != null && g.awaySPXfip != null
      ? g.awaySPXfip - g.homeSPXfip >= SP_XFIP_DUEL_MIN
        ? 'home'
        : g.homeSPXfip - g.awaySPXfip >= SP_XFIP_DUEL_MIN
          ? 'away'
          : null
      : null;

  const warResult: DuelResult =
    g.homeWar != null && g.awayWar != null && g.homeWar > 0 && g.awayWar > 0
      ? g.homeWar - g.awayWar >= WAR_DUEL_MIN
        ? 'home'
        : g.awayWar - g.homeWar >= WAR_DUEL_MIN
          ? 'away'
          : null
      : null;

  const parkResult: DuelResult = (() => {
    const pf = MLB_TEAMS[g.homeCode]?.parkPf;
    if (pf === undefined) return null;
    if (pf >= PARK_FACTOR_HITTER_MIN) return 'home';
    if (pf <= PARK_FACTOR_PITCHER_MAX) return 'away';
    return null;
  })();

  const factorEntries: Array<{ slug: string; result: DuelResult; valid: boolean }> = [
    { slug: 'lineup_woba', result: wobaResult, valid: g.homeLineupWoba != null && g.awayLineupWoba != null },
    { slug: 'bullpen_fip', result: bullpenResult, valid: g.homeBullpenFip != null && g.awayBullpenFip != null },
    { slug: 'sp_fip', result: spFipResult, valid: g.homeSPFip != null && g.awaySPFip != null },
    { slug: 'sp_xfip', result: spXfipResult, valid: g.homeSPXfip != null && g.awaySPXfip != null },
    { slug: 'war', result: warResult, valid: g.homeWar != null && g.awayWar != null && g.homeWar > 0 && g.awayWar > 0 },
    { slug: 'park_factor', result: parkResult, valid: MLB_TEAMS[g.homeCode]?.parkPf !== undefined },
  ];

  const validCount = factorEntries.filter((e) => e.valid).length;
  const homeWins = factorEntries.filter((e) => e.result === 'home').length;
  const awayWins = factorEntries.filter((e) => e.result === 'away').length;
  const homeFavoredSlugs = factorEntries.filter((e) => e.result === 'home').map((e) => e.slug);
  const awayFavoredSlugs = factorEntries.filter((e) => e.result === 'away').map((e) => e.slug);

  return {
    homeWins,
    awayWins,
    validCount,
    netScore: validCount >= MLB_COMPOSITE_DUEL_MIN_VALID ? homeWins - awayWins : 0,
    homeFavoredSlugs,
    awayFavoredSlugs,
  };
}
