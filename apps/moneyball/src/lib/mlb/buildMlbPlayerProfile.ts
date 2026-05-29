import { createClient } from '@/lib/supabase/server';
import {
  MLB_TEAMS,
  type MlbTeamCode,
  mlbShortTeamName,
  assertSelectOk,
} from '@moneyball/shared';

export interface MlbPlayerSeasonStat {
  season: number;
  // hitter
  games: number | null;
  pa: number | null;
  hits: number | null;
  hr: number | null;
  rbi: number | null;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  woba: number | null;
  iso: number | null;
  wrcPlus: number | null;
  hardHitPct: number | null;
  war: number | null;
  // pitcher (별도 sheet)
  innings: number | null;
  era: number | null;
  fip: number | null;
  whip: number | null;
  kPer9: number | null;
  bbPer9: number | null;
}

export interface MlbPlayerProfile {
  playerId: number;
  nameKo: string;
  nameEn: string | null;
  externalId: string | null;
  teamCode: MlbTeamCode | null;
  teamName: string | null;
  position: string | null;
  throws: string | null;
  bats: string | null;
  isActive: boolean;
  hitterStats: MlbPlayerSeasonStat[];
  pitcherStats: MlbPlayerSeasonStat[];
}

interface PlayerRow {
  id: number;
  external_id: string | null;
  name_ko: string;
  name_en: string | null;
  position: string | null;
  throws: string | null;
  bats: string | null;
  is_active: boolean | null;
  team: { code: string | null } | null;
}

interface BatterRow {
  season: number;
  games: number | null;
  pa: number | null;
  hits: number | null;
  hr: number | null;
  rbi: number | null;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  woba: number | null;
  iso: number | null;
  wrc_plus: number | null;
  hard_hit_pct: number | null;
  war: number | null;
}

interface PitcherRow {
  season: number;
  games: number | null;
  innings: number | null;
  era: number | null;
  fip: number | null;
  whip: number | null;
  k_per_9: number | null;
  bb_per_9: number | null;
}

function emptyHitterStat(season: number): MlbPlayerSeasonStat {
  return {
    season,
    games: null, pa: null, hits: null, hr: null, rbi: null,
    avg: null, obp: null, slg: null, ops: null, woba: null,
    iso: null, wrcPlus: null, hardHitPct: null, war: null,
    innings: null, era: null, fip: null, whip: null, kPer9: null, bbPer9: null,
  };
}

// Plan B Tier C+D Task 3 — MLB 선수 프로필 빌더.
// players (league_id=mlb) + batter_stats + pitcher_stats 결합.
// per-player Statcast (xwOBA / Barrel% / Launch Angle / Sprint Speed) = 별도 source 도입 후 확장.
export async function buildMlbPlayerProfile(
  playerId: number,
): Promise<MlbPlayerProfile | null> {
  const supabase = await createClient();

  const playerResult = await supabase
    .from('players')
    .select(
      `
        id, external_id, name_ko, name_en, position, throws, bats, is_active,
        team:teams!players_team_id_fkey(code),
        leagues!inner(code)
      `,
    )
    .eq('id', playerId)
    .eq('leagues.code', 'mlb')
    .maybeSingle();

  const { data: playerRow } = assertSelectOk(
    playerResult,
    'buildMlbPlayerProfile players',
  );

  if (!playerRow) return null;

  const p = playerRow as unknown as PlayerRow;
  const teamCode = (p.team?.code as MlbTeamCode | null) ?? null;
  const teamName = teamCode && MLB_TEAMS[teamCode]
    ? mlbShortTeamName(teamCode)
    : null;

  const batterResult = await supabase
    .from('batter_stats')
    .select(
      'season, games, pa, hits, hr, rbi, avg, obp, slg, ops, woba, iso, wrc_plus, hard_hit_pct, war',
    )
    .eq('player_id', playerId)
    .order('season', { ascending: false })
    .limit(5);

  const { data: batterRows } = assertSelectOk(
    batterResult,
    'buildMlbPlayerProfile batter_stats',
  );

  const hitterStats: MlbPlayerSeasonStat[] = ((batterRows ?? []) as BatterRow[]).map((r) => ({
    ...emptyHitterStat(r.season),
    games: r.games,
    pa: r.pa,
    hits: r.hits,
    hr: r.hr,
    rbi: r.rbi,
    avg: r.avg,
    obp: r.obp,
    slg: r.slg,
    ops: r.ops,
    woba: r.woba,
    iso: r.iso,
    wrcPlus: r.wrc_plus,
    hardHitPct: r.hard_hit_pct,
    war: r.war,
  }));

  const pitcherResult = await supabase
    .from('pitcher_stats')
    .select('season, games, innings, era, fip, whip, k_per_9, bb_per_9')
    .eq('player_id', playerId)
    .order('season', { ascending: false })
    .limit(5);

  const { data: pitcherRows } = assertSelectOk(
    pitcherResult,
    'buildMlbPlayerProfile pitcher_stats',
  );

  const pitcherStats: MlbPlayerSeasonStat[] = ((pitcherRows ?? []) as PitcherRow[]).map((r) => ({
    ...emptyHitterStat(r.season),
    games: r.games,
    innings: r.innings,
    era: r.era,
    fip: r.fip,
    whip: r.whip,
    kPer9: r.k_per_9,
    bbPer9: r.bb_per_9,
  }));

  return {
    playerId: p.id,
    nameKo: p.name_ko,
    nameEn: p.name_en,
    externalId: p.external_id,
    teamCode,
    teamName,
    position: p.position,
    throws: p.throws,
    bats: p.bats,
    isActive: p.is_active ?? true,
    hitterStats,
    pitcherStats,
  };
}
