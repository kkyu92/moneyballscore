import { createClient } from '@/lib/supabase/server';
import {
  assertSelectOk,
  toKSTDateString,
  CONVERGENCE_RECORD_LOOKBACK_DAYS,
  CONVERGENCE_RECORD_RECENT_LIMIT,
  COMPOSITE_DUEL_MIN_VALID,
  FACTOR_PICK_MIN_FACTORS,
  FACTOR_PICK_STRONG,
  FACTOR_PICK_COMPLETE,
  KBO_SEASON_START_DATE,
  PRODUCTION_COHORT_RULES,
  CONVERGENCE_TEAM_STATS_MIN_PICKS,
  CONVERGENCE_HOME_AWAY_MIN_PICKS,
  CONVERGENCE_DAY_OF_WEEK_MIN_PICKS,
  CONVERGENCE_STREAK_MIN_LENGTH,
  ACCURACY_GOOD_PCT,
  CONVERGENCE_BADGE_LOW_PCT,
  type TeamCode,
  type SelectResult,
} from '@moneyball/shared';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';

interface ConvergenceGameRow {
  id: number;
  game_date: string;
  game_time: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
    prediction_type: string;
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

async function fetchConvergencePickResults(
  cutoff: string,
  limit: number,
  minFactors: number,
  // wave-584: endDate 지정 시 해당 날짜까지만 조회 (주간 리뷰 수렴 픽 성적 용).
  // 미지정 시 기존 동작 (today 미만).
  endDate?: string,
): Promise<boolean[]> {
  const today = toKSTDateString();
  const supabase = await createClient();
  let query = supabase
    .from('games')
    .select(`
      id, game_date, game_time, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        prediction_type,
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

  const { data } = assertSelectOk(gamesResult, 'fetchConvergencePickResults');
  if (!data) return [];

  const results: boolean[] = [];
  for (const row of data as unknown as ConvergenceGameRow[]) {
    if (results.length >= limit) break;
    const pred = row.predictions?.[0];
    if (!pred || row.home_score === null || row.away_score === null) continue;
    const homeCode = row.home_team?.code as TeamCode | undefined;
    const awayCode = row.away_team?.code as TeamCode | undefined;
    if (!homeCode || !awayCode) continue;

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
    });

    if (duel.validCount < COMPOSITE_DUEL_MIN_VALID) continue;
    if (Math.abs(duel.netScore) < minFactors) continue;

    const favoredHome = duel.netScore > 0;
    results.push(favoredHome ? row.home_score > row.away_score : row.away_score > row.home_score);
  }

  return results;
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
  const cutoff = startDate ?? new Date(Date.now() - CONVERGENCE_RECORD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
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
  const cutoff = startDate ?? new Date(Date.now() - CONVERGENCE_RECORD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
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
export function computeConvergenceTeamStats(
  results: Array<{ favoredTeam: TeamCode; won: boolean }>,
  minPicks = CONVERGENCE_TEAM_STATS_MIN_PICKS,
): Array<{ teamCode: TeamCode; wins: number; losses: number }> {
  const map = new Map<TeamCode, { wins: number; losses: number }>();
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
): Promise<Array<{ favoredTeam: TeamCode; favoredHome: boolean; won: boolean; gameDate: string }>> {
  const today = toKSTDateString();
  const supabase = await createClient();
  const gamesResult = (await supabase
    .from('games')
    .select(`
      id, game_date, game_time, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        prediction_type,
        home_elo, away_elo, home_recent_form, away_recent_form,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
        home_sfr, away_sfr, home_war_total, away_war_total
      )
    `)
    .gte('game_date', cutoff)
    .lt('game_date', today)
    .not('home_score', 'is', null)
    .eq('predictions.prediction_type', 'pre_game')
    .in('predictions.scoring_rule', PRODUCTION_COHORT_RULES)
    .order('game_date', { ascending: false })
    .order('game_time', { ascending: true })) as SelectResult<ConvergenceGameRow[]>;

  const { data } = assertSelectOk(gamesResult, 'fetchConvergencePickDetailedResults');
  if (!data) return [];

  const results: Array<{ favoredTeam: TeamCode; favoredHome: boolean; won: boolean; gameDate: string }> = [];
  for (const row of data as unknown as ConvergenceGameRow[]) {
    const pred = row.predictions?.[0];
    if (!pred || row.home_score === null || row.away_score === null) continue;
    const homeCode = row.home_team?.code as TeamCode | undefined;
    const awayCode = row.away_team?.code as TeamCode | undefined;
    if (!homeCode || !awayCode) continue;

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
    });

    if (duel.validCount < COMPOSITE_DUEL_MIN_VALID) continue;
    if (Math.abs(duel.netScore) < minFactors) continue;

    const favoredHome = duel.netScore > 0;
    const favoredTeam = favoredHome ? homeCode : awayCode;
    const won = favoredHome ? row.home_score > row.away_score : row.away_score > row.home_score;
    results.push({ favoredTeam, favoredHome, won, gameDate: row.game_date });
  }

  return results;
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
): Promise<{ home: { wins: number; losses: number }; away: { wins: number; losses: number } } | null> {
  const results = await fetchConvergencePickDetailedResults(KBO_SEASON_START_DATE, minFactors);
  return computeConvergenceHomeAwaySplit(results);
}

export async function getConvergencePickTeamStats(
  minFactors = FACTOR_PICK_STRONG,
): Promise<Array<{ teamCode: TeamCode; wins: number; losses: number }>> {
  const results = await fetchConvergencePickDetailedResults(KBO_SEASON_START_DATE, minFactors);
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
): Promise<Array<{ dayIndex: number; wins: number; losses: number }>> {
  const results = await fetchConvergencePickDetailedResults(KBO_SEASON_START_DATE, minFactors);
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

// wave-580: isCorrect 사전 집계 기반 수렴 픽 결과 집계 — computeWeeklyConvergenceRecord(homeScore/awayScore) 와 구분
// isCorrect=null 미종료 경기 제외. total 포함 반환 (어제 배지 표시 조건)
export function computeConvergenceRecordFromIsCorrect(
  games: Array<{ convergenceNetScore: number | null; isCorrect: boolean | null }>,
  threshold: number,
): { wins: number; losses: number; total: number } {
  return games.reduce(
    (acc, g) => {
      if (g.convergenceNetScore === null || Math.abs(g.convergenceNetScore) < threshold) return acc;
      if (g.isCorrect === null) return acc;
      return {
        wins: acc.wins + (g.isCorrect ? 1 : 0),
        losses: acc.losses + (g.isCorrect ? 0 : 1),
        total: acc.total + 1,
      };
    },
    { wins: 0, losses: 0, total: 0 },
  );
}
