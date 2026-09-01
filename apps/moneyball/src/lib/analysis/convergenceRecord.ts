import { createClient } from '@/lib/supabase/server';
import {
  assertSelectOk,
  toKSTDateString,
  CONVERGENCE_RECORD_LOOKBACK_DAYS,
  CONVERGENCE_RECORD_RECENT_LIMIT,
  COMPOSITE_DUEL_MIN_VALID,
  MLB_COMPOSITE_DUEL_MIN_VALID,
  FACTOR_PICK_MIN_FACTORS,
  FACTOR_PICK_STRONG,
  FACTOR_PICK_COMPLETE,
  MLB_FACTOR_PICK_STRONG,
  KBO_SEASON_START_DATE,
  PRODUCTION_COHORT_RULES,
  MLB_PRODUCTION_COHORT_RULES,
  CONVERGENCE_TEAM_STATS_MIN_PICKS,
  CONVERGENCE_HOME_AWAY_MIN_PICKS,
  CONVERGENCE_DAY_OF_WEEK_MIN_PICKS,
  CONVERGENCE_STREAK_MIN_LENGTH,
  ACCURACY_GOOD_PCT,
  CONVERGENCE_BADGE_LOW_PCT,
  H2H_MIN_GAMES,
  type TeamCode,
  type MlbTeamCode,
  type SelectResult,
  normalizeMlbTeamCode,
  toMlbStatsApiCode,
  kstDateOffset,
} from '@moneyball/shared';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';
import { computeMlbCompositeDuel } from '@/lib/analysis/computeMlbCompositeDuel';
import { getSeasonH2HData } from '@/app/analysis/analysis-data';

interface ConvergenceGameRow {
  game_date: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
    home_elo: number | null;
    away_elo: number | null;
    home_recent_form: number | null;
    away_recent_form: number | null;
    home_sp_fip: number | null;
    away_sp_fip: number | null;
    home_sp_xfip: number | null;
    away_sp_xfip: number | null;
    home_lineup_woba: number | null;
    away_lineup_woba: number | null;
    home_bullpen_fip: number | null;
    away_bullpen_fip: number | null;
    home_sfr: number | null;
    away_sfr: number | null;
    home_war_total: number | null;
    away_war_total: number | null;
  }>;
}

// cycle 1997: fetchConvergencePickDetailedResults (하단) 와 쿼리 구성 + duel 계산 루프가
// 완전 동일했던 중복 제거 — boolean[] 소비자는 detailed 결과의 `won` 필드만 취해 파생.
// detailed 는 이미 같은 정렬(game_date desc, game_time asc) 이라 slice(0, limit) 이 기존 early-break 와 동치.
async function fetchConvergencePickResults(
  cutoff: string,
  limit: number,
  minFactors: number,
  // wave-584: endDate 지정 시 해당 날짜까지만 조회 (주간 리뷰 수렴 픽 성적 용).
  // 미지정 시 기존 동작 (today 미만).
  endDate?: string,
): Promise<boolean[]> {
  const detailed = await fetchConvergencePickDetailedResults(cutoff, minFactors, endDate);
  return detailed.slice(0, limit).map(r => r.won);
}

export async function getRecentConvergencePickRecord(
  limit = CONVERGENCE_RECORD_RECENT_LIMIT,
  minFactors = FACTOR_PICK_MIN_FACTORS,
  // wave-546/548: startDate 지정 시 lookback days 무시하고 이 날짜부터 전체 조회 (limit 도 무시).
  // 월간 성적 (currentMonth.startDate) / 시즌 전체 성적 (KBO_SEASON_START_DATE) 양쪽 사용.
  startDate?: string,
  // wave-584: endDate 지정 시 해당 날짜까지만 조회 (주간 리뷰 수렴 픽 성적 용).
  endDate?: string,
): Promise<{ wins: number; losses: number; total: number }> {
  const cutoff = startDate ?? kstDateOffset(CONVERGENCE_RECORD_LOOKBACK_DAYS);
  const effectiveLimit = startDate != null ? Number.MAX_SAFE_INTEGER : limit;
  const results = await fetchConvergencePickResults(cutoff, effectiveLimit, minFactors, endDate);
  const wins = results.filter(r => r).length;
  return { wins, losses: results.length - wins, total: results.length };
}

// wave-552: 강수렴 픽 연속 streak — 순수 함수 (테스트 가능)
// results: 최신순 정렬된 경기 결과 (true=강수렴 방향 적중)
// 반환: 연속 2경기 이상 스트릭 또는 null
export function computeConvergenceStreak(
  results: boolean[],
): { type: 'win' | 'loss'; length: number } | null {
  if (results.length === 0) return null;
  const firstWon = results[0];
  let len = 1;
  for (let i = 1; i < results.length; i++) {
    if (results[i] !== firstWon) break;
    len++;
  }
  if (len < CONVERGENCE_STREAK_MIN_LENGTH) return null;
  return { type: firstWon ? 'win' : 'loss', length: len };
}

// wave-555: default FACTOR_PICK_STRONG(8) — wave-552 callsite 동기
// (wave-552 analysis/page.tsx getConvergencePickStreak(FACTOR_PICK_STRONG) 명시, wave-554 getConvergencePickBestStreak default 동일 기준)
// wave-594: startDate/endDate 지정 시 그 범위 내 현재(=범위 마지막) streak (주간/월간 리뷰 상세 페이지 용). 미지정 시 기존 lookback-days 동작.
export async function getConvergencePickStreak(
  minFactors = FACTOR_PICK_STRONG,
  startDate?: string,
  endDate?: string,
): Promise<{ type: 'win' | 'loss'; length: number } | null> {
  const cutoff = startDate ?? kstDateOffset(CONVERGENCE_RECORD_LOOKBACK_DAYS);
  const results = await fetchConvergencePickResults(cutoff, Number.MAX_SAFE_INTEGER, minFactors, endDate);
  return computeConvergenceStreak(results);
}

// wave-554: 강수렴 픽 시즌 최장 streak — 순수 함수 (테스트 가능)
// results: 최신순 정렬된 경기 결과 배열 (true=강수렴 방향 적중)
// 반환: 시즌 전체에서 가장 긴 연속 streak (승 or 패 중 더 긴 것, 동점 시 win 우선), 2경기 미만이면 null
export function computeConvergenceBestStreak(
  results: boolean[],
): { type: 'win' | 'loss'; length: number } | null {
  if (results.length === 0) return null;
  let bestWin = 0;
  let bestLoss = 0;
  let curr = 1;
  for (let i = 1; i < results.length; i++) {
    if (results[i] === results[i - 1]) {
      curr++;
    } else {
      if (results[i - 1]) bestWin = Math.max(bestWin, curr);
      else bestLoss = Math.max(bestLoss, curr);
      curr = 1;
    }
  }
  if (results[results.length - 1]) bestWin = Math.max(bestWin, curr);
  else bestLoss = Math.max(bestLoss, curr);
  const best = Math.max(bestWin, bestLoss);
  if (best < CONVERGENCE_STREAK_MIN_LENGTH) return null;
  return bestWin >= bestLoss
    ? { type: 'win', length: bestWin }
    : { type: 'loss', length: bestLoss };
}

// wave-594: startDate/endDate 지정 시 그 범위 내 최장 streak (주간/월간 리뷰 상세 페이지 용). 미지정 시 기존 시즌 전체 동작.
export async function getConvergencePickBestStreak(
  minFactors = FACTOR_PICK_STRONG,
  startDate: string = KBO_SEASON_START_DATE,
  endDate?: string,
): Promise<{ type: 'win' | 'loss'; length: number } | null> {
  const results = await fetchConvergencePickResults(startDate, Number.MAX_SAFE_INTEGER, minFactors, endDate);
  return computeConvergenceBestStreak(results);
}

// wave-557: 강수렴 픽 팀별 시즌 성적 — DB 독립 순수 함수 (테스트 가능)
// results: { favoredTeam, won } 배열 (fetchConvergencePickDetailedResults 출력)
// minPicks: 표시 최소 경기 수 (소표본 노이즈 차단)
// 반환: 총 경기 수 내림차순 정렬 (같으면 승 수 내림차순)
export function computeConvergenceTeamStats<T extends string = TeamCode>(
  results: Array<{ favoredTeam: T; won: boolean }>,
  minPicks = CONVERGENCE_TEAM_STATS_MIN_PICKS,
): Array<{ teamCode: T; wins: number; losses: number }> {
  const map = new Map<T, { wins: number; losses: number }>();
  for (const r of results) {
    const s = map.get(r.favoredTeam) ?? { wins: 0, losses: 0 };
    if (r.won) s.wins++;
    else s.losses++;
    map.set(r.favoredTeam, s);
  }
  return Array.from(map.entries())
    .map(([teamCode, { wins, losses }]) => ({ teamCode, wins, losses }))
    .filter(s => s.wins + s.losses >= minPicks)
    .sort((a, b) => {
      const totalDiff = (b.wins + b.losses) - (a.wins + a.losses);
      return totalDiff !== 0 ? totalDiff : b.wins - a.wins;
    });
}

async function fetchConvergencePickDetailedResults(
  cutoff: string,
  minFactors: number,
  // wave-600: endDate 지정 시 해당 날짜까지만 조회 (월간 리뷰 홈/어웨이 분리 성적 용, fetchConvergencePickResults wave-584 동일 패턴).
  // 미지정 시 기존 동작 (today 미만).
  endDate?: string,
): Promise<Array<{ favoredTeam: TeamCode; favoredHome: boolean; won: boolean; gameDate: string }>> {
  const today = toKSTDateString();
  const supabase = await createClient();
  let query = supabase
    .from('games')
    .select(`
      game_date, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        home_elo, away_elo, home_recent_form, away_recent_form,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
        home_sfr, away_sfr, home_war_total, away_war_total
      )
    `)
    .gte('game_date', cutoff)
    .not('home_score', 'is', null)
    .eq('predictions.prediction_type', 'pre_game')
    .in('predictions.scoring_rule', PRODUCTION_COHORT_RULES)
    .order('game_date', { ascending: false })
    .order('game_time', { ascending: true });
  if (endDate != null) {
    query = query.lte('game_date', endDate);
  } else {
    query = query.lt('game_date', today);
  }
  const gamesResult = (await query) as unknown as SelectResult<ConvergenceGameRow[]>;

  const { data } = assertSelectOk(gamesResult, 'fetchConvergencePickDetailedResults');
  if (!data) return [];

  // cycle 2304: h2h(상대전적) 누락 시 computeCompositeDuel 이 h2h 팩터를 항상 제외(validCount 최대 9/10)해
  // FACTOR_PICK_COMPLETE(10) 게이팅이 구조적으로 절대 통과 불가 — 완전수렴 시즌/월간/streak/팀별/홈어웨이
  // 통계가 전부 silent 0건이던 문제 (cycle 2303 game/[id] 단건 h2h 누락 fix 와 동일 family, 여기는 집계 차원)
  const h2hMap = await getSeasonH2HData();
  const results: Array<{ favoredTeam: TeamCode; favoredHome: boolean; won: boolean; gameDate: string }> = [];
  for (const row of data as unknown as ConvergenceGameRow[]) {
    const evaluated = evaluateConvergencePickRow(row, minFactors, h2hMap);
    if (evaluated) results.push(evaluated);
  }

  return results;
}

// wave-608: fetchConvergencePickDetailedResults 의 행별 판정 로직 (composite duel 계산 →
// minFactors 게이팅 → favoredTeam/won 산출) 을 공유 헬퍼로 추출 — /matchup/[teamA]/[teamB]
// 두 팀 한정 조회(fetchConvergencePickDetailedResultsForPair)와 동일 판정 로직 재사용, 중복 회피.
function evaluateConvergencePickRow(
  row: ConvergenceGameRow,
  minFactors: number,
  h2hMap: Map<string, Record<string, number>>,
): { favoredTeam: TeamCode; favoredHome: boolean; won: boolean; gameDate: string } | null {
  const pred = row.predictions?.[0];
  if (!pred || row.home_score === null || row.away_score === null) return null;
  const homeCode = row.home_team?.code as TeamCode | undefined;
  const awayCode = row.away_team?.code as TeamCode | undefined;
  if (!homeCode || !awayCode) return null;

  // cycle 2304: page.tsx/game/[id] 와 동일 패턴 — season-to-date 누적 h2h, H2H_MIN_GAMES 미만 시 미반영
  const [h2hA, h2hB] = [homeCode as string, awayCode as string].sort();
  const h2hPair = h2hMap.get(`${h2hA}:${h2hB}`) ?? {};
  const h2hHomeWins = h2hPair[homeCode] ?? 0;
  const h2hAwayWins = h2hPair[awayCode] ?? 0;
  const h2hTotal = h2hHomeWins + h2hAwayWins;
  const h2hHomeArg = h2hTotal >= H2H_MIN_GAMES ? h2hHomeWins : undefined;
  const h2hAwayArg = h2hTotal >= H2H_MIN_GAMES ? h2hAwayWins : undefined;

  const duel = computeCompositeDuel({
    homeCode,
    homeLineupWoba: pred.home_lineup_woba,
    awayLineupWoba: pred.away_lineup_woba,
    homeSfr: pred.home_sfr,
    awaySfr: pred.away_sfr,
    homeBullpenFip: pred.home_bullpen_fip,
    awayBullpenFip: pred.away_bullpen_fip,
    homeSPFip: pred.home_sp_fip,
    awaySPFip: pred.away_sp_fip,
    homeSPXfip: pred.home_sp_xfip,
    awaySPXfip: pred.away_sp_xfip,
    homeWar: pred.home_war_total,
    awayWar: pred.away_war_total,
    homeElo: pred.home_elo ?? undefined,
    awayElo: pred.away_elo ?? undefined,
    homeRecentForm: pred.home_recent_form ?? undefined,
    awayRecentForm: pred.away_recent_form ?? undefined,
    h2hHomeWins: h2hHomeArg,
    h2hAwayWins: h2hAwayArg,
  });

  if (duel.validCount < COMPOSITE_DUEL_MIN_VALID) return null;
  if (Math.abs(duel.netScore) < minFactors) return null;

  const favoredHome = duel.netScore > 0;
  const favoredTeam = favoredHome ? homeCode : awayCode;
  const won = favoredHome ? row.home_score > row.away_score : row.away_score > row.home_score;
  return { favoredTeam, favoredHome, won, gameDate: row.game_date };
}

// wave-608: /matchup/[teamA]/[teamB] 두 팀이 맞붙은 경기만 한정 조회 — buildMatchupProfile
// 의 team id 조회 + or() 필터 패턴 재사용, 판정 로직은 evaluateConvergencePickRow 공유.
async function fetchConvergencePickDetailedResultsForPair(
  idA: number,
  idB: number,
  minFactors: number,
): Promise<Array<{ favoredTeam: TeamCode; won: boolean }>> {
  const supabase = await createClient();
  const orFilter =
    `and(home_team_id.eq.${idA},away_team_id.eq.${idB}),` +
    `and(home_team_id.eq.${idB},away_team_id.eq.${idA})`;

  const gamesResult = (await supabase
    .from('games')
    .select(`
      game_date, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        home_elo, away_elo, home_recent_form, away_recent_form,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
        home_sfr, away_sfr, home_war_total, away_war_total
      )
    `)
    .or(orFilter)
    .not('home_score', 'is', null)
    .eq('predictions.prediction_type', 'pre_game')
    .in('predictions.scoring_rule', PRODUCTION_COHORT_RULES)) as unknown as SelectResult<ConvergenceGameRow[]>;

  const { data } = assertSelectOk(gamesResult, `fetchConvergencePickDetailedResultsForPair ${idA} vs ${idB}`);
  if (!data) return [];

  // cycle 2304: h2h 누락 시 FACTOR_PICK_COMPLETE 게이팅 구조적 불가 (evaluateConvergencePickRow 동일 fix)
  const h2hMap = await getSeasonH2HData();
  const results: Array<{ favoredTeam: TeamCode; won: boolean }> = [];
  for (const row of data as unknown as ConvergenceGameRow[]) {
    const evaluated = evaluateConvergencePickRow(row, minFactors, h2hMap);
    if (evaluated) results.push({ favoredTeam: evaluated.favoredTeam, won: evaluated.won });
  }

  return results;
}

// wave-608: 두 팀 매치업 한정 강수렴/완전수렴 픽 성적 — /matchup/[teamA]/[teamB] 전용.
// analysis/seasons/reviews/teams 5곳엔 이미 팀별 수렴 픽 성적이 있었지만 시즌 전체 기준이라
// "이 두 팀이 맞붙었을 때" 는 없던 gap. team id 조회 실패(교류전 등 팀 미등록) 시 빈 배열.
export async function getConvergencePickHeadToHeadRecord(
  codeA: TeamCode,
  codeB: TeamCode,
  minFactors = FACTOR_PICK_STRONG,
): Promise<Array<{ teamCode: TeamCode; wins: number; losses: number }>> {
  const supabase = await createClient();
  const teamsResult = (await supabase
    .from('teams')
    .select('id, code')
    .in('code', [codeA, codeB])) as SelectResult<Array<{ id: number; code: string }>>;
  const { data: teamRows } = assertSelectOk(teamsResult, `getConvergencePickHeadToHeadRecord teams ${codeA} vs ${codeB}`);
  const idByCode = new Map<string, number>();
  for (const t of teamRows ?? []) idByCode.set(t.code, t.id);
  const idA = idByCode.get(codeA);
  const idB = idByCode.get(codeB);
  if (idA == null || idB == null) return [];

  const results = await fetchConvergencePickDetailedResultsForPair(idA, idB, minFactors);
  return computeConvergenceTeamStats(results, CONVERGENCE_TEAM_STATS_MIN_PICKS);
}

interface MlbPredBreakdownRow {
  external_game_id: string;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_war_total: number | null;
  away_war_total: number | null;
}

// plan #24 Phase 3c (cycle 2070): getConvergencePickHeadToHeadRecord 의 MLB 버전.
// KBO 는 games(팀 FK) 모델이라 teams.id 조회 → games.home_team_id 필터로 두 팀을 특정하지만
// MLB 는 mlb_schedule(팀 코드 string) + predictions.external_game_id 모델이라 buildMlbMatchupProfile
// 과 동일하게 or() 필터를 팀 코드 문자열에 직접 건다 — teams 테이블 조회 자체가 불필요.
async function fetchMlbConvergencePickDetailedResultsForPair(
  codeA: MlbTeamCode,
  codeB: MlbTeamCode,
  minFactors: number,
): Promise<Array<{ favoredTeam: MlbTeamCode; won: boolean }>> {
  const supabase = await createClient();
  // mlb_schedule 은 StatsAPI 컨벤션 저장 — canonical(Baseball-Reference) 코드로 그대로 필터링하면
  // 7팀(TBR/CHW/KCR/SDP/SFG/ARI/WSN)에서 항상 0건 매칭(silent empty, cycle 2081).
  const dbCodeA = toMlbStatsApiCode(codeA);
  const dbCodeB = toMlbStatsApiCode(codeB);
  const orFilter =
    `and(home_team_code.eq.${dbCodeA},away_team_code.eq.${dbCodeB}),` +
    `and(home_team_code.eq.${dbCodeB},away_team_code.eq.${dbCodeA})`;

  const scheduleResult = (await supabase
    .from('mlb_schedule')
    .select('external_game_id, game_date, home_score, away_score, home_team_code, away_team_code')
    .or(orFilter)
    .not('home_score', 'is', null)
    .eq('status', 'final')) as SelectResult<
    Array<{
      external_game_id: string;
      game_date: string;
      home_score: number | null;
      away_score: number | null;
      home_team_code: string;
      away_team_code: string;
    }>
  >;
  const { data: scheduleRows } = assertSelectOk(
    scheduleResult,
    `fetchMlbConvergencePickDetailedResultsForPair schedule ${codeA} vs ${codeB}`,
  );
  if (!scheduleRows || scheduleRows.length === 0) return [];

  const predResult = (await supabase
    .from('predictions')
    .select(`
      external_game_id,
      home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
      home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
      home_war_total, away_war_total
    `)
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id))) as SelectResult<MlbPredBreakdownRow[]>;
  const { data: predRows } = assertSelectOk(
    predResult,
    `fetchMlbConvergencePickDetailedResultsForPair predictions ${codeA} vs ${codeB}`,
  );
  const predByExternalId = new Map((predRows ?? []).map((p) => [p.external_game_id, p]));

  const results: Array<{ favoredTeam: MlbTeamCode; won: boolean }> = [];
  for (const row of scheduleRows) {
    const evaluated = evaluateMlbConvergencePickRow(row, predByExternalId.get(row.external_game_id), minFactors);
    if (evaluated) results.push({ favoredTeam: evaluated.favoredTeam, won: evaluated.won });
  }

  return results;
}

// wave-625: fetchMlbConvergencePickDetailedResultsForPair(두 팀 한정) 와
// fetchMlbConvergencePickDetailedResults(전체 리그, 팀별 성적 집계용) 가 공유하는 판정 로직 —
// KBO evaluateConvergencePickRow(wave-608) 의 MLB 대응.
function evaluateMlbConvergencePickRow(
  row: { game_date: string; home_score: number | null; away_score: number | null; home_team_code: string; away_team_code: string },
  pred: MlbPredBreakdownRow | undefined,
  minFactors: number,
): { favoredTeam: MlbTeamCode; favoredHome: boolean; won: boolean; gameDate: string } | null {
  if (!pred || row.home_score === null || row.away_score === null) return null;
  // DB 원본(StatsAPI 컨벤션) → canonical 정규화. 이후 MLB_TEAMS 조회/canonical 코드 비교 안전.
  const homeCode = normalizeMlbTeamCode(row.home_team_code) ?? (row.home_team_code as MlbTeamCode);
  const awayCode = normalizeMlbTeamCode(row.away_team_code) ?? (row.away_team_code as MlbTeamCode);

  const duel = computeMlbCompositeDuel({
    homeCode,
    homeLineupWoba: pred.home_lineup_woba,
    awayLineupWoba: pred.away_lineup_woba,
    homeBullpenFip: pred.home_bullpen_fip,
    awayBullpenFip: pred.away_bullpen_fip,
    homeSPFip: pred.home_sp_fip,
    awaySPFip: pred.away_sp_fip,
    homeSPXfip: pred.home_sp_xfip,
    awaySPXfip: pred.away_sp_xfip,
    homeWar: pred.home_war_total,
    awayWar: pred.away_war_total,
  });

  if (duel.validCount < MLB_COMPOSITE_DUEL_MIN_VALID) return null;
  if (Math.abs(duel.netScore) < minFactors) return null;

  const favoredHome = duel.netScore > 0;
  const favoredTeam = favoredHome ? homeCode : awayCode;
  const won = favoredHome ? row.home_score > row.away_score : row.away_score > row.home_score;
  return { favoredTeam, favoredHome, won, gameDate: row.game_date };
}

// wave-625: MLB 팀별 시즌 전체 강수렴/완전수렴 픽 성적 — getConvergencePickTeamStats(KBO) 대응.
// KBO 는 KBO_SEASON_START_DATE 로 조회 범위를 한정하지만 MLB 는 buildMlbAccuracySummary 와
// 동일 패턴(status='final' 전량 스캔, cutoff 불필요 — MLB 시즌 전체가 이미 KBO 대비 소표본).
// cycle 2345: startDate/endDate 지정 시 그 범위만 조회 (주간/월간 리뷰 용, KBO
// fetchConvergencePickDetailedResults wave-584/600 동일 패턴). 미지정 시 기존 동작 (시즌 전체).
async function fetchMlbConvergencePickDetailedResults(
  minFactors: number,
  startDate?: string,
  endDate?: string,
): Promise<Array<{ favoredTeam: MlbTeamCode; favoredHome: boolean; won: boolean; gameDate: string }>> {
  const supabase = await createClient();

  let scheduleQuery = supabase
    .from('mlb_schedule')
    .select('external_game_id, game_date, home_score, away_score, home_team_code, away_team_code')
    .eq('status', 'final')
    .order('game_date', { ascending: false });
  if (startDate != null) scheduleQuery = scheduleQuery.gte('game_date', startDate);
  if (endDate != null) scheduleQuery = scheduleQuery.lte('game_date', endDate);
  const scheduleResult = (await scheduleQuery) as SelectResult<
    Array<{
      external_game_id: string;
      game_date: string;
      home_score: number | null;
      away_score: number | null;
      home_team_code: string;
      away_team_code: string;
    }>
  >;
  const { data: scheduleRows } = assertSelectOk(scheduleResult, 'fetchMlbConvergencePickDetailedResults schedule');
  if (!scheduleRows || scheduleRows.length === 0) return [];

  const predResult = (await supabase
    .from('predictions')
    .select(`
      external_game_id,
      home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
      home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
      home_war_total, away_war_total
    `)
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id))) as SelectResult<MlbPredBreakdownRow[]>;
  const { data: predRows } = assertSelectOk(predResult, 'fetchMlbConvergencePickDetailedResults predictions');
  const predByExternalId = new Map((predRows ?? []).map((p) => [p.external_game_id, p]));

  const results: Array<{ favoredTeam: MlbTeamCode; favoredHome: boolean; won: boolean; gameDate: string }> = [];
  for (const row of scheduleRows) {
    const evaluated = evaluateMlbConvergencePickRow(row, predByExternalId.get(row.external_game_id), minFactors);
    if (evaluated) results.push(evaluated);
  }

  return results;
}

/**
 * MLB 팀별 시즌 전체 강수렴/완전수렴 픽 성적 — getConvergencePickTeamStats(KBO) 대응.
 * /mlb/team/[code] 전용 (wave-625). computeConvergenceTeamStats 는 generic 이라 MlbTeamCode 도
 * 동일 로직 재사용 (plan24-phase3c 테스트가 이미 검증).
 */
export async function getMlbConvergencePickTeamStats(
  minFactors = MLB_FACTOR_PICK_STRONG,
  // cycle 2345: startDate/endDate 지정 시 해당 범위만 조회 (주간/월간 리뷰 용, KBO
  // getConvergencePickTeamStats wave-603 동일 패턴). 미지정 시 기존 동작 (시즌 전체).
  startDate?: string,
  endDate?: string,
): Promise<Array<{ teamCode: MlbTeamCode; wins: number; losses: number }>> {
  const results = await fetchMlbConvergencePickDetailedResults(minFactors, startDate, endDate);
  return computeConvergenceTeamStats(results, CONVERGENCE_TEAM_STATS_MIN_PICKS);
}

/**
 * MLB 두 팀 맞대결 한정 강수렴/완전수렴 픽 성적 — getConvergencePickHeadToHeadRecord(KBO) 대응.
 * MLB_FACTOR_PICK_STRONG(5)/MLB_FACTOR_PICK_COMPLETE(6) 는 유효 6팩터 기준 임계 —
 * KBO FACTOR_PICK_STRONG(8)/FACTOR_PICK_COMPLETE(10) 을 그대로 쓰면 MLB netScore 최대치(6)를
 * 넘는 임계라 항상 빈 배열만 반환하는 dead 게이트가 됨(cycle 2070 확인) — 호출부는
 * MLB_FACTOR_PICK_STRONG/MLB_FACTOR_PICK_COMPLETE 를 minFactors 로 넘겨야 함.
 */
export async function getMlbConvergencePickHeadToHeadRecord(
  codeA: MlbTeamCode,
  codeB: MlbTeamCode,
  minFactors: number,
): Promise<Array<{ teamCode: MlbTeamCode; wins: number; losses: number }>> {
  const results = await fetchMlbConvergencePickDetailedResultsForPair(codeA, codeB, minFactors);
  return computeConvergenceTeamStats(results, CONVERGENCE_TEAM_STATS_MIN_PICKS);
}

// cycle 2226: MLB 리그 전체 강수렴/완전수렴 픽 W-L — getRecentConvergencePickRecord(KBO) 대응.
// KBO 는 lookback-days cutoff + limit 을 쓰지만 MLB 는 getMlbConvergencePickTeamStats 와
// 동일하게 시즌 전체(status='final') 스캔 — MLB 시즌 자체가 KBO 대비 소표본이라 cutoff 불필요.
export async function getMlbRecentConvergencePickRecord(
  minFactors = MLB_FACTOR_PICK_STRONG,
  // cycle 2345: startDate/endDate 지정 시 해당 범위만 조회 (주간/월간 리뷰 용). 미지정 시 기존 동작 (시즌 전체).
  startDate?: string,
  endDate?: string,
): Promise<{ wins: number; losses: number; total: number }> {
  const results = await fetchMlbConvergencePickDetailedResults(minFactors, startDate, endDate);
  const wins = results.filter((r) => r.won).length;
  return { wins, losses: results.length - wins, total: results.length };
}

// cycle 2226: MLB 강수렴 픽 현재 streak — getConvergencePickStreak(KBO) 대응.
// fetchMlbConvergencePickDetailedResults 가 game_date desc 정렬 반환하므로 그대로 재사용.
// cycle 2345: startDate/endDate 지정 시 그 범위 내 현재(=범위 마지막) streak (주간/월간 리뷰 용).
export async function getMlbConvergencePickStreak(
  minFactors = MLB_FACTOR_PICK_STRONG,
  startDate?: string,
  endDate?: string,
): Promise<{ type: 'win' | 'loss'; length: number } | null> {
  const results = await fetchMlbConvergencePickDetailedResults(minFactors, startDate, endDate);
  return computeConvergenceStreak(results.map((r) => r.won));
}

// cycle 2226: MLB 강수렴 픽 시즌 최장 streak — getConvergencePickBestStreak(KBO) 대응.
// cycle 2345: startDate/endDate 지정 시 그 범위 내 최장 streak (주간/월간 리뷰 용). 미지정 시 기존 시즌 전체 동작.
export async function getMlbConvergencePickBestStreak(
  minFactors = MLB_FACTOR_PICK_STRONG,
  startDate?: string,
  endDate?: string,
): Promise<{ type: 'win' | 'loss'; length: number } | null> {
  const results = await fetchMlbConvergencePickDetailedResults(minFactors, startDate, endDate);
  // fetchMlbConvergencePickDetailedResults 는 KBO 와 동일하게 game_date desc 로 정렬 반환 —
  // computeConvergenceBestStreak 는 정렬 순서 무관하게 전체를 스캔해 최장 streak 을 찾으므로 안전.
  return computeConvergenceBestStreak(results.map((r) => r.won));
}

// cycle 2226: MLB 강수렴 픽 홈/어웨이 분리 성적 — getConvergencePickHomeAwaySplit(KBO) 대응.
// cycle 2345: startDate/endDate 지정 시 해당 범위만 조회 (주간/월간 리뷰 용).
export async function getMlbConvergencePickHomeAwaySplit(
  minFactors = MLB_FACTOR_PICK_STRONG,
  startDate?: string,
  endDate?: string,
): Promise<{ home: { wins: number; losses: number }; away: { wins: number; losses: number } } | null> {
  const results = await fetchMlbConvergencePickDetailedResults(minFactors, startDate, endDate);
  return computeConvergenceHomeAwaySplit(results);
}

// cycle 2226: MLB 강수렴 픽 요일별 분리 성적 — getConvergencePickDayOfWeekSplit(KBO) 대응.
// cycle 2345: startDate/endDate 지정 시 해당 범위만 조회 (월간 리뷰 용).
export async function getMlbConvergencePickDayOfWeekSplit(
  minFactors = MLB_FACTOR_PICK_STRONG,
  startDate?: string,
  endDate?: string,
): Promise<Array<{ dayIndex: number; wins: number; losses: number }>> {
  const results = await fetchMlbConvergencePickDetailedResults(minFactors, startDate, endDate);
  return computeConvergenceDayOfWeekSplit(results);
}

// wave-559: 강수렴 픽 홈/어웨이 분리 성적 — 순수 함수 (테스트 가능)
// results: { favoredHome, won } 배열 (fetchConvergencePickDetailedResults 출력)
// minPicks: 홈 또는 어웨이 지목 경기 수가 이 값 미만이면 null 반환 (소표본 노이즈 차단)
export function computeConvergenceHomeAwaySplit(
  results: Array<{ favoredHome: boolean; won: boolean }>,
  minPicks = CONVERGENCE_HOME_AWAY_MIN_PICKS,
): { home: { wins: number; losses: number }; away: { wins: number; losses: number } } | null {
  let homeWins = 0, homeLosses = 0, awayWins = 0, awayLosses = 0;
  for (const r of results) {
    if (r.favoredHome) {
      if (r.won) homeWins++; else homeLosses++;
    } else {
      if (r.won) awayWins++; else awayLosses++;
    }
  }
  if (homeWins + homeLosses < minPicks || awayWins + awayLosses < minPicks) return null;
  return {
    home: { wins: homeWins, losses: homeLosses },
    away: { wins: awayWins, losses: awayLosses },
  };
}

export async function getConvergencePickHomeAwaySplit(
  minFactors = FACTOR_PICK_STRONG,
  // wave-600: startDate/endDate 지정 시 해당 범위만 조회 (월간 리뷰 용). 미지정 시 기존 동작 (시즌 전체).
  startDate?: string,
  endDate?: string,
): Promise<{ home: { wins: number; losses: number }; away: { wins: number; losses: number } } | null> {
  const results = await fetchConvergencePickDetailedResults(startDate ?? KBO_SEASON_START_DATE, minFactors, endDate);
  return computeConvergenceHomeAwaySplit(results);
}

export async function getConvergencePickTeamStats(
  minFactors = FACTOR_PICK_STRONG,
  // wave-603: startDate/endDate 지정 시 해당 범위만 조회 (월간/주간 리뷰 용, getConvergencePickHomeAwaySplit wave-600 동일 패턴). 미지정 시 기존 동작 (시즌 전체).
  startDate?: string,
  endDate?: string,
): Promise<Array<{ teamCode: TeamCode; wins: number; losses: number }>> {
  const results = await fetchConvergencePickDetailedResults(startDate ?? KBO_SEASON_START_DATE, minFactors, endDate);
  return computeConvergenceTeamStats(results);
}

// wave-599: YYYY-MM-DD → 요일 인덱스 (0=일 ~ 6=토) — 순수 함수, 타임존 무관 (달력 구성요소 직접 조립)
function weekdayIndexOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// wave-599: 강수렴 픽 요일별 분리 성적 — 순수 함수 (테스트 가능)
// results: { gameDate, won } 배열 (fetchConvergencePickDetailedResults 출력)
// minPicks: 표시 최소 경기 수 (소표본 노이즈 차단)
// 반환: 요일 인덱스(0=일~6=토) 오름차순 정렬 (팀별/홈어웨이와 달리 요일은 자연 순서 유지)
export function computeConvergenceDayOfWeekSplit(
  results: Array<{ gameDate: string; won: boolean }>,
  minPicks = CONVERGENCE_DAY_OF_WEEK_MIN_PICKS,
): Array<{ dayIndex: number; wins: number; losses: number }> {
  const map = new Map<number, { wins: number; losses: number }>();
  for (const r of results) {
    const dayIndex = weekdayIndexOf(r.gameDate);
    const s = map.get(dayIndex) ?? { wins: 0, losses: 0 };
    if (r.won) s.wins++;
    else s.losses++;
    map.set(dayIndex, s);
  }
  return Array.from(map.entries())
    .map(([dayIndex, { wins, losses }]) => ({ dayIndex, wins, losses }))
    .filter(s => s.wins + s.losses >= minPicks)
    .sort((a, b) => a.dayIndex - b.dayIndex);
}

export async function getConvergencePickDayOfWeekSplit(
  minFactors = FACTOR_PICK_STRONG,
  // wave-602: startDate/endDate 지정 시 해당 범위만 조회 (월간 리뷰 용, wave-600 홈/어웨이 동일 패턴). 미지정 시 기존 동작 (시즌 전체).
  startDate?: string,
  endDate?: string,
): Promise<Array<{ dayIndex: number; wins: number; losses: number }>> {
  const results = await fetchConvergencePickDetailedResults(startDate ?? KBO_SEASON_START_DATE, minFactors, endDate);
  return computeConvergenceDayOfWeekSplit(results);
}

// wave-570: wins/total 승률 % — Math.round(wins / total * 100) 9회 중복 추출
export function computeWinRatePct(wins: number, total: number): number {
  return Math.round(wins / total * 100);
}

// wave-576: homeWinProb(0-1) → % 정수 — Math.round(prob * 100) 17회 중복 추출
export function computeWinProbPct(prob: number): number {
  return Math.round(prob * 100);
}

// wave-574: 승률 pct → Tailwind 색상 클래스 — ACCURACY_GOOD_PCT/CONVERGENCE_BADGE_LOW_PCT 7회 inline ternary 추출
export function computeWinRateColorClass(
  pct: number,
  neutralClass = 'text-gray-500 dark:text-gray-400',
): string {
  if (pct >= ACCURACY_GOOD_PCT) return 'text-green-600 dark:text-green-400';
  if (pct <= CONVERGENCE_BADGE_LOW_PCT) return 'text-red-500 dark:text-red-400';
  return neutralClass;
}

// wave-604: 팩터 수치 → brand/orange 색상 클래스 — analysis/page.tsx 내 24+ 회 inline ternary 추출
// (wave-574가 승률 pct 버전만 추출하고 원본 팩터 수치 버전은 누락됐던 것 정리)
// 클수록 강세 (>=/<=, 원본 comparator 유지)
export function statColorClassHigherBetter(
  value: number,
  strong: number,
  weak: number,
  fallback = '',
): string {
  if (value >= strong) return 'text-brand-500 dark:text-brand-400';
  if (value <= weak) return 'text-orange-500 dark:text-orange-400';
  return fallback;
}

// 클수록 강세, strict comparator (>/< — Elo neutral-band 처럼 경계값 자체는 중립 처리하는 케이스)
export function statColorClassHigherBetterStrict(
  value: number,
  strong: number,
  weak: number,
  fallback = '',
): string {
  if (value > strong) return 'text-brand-500 dark:text-brand-400';
  if (value < weak) return 'text-orange-500 dark:text-orange-400';
  return fallback;
}

// 작을수록 강세 (</> — SP FIP/xFIP, 불펜 FIP 등 낮은 수치가 좋은 지표)
export function statColorClassLowerBetter(
  value: number,
  strong: number,
  weak: number,
  fallback = '',
): string {
  if (value < strong) return 'text-brand-500 dark:text-brand-400';
  if (value > weak) return 'text-orange-500 dark:text-orange-400';
  return fallback;
}

// wave-578: 이번 주 남은 경기 수렴 픽 ID Set — threshold 파라미터화 (wave-525/577 동일 패턴 통합)
export function computeUpcomingPickGameIds(
  games: Array<{ gameId: number; convergenceNetScore: number | null }>,
  threshold: number,
): Set<number> {
  return new Set(
    games
      .filter((g) => g.convergenceNetScore != null && Math.abs(g.convergenceNetScore) >= threshold)
      .map((g) => g.gameId),
  );
}

// wave-568: 이번 주 수렴 픽 성적 집계 — 순수 함수 (wave-405/541/567 동일 reduce 통합)
// threshold: FACTOR_PICK_MIN_FACTORS / FACTOR_PICK_STRONG / FACTOR_PICK_COMPLETE 중 1개
// games: convergenceNetScore + homeScore + awayScore 포함 경기 배열 (종료 경기만 의미 있음)
export function computeWeeklyConvergenceRecord(
  games: Array<{ convergenceNetScore: number | null; homeScore: number | null; awayScore: number | null }>,
  threshold: number,
): { wins: number; losses: number } {
  return games.reduce(
    (acc, g) => {
      if (g.convergenceNetScore === null || Math.abs(g.convergenceNetScore) < threshold) return acc;
      if (g.homeScore === null || g.awayScore === null) return acc;
      const favoredHome = g.convergenceNetScore > 0;
      const favWon = favoredHome ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
      return { wins: acc.wins + (favWon ? 1 : 0), losses: acc.losses + (favWon ? 0 : 1) };
    },
    { wins: 0, losses: 0 },
  );
}

// wave-583: convergenceNetScore → isTopPick(완전수렴) / isStrongPick(강수렴) 플래그 — wave-579/581 어제/이번주 경기 동일 2줄 패턴 추출
export function computeConvergencePickFlags(
  convergenceNetScore: number | null,
): { isTopPick: boolean; isStrongPick: boolean } {
  if (convergenceNetScore == null) return { isTopPick: false, isStrongPick: false };
  const abs = Math.abs(convergenceNetScore);
  return {
    isTopPick: abs >= FACTOR_PICK_COMPLETE,
    isStrongPick: abs >= FACTOR_PICK_STRONG,
  };
}

// wave-580: 수렴 픽 결과 집계 — homeScore/awayScore 로 실제 승자 재산출 (computeWeeklyConvergenceRecord 와 동일 판정)
// cycle 2299 fix: 과거 isCorrect(모델 자체 예측 적중 여부) 기반 집계는 수렴 픽과 모델 예측이
// 엇갈리는 경우(modelAgrees=false) "어제 수렴 픽" 배지가 실제와 반대로 표시되는 silent 오류였음.
// 미종료 경기(homeScore/awayScore null) 제외. total 포함 반환 (어제 배지 표시 조건)
export function computeConvergenceRecordFromScores(
  games: Array<{ convergenceNetScore: number | null; homeScore: number | null; awayScore: number | null }>,
  threshold: number,
): { wins: number; losses: number; total: number } {
  return games.reduce(
    (acc, g) => {
      if (g.convergenceNetScore === null || Math.abs(g.convergenceNetScore) < threshold) return acc;
      if (g.homeScore === null || g.awayScore === null) return acc;
      const favoredHome = g.convergenceNetScore > 0;
      const favWon = favoredHome ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
      return {
        wins: acc.wins + (favWon ? 1 : 0),
        losses: acc.losses + (favWon ? 0 : 1),
        total: acc.total + 1,
      };
    },
    { wins: 0, losses: 0, total: 0 },
  );
}
