import {
  type TeamCode,
  KBO_TEAMS,
  LINEUP_WOBA_DUEL_MIN,
  SFR_DUEL_MIN,
  BULLPEN_FIP_DIFF_MIN,
  SP_FIP_DUEL_MIN,
  SP_XFIP_DUEL_MIN,
  WAR_DUEL_MIN,
  ELO_GAP_STRONG,
  RECENT_FORM_DUEL_MIN,
  H2H_DOMINANT_RATE,
  H2H_WEAK_RATE,
  PARK_FACTOR_HITTER_MIN,
  PARK_FACTOR_PITCHER_MAX,
  COMPOSITE_DUEL_MIN_VALID,
} from '@moneyball/shared';

type DuelResult = 'home' | 'away' | null;

export interface CompositeDuelInput {
  homeCode: TeamCode;
  homeLineupWoba?: number | null;
  awayLineupWoba?: number | null;
  homeSfr?: number | null;
  awaySfr?: number | null;
  homeBullpenFip?: number | null;
  awayBullpenFip?: number | null;
  homeSPFip?: number | null;
  awaySPFip?: number | null;
  homeSPXfip?: number | null;
  awaySPXfip?: number | null;
  homeWar?: number | null;
  awayWar?: number | null;
  homeElo?: number;
  awayElo?: number;
  homeRecentForm?: number;
  awayRecentForm?: number;
  h2hHomeWins?: number;
  h2hAwayWins?: number;
}

export interface CompositeDuelResult {
  homeWins: number;
  awayWins: number;
  /** wave-390: 유효 팩터 수 (null/임계 미달 팩터 제외) */
  validCount: number;
  /** Net advantage: positive = home favored, negative = away favored */
  netScore: number;
  /** wave-394: slugs of factors favoring home team */
  homeFavoredSlugs: string[];
  /** wave-394: slugs of factors favoring away team */
  awayFavoredSlugs: string[];
}

/**
 * wave-390 (cycle 1734): COMPOSITE_DUEL 10팩터 집계 헬퍼.
 * analysis/page.tsx 인라인 COMPOSITE_DUEL JSX 로직을 추출하여 data layer에서 재사용.
 * Mirrors: wave-365 wOBA/SFR/bullpen/spFIP + wave-368 WAR + wave-379 Elo +
 *          wave-381 form + wave-383 H2H + wave-386 xFIP + wave-388 park.
 *          wave-394: homeFavoredSlugs/awayFavoredSlugs 슬러그 집계 추가.
 *          wave-432: validCount 표시층 사용 (compositeDuelValidCount).
 */
export function computeCompositeDuel(g: CompositeDuelInput): CompositeDuelResult {
  const wobaResult: DuelResult =
    g.homeLineupWoba != null && g.awayLineupWoba != null
      ? g.homeLineupWoba - g.awayLineupWoba >= LINEUP_WOBA_DUEL_MIN
        ? 'home'
        : g.awayLineupWoba - g.homeLineupWoba >= LINEUP_WOBA_DUEL_MIN
          ? 'away'
          : null
      : null;

  const sfrResult: DuelResult =
    g.homeSfr != null && g.awaySfr != null
      ? g.homeSfr - g.awaySfr >= SFR_DUEL_MIN
        ? 'home'
        : g.awaySfr - g.homeSfr >= SFR_DUEL_MIN
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

  // wave-535: WAR=0 = Fancy Stats top-50 데이터 갭 (predictor wave-533 와 동일 guard).
  // WAR=0 시 valid=false — 예측 엔진 neutral(0.5)과 UI 일치.
  const warResult: DuelResult =
    g.homeWar != null && g.awayWar != null && g.homeWar > 0 && g.awayWar > 0
      ? g.homeWar - g.awayWar >= WAR_DUEL_MIN
        ? 'home'
        : g.awayWar - g.homeWar >= WAR_DUEL_MIN
          ? 'away'
          : null
      : null;

  const eloResult: DuelResult =
    g.homeElo !== undefined && g.awayElo !== undefined
      ? g.homeElo - g.awayElo >= ELO_GAP_STRONG
        ? 'home'
        : g.awayElo - g.homeElo >= ELO_GAP_STRONG
          ? 'away'
          : null
      : null;

  const formResult: DuelResult =
    g.homeRecentForm !== undefined && g.awayRecentForm !== undefined
      ? g.homeRecentForm - g.awayRecentForm >= RECENT_FORM_DUEL_MIN
        ? 'home'
        : g.awayRecentForm - g.homeRecentForm >= RECENT_FORM_DUEL_MIN
          ? 'away'
          : null
      : null;

  const h2hResult: DuelResult =
    g.h2hHomeWins !== undefined && g.h2hAwayWins !== undefined
      ? (() => {
          const homeRate = g.h2hHomeWins! / (g.h2hHomeWins! + g.h2hAwayWins!);
          if (homeRate >= H2H_DOMINANT_RATE) return 'home';
          if (homeRate <= H2H_WEAK_RATE) return 'away';
          return null;
        })()
      : null;

  const spXfipResult: DuelResult =
    g.homeSPXfip != null && g.awaySPXfip != null
      ? g.awaySPXfip - g.homeSPXfip >= SP_XFIP_DUEL_MIN
        ? 'home'
        : g.homeSPXfip - g.awaySPXfip >= SP_XFIP_DUEL_MIN
          ? 'away'
          : null
      : null;

  const parkResult: DuelResult = (() => {
    const pf = KBO_TEAMS[g.homeCode]?.parkPf;
    if (pf === undefined) return null;
    if (pf >= PARK_FACTOR_HITTER_MIN) return 'home';
    if (pf <= PARK_FACTOR_PITCHER_MAX) return 'away';
    return null;
  })();

  // wave-394: factor entries with slugs for label display
  const factorEntries: Array<{ slug: string; result: DuelResult; valid: boolean }> = [
    { slug: 'lineup_woba', result: wobaResult, valid: g.homeLineupWoba != null && g.awayLineupWoba != null },
    { slug: 'sfr', result: sfrResult, valid: g.homeSfr != null && g.awaySfr != null },
    { slug: 'bullpen_fip', result: bullpenResult, valid: g.homeBullpenFip != null && g.awayBullpenFip != null },
    { slug: 'sp_fip', result: spFipResult, valid: g.homeSPFip != null && g.awaySPFip != null },
    { slug: 'war', result: warResult, valid: g.homeWar != null && g.awayWar != null && g.homeWar > 0 && g.awayWar > 0 },
    { slug: 'elo', result: eloResult, valid: g.homeElo !== undefined && g.awayElo !== undefined },
    { slug: 'recent_form', result: formResult, valid: g.homeRecentForm !== undefined && g.awayRecentForm !== undefined },
    { slug: 'head_to_head', result: h2hResult, valid: g.h2hHomeWins !== undefined && g.h2hAwayWins !== undefined },
    { slug: 'sp_xfip', result: spXfipResult, valid: g.homeSPXfip != null && g.awaySPXfip != null },
    { slug: 'park_factor', result: parkResult, valid: KBO_TEAMS[g.homeCode]?.parkPf !== undefined },
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
    netScore: validCount >= COMPOSITE_DUEL_MIN_VALID ? homeWins - awayWins : 0,
    homeFavoredSlugs,
    awayFavoredSlugs,
  };
}
