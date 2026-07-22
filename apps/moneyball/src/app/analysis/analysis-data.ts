import { createClient } from '@/lib/supabase/server';
import {
  ANALYSIS_TOP_FACTORS_LIMIT,
  ANALYSIS_UPCOMING_LIMIT,
  assertSelectOk,
  ELO_DIVIDER,
  ELO_NEUTRAL,
  ELO_NEUTRAL_WIN_PCT,
  NEUTRAL_FACTOR,
  HOME_ELO_BONUS,
  PRODUCTION_COHORT_RULES,
  STANDINGS_BOTTOM_TIER,
  STANDINGS_TOP_TIER,
  toKSTDateString,
  winnerProbOf,
  WINNER_PROB_CONFIDENT,
  COMPOSITE_DUEL_MIN_VALID,
  KBO_TEAMS,
  FACTOR_PICK_STRONG,
  type SelectResult,
  type TeamCode,
} from '@moneyball/shared';
import { selectBigMatch, type BigMatchCandidate } from '@moneyball/kbo-data';
import { getYesterdayKSTDateString } from '@/lib/predictions/yesterdayDate';
import { getCurrentWeek } from '@/lib/reviews/computeWeekRange';
import { CURRENT_MODEL_FILTER } from '@/config/model';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';
import { FACTOR_LABELS } from '@/lib/predictions/factorLabels';

interface TodayAllRow {
  id: number;
  game_time: string | null;
  external_game_id: string | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
    confidence: number;
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
    prediction_type: string;
    reasoning: { homeWinProb?: number | null } | null;
    predicted_winner_team: { code: string | null } | null;
    factors: Record<string, number> | null;
  }>;
}

export interface TodayGameCard {
  gameId: number;
  gameTime: string | null;
  homeCode: TeamCode;
  awayCode: TeamCode;
  predictedWinnerCode: TeamCode | null;
  homeWinProb: number;
  confidence: number;
  /** wave-469: impact 포함 — |factor value - NEUTRAL_FACTOR|, 3-tier 색상 기준. */
  topFactors: Array<{ label: string; favoredCode: TeamCode; impact: number }>;
  /** wave-321: Elo & 폼 비교 배지 · wave-444: 팩터 수렴 픽 Elo 행 격차(Δ) 표시 */
  homeElo?: number;
  awayElo?: number;
  homeRecentForm?: number;
  awayRecentForm?: number;
  /** wave-325: 현재 KBO 순위 배지 · wave-436: 팩터 수렴 픽 순위 표시 */
  homeRank?: number;
  awayRank?: number;
  /** wave-331: 최근 10경기 배지 */
  homeRecent10?: { wins: number; losses: number };
  awayRecent10?: { wins: number; losses: number };
  /** wave-333: 올 시즌 상대전적 배지 (홈팀 기준 승수/패수) · wave-414: 팩터 수렴 픽 대결 행 표시 · wave-428: 패수 추가 */
  h2hHomeWins?: number;
  h2hAwayWins?: number;
  /** wave-329: 홈/원정 시즌 기록 배지 · wave-434: 팩터 수렴 픽 상세 행 */
  homeTeamVenue?: { homeWins: number; homeLosses: number; awayWins: number; awayLosses: number };
  awayTeamVenue?: { homeWins: number; homeLosses: number; awayWins: number; awayLosses: number };
  /** wave-335: 선발투수 배지 · wave-438: 팩터 수렴 픽 SP 비수렴 시 이름 표시 */
  homeSP?: string;
  awaySP?: string;
  /** wave-337: 선발투수 FIP 배지 · wave-440: 팩터 수렴 픽 xFIP 행 회귀/반등 방향 표시 (FIP-xFIP 갭 계산용) · wave-446: 팩터 수렴 픽 선발 FIP 행 격차(Δ) 표시 */
  homeSPFip?: number;
  awaySPFip?: number;
  /** wave-353: 선발투수 xFIP 갭 배지 · wave-413: 팩터 수렴 픽 xFIP 대결 수치 표시 · wave-440: 수렴 픽 xFIP 행 회귀/반등 방향 표시 */
  homeSPXfip?: number;
  awaySPXfip?: number;
  /** wave-339: 타선 wOBA 배지 · wave-442: 팩터 수렴 픽 타선 wOBA 행 격차(Δ) 표시 */
  homeLineupWoba?: number;
  awayLineupWoba?: number;
  /** wave-341: 불펜 FIP 배지 · wave-442: 팩터 수렴 픽 불펜 FIP 행 격차(Δ) 표시 */
  homeBullpenFip?: number;
  awayBullpenFip?: number;
  /** wave-343: 수비 SFR 배지 · wave-446: 팩터 수렴 픽 수비 SFR 행 격차(Δ) 표시 */
  homeSfr?: number;
  awaySfr?: number;
  /** wave-345: 팀 WAR 배지 · wave-444: 팩터 수렴 픽 WAR 행 격차(Δ) 표시 */
  homeWar?: number;
  awayWar?: number;
}

export interface TodayAnalysisData {
  bigMatchId: number | null;
  bigMatchMode: string | undefined;
  bigMatchHomeCode: TeamCode | null;
  bigMatchAwayCode: TeamCode | null;
  games: TodayGameCard[];
}

export async function getTodayAnalysisData(): Promise<TodayAnalysisData> {
  const supabase = await createClient();
  const today = toKSTDateString();

  const gamesResult = (await supabase
    .from('games')
    .select(`
      id, game_time, external_game_id,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        confidence, home_elo, away_elo, home_recent_form, away_recent_form,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip, home_lineup_woba, away_lineup_woba,
        home_bullpen_fip, away_bullpen_fip, home_sfr, away_sfr,
        home_war_total, away_war_total,
        prediction_type, reasoning, factors,
        predicted_winner_team:teams!predictions_predicted_winner_fkey(code)
      )
    `)
    .eq('game_date', today)
    .eq('predictions.prediction_type', 'pre_game')
    .in('predictions.scoring_rule', PRODUCTION_COHORT_RULES)
    .order('game_time', { ascending: true })) as SelectResult<TodayAllRow[]>;

  const { data: rawGames } = assertSelectOk(gamesResult, 'analysis getTodayAnalysisData');

  if (!rawGames) {
    return { bigMatchId: null, bigMatchMode: 'no-games', bigMatchHomeCode: null, bigMatchAwayCode: null, games: [] };
  }

  const rows = rawGames as unknown as TodayAllRow[];

  // wave-335: 선발투수 배지 — sp_confirmation_log 에서 오늘 선발투수 이름 조회
  const spResult = await supabase
    .from('sp_confirmation_log')
    .select('external_game_id, home_sp_name, away_sp_name')
    .eq('game_date', today)
    .order('observed_at', { ascending: false });
  const spMap = new Map<string, { homeSP: string; awaySP: string }>();
  for (const row of (spResult.data ?? []) as Array<{ external_game_id: string; home_sp_name: string | null; away_sp_name: string | null }>) {
    if (!row.external_game_id || spMap.has(row.external_game_id)) continue;
    if (row.home_sp_name && row.away_sp_name) {
      spMap.set(row.external_game_id, { homeSP: row.home_sp_name, awaySP: row.away_sp_name });
    }
  }

  const candidates: BigMatchCandidate[] = [];
  const cards: TodayGameCard[] = [];

  for (const game of rows) {
    const pred = game.predictions?.[0];
    if (!pred) continue;
    const homeCode = game.home_team?.code as TeamCode | undefined;
    const awayCode = game.away_team?.code as TeamCode | undefined;
    if (!homeCode || !awayCode) continue;

    candidates.push({
      gameId: game.id,
      homeTeam: homeCode,
      awayTeam: awayCode,
      homeElo: pred.home_elo ?? ELO_NEUTRAL,
      awayElo: pred.away_elo ?? ELO_NEUTRAL,
      homeRecentForm: pred.home_recent_form ?? ELO_NEUTRAL_WIN_PCT,
      awayRecentForm: pred.away_recent_form ?? ELO_NEUTRAL_WIN_PCT,
      confidence: pred.confidence ?? ELO_NEUTRAL_WIN_PCT,
    });

    const topFactors: TodayGameCard['topFactors'] = [];
    if (pred.factors) {
      const sorted = Object.entries(pred.factors)
        .filter(([key]) => key in FACTOR_LABELS)
        .map(([key, val]) => ({ key, impact: Math.abs((val as number) - NEUTRAL_FACTOR), favorable: (val as number) > NEUTRAL_FACTOR ? homeCode : awayCode }))
        .sort((a, b) => b.impact - a.impact)
        .slice(0, ANALYSIS_TOP_FACTORS_LIMIT);
      for (const f of sorted) {
        topFactors.push({ label: FACTOR_LABELS[f.key], favoredCode: f.favorable, impact: f.impact });
      }
    }

    const spData = game.external_game_id ? spMap.get(game.external_game_id) : undefined;
    cards.push({
      gameId: game.id,
      gameTime: game.game_time,
      homeCode,
      awayCode,
      predictedWinnerCode: (pred.predicted_winner_team?.code as TeamCode | null) ?? null,
      homeWinProb: winnerProbOf(pred.reasoning?.homeWinProb),
      confidence: pred.confidence ?? ELO_NEUTRAL_WIN_PCT,
      topFactors,
      homeElo: pred.home_elo ?? undefined,
      awayElo: pred.away_elo ?? undefined,
      homeRecentForm: pred.home_recent_form ?? undefined,
      awayRecentForm: pred.away_recent_form ?? undefined,
      homeSP: spData?.homeSP,
      awaySP: spData?.awaySP,
      homeSPFip: pred.home_sp_fip ?? undefined,
      awaySPFip: pred.away_sp_fip ?? undefined,
      homeSPXfip: pred.home_sp_xfip ?? undefined,
      awaySPXfip: pred.away_sp_xfip ?? undefined,
      homeLineupWoba: pred.home_lineup_woba ?? undefined,
      awayLineupWoba: pred.away_lineup_woba ?? undefined,
      homeBullpenFip: pred.home_bullpen_fip ?? undefined,
      awayBullpenFip: pred.away_bullpen_fip ?? undefined,
      homeSfr: pred.home_sfr ?? undefined,
      awaySfr: pred.away_sfr ?? undefined,
      homeWar: pred.home_war_total ?? undefined,
      awayWar: pred.away_war_total ?? undefined,
    });
  }

  const bigMatchResult = selectBigMatch(candidates);
  const bigMatchRow = bigMatchResult.bigMatchGameId
    ? rows.find((g) => g.id === bigMatchResult.bigMatchGameId)
    : null;

  const sortedCards = [...cards].sort((a, b) => b.confidence - a.confidence);

  return {
    bigMatchId: bigMatchResult.bigMatchGameId ?? null,
    bigMatchMode: bigMatchResult.mode,
    bigMatchHomeCode: bigMatchRow ? (bigMatchRow.home_team?.code as TeamCode | null) : null,
    bigMatchAwayCode: bigMatchRow ? (bigMatchRow.away_team?.code as TeamCode | null) : null,
    games: sortedCards,
  };
}

export interface YesterdayGameCard {
  gameId: number;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: TeamCode | null;
  homeWinProb: number;
  isCorrect: boolean | null;
  /** wave-550: 팩터 수렴 net score (null = 데이터 부족) */
  convergenceNetScore: number | null;
}

interface YesterdayGameRow {
  id: number;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
    prediction_type: string;
    is_correct: boolean | null;
    reasoning: { homeWinProb?: number | null } | null;
    predicted_winner_team: { code: string | null } | null;
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

export async function getYesterdayGames(): Promise<YesterdayGameCard[]> {
  const supabase = await createClient();
  const yesterday = getYesterdayKSTDateString();

  const gamesResult = (await supabase
    .from('games')
    .select(`
      id, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        prediction_type, is_correct, reasoning,
        home_elo, away_elo, home_recent_form, away_recent_form,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
        home_sfr, away_sfr, home_war_total, away_war_total,
        predicted_winner_team:teams!predictions_predicted_winner_fkey(code)
      )
    `)
    .eq('game_date', yesterday)
    .eq('predictions.prediction_type', 'pre_game')
    .in('predictions.scoring_rule', PRODUCTION_COHORT_RULES)
    .order('game_time', { ascending: true })) as SelectResult<YesterdayGameRow[]>;
  const { data } = assertSelectOk(gamesResult, 'analysis getYesterdayGames');

  if (!data) return [];

  const rows = data as unknown as YesterdayGameRow[];
  const cards: YesterdayGameCard[] = [];
  for (const row of rows) {
    const pred = row.predictions?.[0];
    if (!pred) continue;
    const homeCode = row.home_team?.code as TeamCode | undefined;
    const awayCode = row.away_team?.code as TeamCode | undefined;
    if (!homeCode || !awayCode) continue;
    // wave-550: 어제 경기에도 팩터 수렴 점수 계산 (ThisWeekPreviousGames 패턴 동일, H2H 제외)
    const yesterdayDuel = computeCompositeDuel({
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
    const yesterdayDuelValid = yesterdayDuel.validCount >= COMPOSITE_DUEL_MIN_VALID;
    cards.push({
      gameId: row.id,
      homeCode,
      awayCode,
      homeScore: row.home_score,
      awayScore: row.away_score,
      predictedWinnerCode: (pred.predicted_winner_team?.code as TeamCode | null) ?? null,
      homeWinProb: winnerProbOf(pred.reasoning?.homeWinProb),
      isCorrect: pred.is_correct,
      convergenceNetScore: yesterdayDuelValid ? yesterdayDuel.netScore : null,
    });
  }
  return cards;
}

export interface ThisWeekGameCard {
  gameId: number;
  gameDate: string;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: TeamCode | null;
  confidence: number | null;
  isCorrect: boolean | null;
  /** wave-405: 팩터 수렴 net score (null = 데이터 부족) */
  convergenceNetScore: number | null;
}

interface ThisWeekGameRow {
  id: number;
  game_date: string;
  game_time: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
    prediction_type: string;
    confidence: number | null;
    is_correct: boolean | null;
    predicted_winner_team: { code: string | null } | null;
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

export async function getThisWeekPreviousGames(): Promise<ThisWeekGameCard[]> {
  const yesterday = getYesterdayKSTDateString();
  const currentWeek = getCurrentWeek();
  if (currentWeek.startDate >= yesterday) return [];

  const supabase = await createClient();
  const gamesResult = (await supabase
    .from('games')
    .select(`
      id, game_date, game_time, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        prediction_type, confidence, is_correct,
        home_elo, away_elo, home_recent_form, away_recent_form,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
        home_sfr, away_sfr, home_war_total, away_war_total,
        predicted_winner_team:teams!predictions_predicted_winner_fkey(code)
      )
    `)
    .gte('game_date', currentWeek.startDate)
    .lt('game_date', yesterday)
    .eq('predictions.prediction_type', 'pre_game')
    .in('predictions.scoring_rule', PRODUCTION_COHORT_RULES)
    .order('game_date', { ascending: false })
    .order('game_time', { ascending: true })) as SelectResult<ThisWeekGameRow[]>;

  const { data } = assertSelectOk(gamesResult, 'analysis getThisWeekPreviousGames');
  if (!data) return [];

  const rows = data as unknown as ThisWeekGameRow[];
  const cards: ThisWeekGameCard[] = [];
  for (const row of rows) {
    const pred = row.predictions?.[0];
    if (!pred) continue;
    const homeCode = row.home_team?.code as TeamCode | undefined;
    const awayCode = row.away_team?.code as TeamCode | undefined;
    if (!homeCode || !awayCode) continue;
    // wave-405: 이번 주 팩터 수렴 성적 — 과거 경기에도 동일 로직 적용 (H2H 제외)
    const weekDuel = computeCompositeDuel({
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
    const weekDuelValid = weekDuel.validCount >= COMPOSITE_DUEL_MIN_VALID;
    cards.push({
      gameId: row.id,
      gameDate: row.game_date,
      homeCode,
      awayCode,
      homeScore: row.home_score,
      awayScore: row.away_score,
      predictedWinnerCode: (pred.predicted_winner_team?.code as TeamCode | null) ?? null,
      confidence: pred.confidence,
      isCorrect: pred.is_correct,
      convergenceNetScore: weekDuelValid ? weekDuel.netScore : null,
    });
  }
  return cards;
}

export interface UpcomingScheduledGame {
  gameId: number;
  gameDate: string;
  gameTime: string | null;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeWinProb: number;
  modelHomeWinProb: number | null; // wave-313: full-model prediction (null = not yet generated)
  /** wave-475: 팩터 N:M 균형 — computeCompositeDuel 기준 (null = 데이터 부족) */
  factorFavoredCount: number | null;
  factorAgainstCount: number | null;
  convergenceNetScore: number | null;
  /** wave-484: 비수렴 경기 단축 레이블 (wave-480 DETAIL / wave-482 LIST TODAY 대칭) */
  factorFavoredSlugs: string[] | null;
  /** wave-517: SP FIP 직접 대결 배지용 (가중치 1위, 15%) */
  homeSPFip: number | null;
  awaySPFip: number | null;
  /** wave-517: wOBA 타선 직접 대결 배지용 (가중치 1위 공동, 15%) */
  homeLineupWoba: number | null;
  awayLineupWoba: number | null;
  /** wave-521: 불펜FIP 직접 대결 배지용 (가중치 10%) */
  homeBullpenFip: number | null;
  awayBullpenFip: number | null;
  /** wave-521: Elo 직접 대결 배지용 (가중치 10%) */
  homeElo: number | null;
  awayElo: number | null;
  /** wave-521: WAR 직접 대결 배지용 (가중치 8%) */
  homeWar: number | null;
  awayWar: number | null;
  /** wave-521: 수비SFR 직접 대결 배지용 (가중치 5%) */
  homeSfr: number | null;
  awaySfr: number | null;
  /** wave-521: 최근폼 직접 대결 배지용 (가중치 10%) */
  homeRecentForm: number | null;
  awayRecentForm: number | null;
  /** wave-521: xFIP 직접 대결 배지용 (가중치 5%) */
  homeSPXfip: number | null;
  awaySPXfip: number | null;
  /** wave-537: 수렴 픽 경기 한 줄 요약 (buildGameOverview summary) */
  gameOverviewSummary: string | null;
}

export async function getThisWeekRemainingGames(): Promise<UpcomingScheduledGame[]> {
  const today = toKSTDateString();
  const currentWeek = getCurrentWeek();
  if (currentWeek.endDate <= today) return [];

  const supabase = await createClient();
  // tomorrow = today + 1 day
  const tomorrowDate = new Date(`${today}T12:00:00Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);
  if (tomorrowStr > currentWeek.endDate) return [];

  const [scheduleResult, eloResult] = await Promise.all([
    supabase
      .from('games')
      .select(`
        id, game_date, game_time,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code)
      `)
      .eq('status', 'scheduled')
      .gte('game_date', tomorrowStr)
      .lte('game_date', currentWeek.endDate)
      .order('game_date', { ascending: true })
      .order('game_time', { ascending: true })
      .limit(ANALYSIS_UPCOMING_LIMIT),
    supabase
      .from('predictions')
      .select(`
        game_id, home_elo, away_elo, home_win_prob,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
        home_sfr, away_sfr, home_war_total, away_war_total,
        home_recent_form, away_recent_form,
        game:games!predictions_game_id_fkey(
          home_team:teams!games_home_team_id_fkey(code),
          away_team:teams!games_away_team_id_fkey(code)
        )
      `)
      .eq('prediction_type', 'pre_game')
      .in('scoring_rule', PRODUCTION_COHORT_RULES)
      .not('home_elo', 'is', null)
      .order('id', { ascending: false })
      .limit(ANALYSIS_UPCOMING_LIMIT),
  ]);

  const { data: scheduleData } = assertSelectOk(scheduleResult, 'analysis getThisWeekRemainingGames');
  if (!scheduleData || scheduleData.length === 0) return [];

  const eloMap = new Map<string, number>();
  const modelProbMap = new Map<number, number>(); // wave-313: game_id → home_win_prob
  // wave-475: game_id → factor columns for composite duel computation
  type FactorData475 = {
    homeSpFip: number | null; awaySpFip: number | null;
    homeSpXfip: number | null; awaySpXfip: number | null;
    homeLineupWoba: number | null; awayLineupWoba: number | null;
    homeBullpenFip: number | null; awayBullpenFip: number | null;
    homeSfr: number | null; awaySfr: number | null;
    homeWar: number | null; awayWar: number | null;
    homeRecentForm: number | null; awayRecentForm: number | null;
  };
  const factorDataMap = new Map<number, FactorData475>();
  if (eloResult.data) {
    type EloRow = { game_id: number | null; home_elo: number | null; away_elo: number | null; home_win_prob: number | null; home_sp_fip: number | null; away_sp_fip: number | null; home_sp_xfip: number | null; away_sp_xfip: number | null; home_lineup_woba: number | null; away_lineup_woba: number | null; home_bullpen_fip: number | null; away_bullpen_fip: number | null; home_sfr: number | null; away_sfr: number | null; home_war_total: number | null; away_war_total: number | null; home_recent_form: number | null; away_recent_form: number | null; game: { home_team: { code: string } | null; away_team: { code: string } | null } | null };
    for (const row of eloResult.data as unknown as EloRow[]) {
      const hc = row.game?.home_team?.code;
      const ac = row.game?.away_team?.code;
      if (hc && row.home_elo != null && !eloMap.has(hc)) eloMap.set(hc, row.home_elo);
      if (ac && row.away_elo != null && !eloMap.has(ac)) eloMap.set(ac, row.away_elo);
      if (row.game_id != null && row.home_win_prob != null && !modelProbMap.has(row.game_id)) {
        modelProbMap.set(row.game_id, row.home_win_prob);
      }
      // wave-475: store factor data per game_id (first occurrence only, latest prediction)
      if (row.game_id != null && !factorDataMap.has(row.game_id)) {
        factorDataMap.set(row.game_id, {
          homeSpFip: row.home_sp_fip, awaySpFip: row.away_sp_fip,
          homeSpXfip: row.home_sp_xfip, awaySpXfip: row.away_sp_xfip,
          homeLineupWoba: row.home_lineup_woba, awayLineupWoba: row.away_lineup_woba,
          homeBullpenFip: row.home_bullpen_fip, awayBullpenFip: row.away_bullpen_fip,
          homeSfr: row.home_sfr, awaySfr: row.away_sfr,
          homeWar: row.home_war_total, awayWar: row.away_war_total,
          homeRecentForm: row.home_recent_form, awayRecentForm: row.away_recent_form,
        });
      }
    }
  }

  type ScheduleRow = { id: number; game_date: string; game_time: string | null; home_team: { code: string } | null; away_team: { code: string } | null };
  const rows = scheduleData as unknown as ScheduleRow[];
  const result: UpcomingScheduledGame[] = [];
  for (const r of rows) {
    const homeCode = r.home_team?.code as TeamCode | undefined;
    const awayCode = r.away_team?.code as TeamCode | undefined;
    if (!homeCode || !awayCode) continue;
    const homeElo = eloMap.get(homeCode) ?? ELO_NEUTRAL;
    const awayElo = eloMap.get(awayCode) ?? ELO_NEUTRAL;
    const homeWinProb = 1 / (1 + Math.pow(10, (awayElo - homeElo - HOME_ELO_BONUS) / ELO_DIVIDER));
    // wave-475: compute factor N:M for upcoming games
    let factorFavoredCount: number | null = null;
    let factorAgainstCount: number | null = null;
    let convergenceNetScore: number | null = null;
    let factorFavoredSlugs: string[] | null = null;
    const fd = factorDataMap.get(r.id);
    if (fd) {
      const duel = computeCompositeDuel({
        homeCode,
        homeLineupWoba: fd.homeLineupWoba, awayLineupWoba: fd.awayLineupWoba,
        homeSfr: fd.homeSfr, awaySfr: fd.awaySfr,
        homeBullpenFip: fd.homeBullpenFip, awayBullpenFip: fd.awayBullpenFip,
        homeSPFip: fd.homeSpFip, awaySPFip: fd.awaySpFip,
        homeSPXfip: fd.homeSpXfip, awaySPXfip: fd.awaySpXfip,
        homeWar: fd.homeWar, awayWar: fd.awayWar,
        homeElo: eloMap.get(homeCode), awayElo: eloMap.get(awayCode),
        homeRecentForm: fd.homeRecentForm ?? undefined, awayRecentForm: fd.awayRecentForm ?? undefined,
      });
      if (duel.validCount >= COMPOSITE_DUEL_MIN_VALID) {
        convergenceNetScore = duel.netScore;
        const favoredHome = duel.netScore > 0;
        factorFavoredCount = favoredHome ? duel.homeWins : duel.awayWins;
        factorAgainstCount = favoredHome ? duel.awayWins : duel.homeWins;
        // wave-484: 비수렴 단축 레이블 — 우세 팩터 slug 박제
        factorFavoredSlugs = favoredHome ? duel.homeFavoredSlugs : duel.awayFavoredSlugs;
      }
    }
    result.push({
      gameId: r.id,
      gameDate: r.game_date,
      gameTime: r.game_time,
      homeCode,
      awayCode,
      homeWinProb,
      modelHomeWinProb: modelProbMap.get(r.id) ?? null,
      factorFavoredCount,
      factorAgainstCount,
      convergenceNetScore,
      factorFavoredSlugs,
      // wave-517: SP FIP + wOBA 직접 대결 배지용
      homeSPFip: fd?.homeSpFip ?? null,
      awaySPFip: fd?.awaySpFip ?? null,
      homeLineupWoba: fd?.homeLineupWoba ?? null,
      awayLineupWoba: fd?.awayLineupWoba ?? null,
      // wave-521: 불펜FIP + Elo + WAR + SFR + 최근폼 + xFIP 직접 대결 배지용
      homeBullpenFip: fd?.homeBullpenFip ?? null,
      awayBullpenFip: fd?.awayBullpenFip ?? null,
      homeElo: eloMap.get(homeCode) ?? null,
      awayElo: eloMap.get(awayCode) ?? null,
      homeWar: fd?.homeWar ?? null,
      awayWar: fd?.awayWar ?? null,
      homeSfr: fd?.homeSfr ?? null,
      awaySfr: fd?.awaySfr ?? null,
      homeRecentForm: fd?.homeRecentForm ?? null,
      awayRecentForm: fd?.awayRecentForm ?? null,
      homeSPXfip: fd?.homeSpXfip ?? null,
      awaySPXfip: fd?.awaySpXfip ?? null,
      // wave-537: TOP픽/강수렴픽(FACTOR_PICK_STRONG=8) 경기에만 buildGameOverview summary 생성
      // wave-538: FACTOR_PICK_MIN_FACTORS(7) → FACTOR_PICK_STRONG(8) — UI 표시 조건과 일치
      gameOverviewSummary: (() => {
        if (convergenceNetScore == null || Math.abs(convergenceNetScore) < FACTOR_PICK_STRONG) return null;
        const homeTeamName = KBO_TEAMS[homeCode]?.name ?? homeCode;
        const awayTeamName = KBO_TEAMS[awayCode]?.name ?? awayCode;
        const winProb = modelProbMap.get(r.id) ?? homeWinProb;
        const { summary } = buildGameOverview({
          homeWinProb: winProb,
          homeSPFip: fd?.homeSpFip ?? null,
          awaySPFip: fd?.awaySpFip ?? null,
          homeWoba: fd?.homeLineupWoba ?? null,
          awayWoba: fd?.awayLineupWoba ?? null,
          homeBullpenFip: fd?.homeBullpenFip ?? null,
          awayBullpenFip: fd?.awayBullpenFip ?? null,
          homeWar: fd?.homeWar ?? null,
          awayWar: fd?.awayWar ?? null,
          homeRecentForm: fd?.homeRecentForm ?? null,
          awayRecentForm: fd?.awayRecentForm ?? null,
          homeElo: eloMap.get(homeCode) ?? null,
          awayElo: eloMap.get(awayCode) ?? null,
          homeTeamName,
          awayTeamName,
        });
        return summary;
      })(),
    });
  }
  return result;
}

/** wave-436: 순위 → color class. STANDINGS_TOP_TIER ↓ green, STANDINGS_BOTTOM_TIER ↑ orange */
export function standingsRankClass(rank: number): string {
  if (rank <= STANDINGS_TOP_TIER) return 'text-brand-500 dark:text-brand-400';
  if (rank >= STANDINGS_BOTTOM_TIER) return 'text-orange-500 dark:text-orange-400';
  return '';
}

export function groupByDate(games: ThisWeekGameCard[]): Array<{ date: string; games: ThisWeekGameCard[] }> {
  const map = new Map<string, ThisWeekGameCard[]>();
  for (const g of games) {
    const existing = map.get(g.gameDate) ?? [];
    existing.push(g);
    map.set(g.gameDate, existing);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, gs]) => ({ date, games: gs }));
}

export function groupUpcomingByDate(games: UpcomingScheduledGame[]): Array<{ date: string; games: UpcomingScheduledGame[] }> {
  const map = new Map<string, UpcomingScheduledGame[]>();
  for (const g of games) {
    const existing = map.get(g.gameDate) ?? [];
    existing.push(g);
    map.set(g.gameDate, existing);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, gs]) => ({ date, games: gs }));
}

interface PeriodStats {
  total: number;
  correct: number;
}

export async function getPeriodStats(startDate: string, endDate: string): Promise<PeriodStats> {
  const supabase = await createClient();
  const result = (await supabase
    .from('predictions')
    .select('is_correct, game:games!predictions_game_id_fkey(game_date)')
    .eq('prediction_type', 'pre_game')
    .match(CURRENT_MODEL_FILTER)
    .in('scoring_rule', PRODUCTION_COHORT_RULES)
    .not('is_correct', 'is', null)
    .gte('game.game_date', startDate)
    .lte('game.game_date', endDate)) as SelectResult<Array<{ is_correct: boolean | null }>>;

  const { data } = assertSelectOk(result, 'analysis getPeriodStats');
  const rows = (data ?? []) as Array<{ is_correct: boolean | null }>;
  const total = rows.length;
  const correct = rows.filter((r) => r.is_correct === true).length;
  return { total, correct };
}

export interface BestPickCard {
  gameId: number;
  gameDate: string;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: TeamCode;
  confidence: number;
  homeWinProb: number;
}

interface BestPickRow {
  confidence: number | null;
  reasoning: { homeWinProb?: number | null } | null;
  game: {
    id: number;
    game_date: string;
    home_score: number | null;
    away_score: number | null;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
  } | null;
  predicted_winner_team: { code: string | null } | null;
}

export async function getBestPickOfWeek(startDate: string, endDate: string): Promise<BestPickCard | null> {
  const supabase = await createClient();
  const result = (await supabase
    .from('predictions')
    .select(`
      confidence, reasoning,
      game:games!predictions_game_id_fkey(
        id, game_date, home_score, away_score,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code)
      ),
      predicted_winner_team:teams!predictions_predicted_winner_fkey(code)
    `)
    .eq('prediction_type', 'pre_game')
    .match(CURRENT_MODEL_FILTER)
    .in('scoring_rule', PRODUCTION_COHORT_RULES)
    .eq('is_correct', true)
    .gte('game.game_date', startDate)
    .lte('game.game_date', endDate)
    .order('confidence', { ascending: false })
    .limit(1)) as SelectResult<BestPickRow[]>;

  const { data } = assertSelectOk(result, 'analysis getBestPickOfWeek');
  const rows = (data ?? []) as unknown as BestPickRow[];
  const row = rows[0];
  if (!row?.game) return null;

  const homeCode = row.game.home_team?.code as TeamCode | undefined;
  const awayCode = row.game.away_team?.code as TeamCode | undefined;
  const winnerCode = row.predicted_winner_team?.code as TeamCode | undefined;
  if (!homeCode || !awayCode || !winnerCode) return null;

  return {
    gameId: row.game.id,
    gameDate: row.game.game_date,
    homeCode,
    awayCode,
    homeScore: row.game.home_score,
    awayScore: row.game.away_score,
    predictedWinnerCode: winnerCode,
    confidence: row.confidence ?? ELO_NEUTRAL_WIN_PCT,
    homeWinProb: winnerProbOf(row.reasoning?.homeWinProb),
  };
}

export async function getUpsetPickOfMonth(startDate: string, endDate: string): Promise<BestPickCard | null> {
  const supabase = await createClient();
  const result = (await supabase
    .from('predictions')
    .select(`
      confidence, reasoning,
      game:games!predictions_game_id_fkey(
        id, game_date, home_score, away_score,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code)
      ),
      predicted_winner_team:teams!predictions_predicted_winner_fkey(code)
    `)
    .eq('prediction_type', 'pre_game')
    .match(CURRENT_MODEL_FILTER)
    .in('scoring_rule', PRODUCTION_COHORT_RULES)
    .eq('is_correct', false)
    .gte('confidence', WINNER_PROB_CONFIDENT)
    .gte('game.game_date', startDate)
    .lte('game.game_date', endDate)
    .order('confidence', { ascending: false })
    .limit(1)) as SelectResult<BestPickRow[]>;

  const { data } = assertSelectOk(result, 'analysis getUpsetPickOfMonth');
  const rows = (data ?? []) as unknown as BestPickRow[];
  const row = rows[0];
  if (!row?.game) return null;

  const homeCode = row.game.home_team?.code as TeamCode | undefined;
  const awayCode = row.game.away_team?.code as TeamCode | undefined;
  const winnerCode = row.predicted_winner_team?.code as TeamCode | undefined;
  if (!homeCode || !awayCode || !winnerCode) return null;

  return {
    gameId: row.game.id,
    gameDate: row.game.game_date,
    homeCode,
    awayCode,
    homeScore: row.game.home_score,
    awayScore: row.game.away_score,
    predictedWinnerCode: winnerCode,
    confidence: row.confidence ?? WINNER_PROB_CONFIDENT,
    homeWinProb: winnerProbOf(row.reasoning?.homeWinProb),
  };
}

interface H2HRaw {
  home_team: { code: string } | null;
  away_team: { code: string } | null;
  winner_team: { code: string } | null;
}

export async function getSeasonH2HData(): Promise<Map<string, Record<string, number>>> {
  const supabase = await createClient();
  const today = toKSTDateString();
  const season = today.substring(0, 4);

  const result = (await supabase
    .from('games')
    .select(`
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      winner_team:teams!games_winner_team_id_fkey(code)
    `)
    .gte('game_date', `${season}-01-01`)
    .lt('game_date', today)
    .not('winner_team_id', 'is', null)) as SelectResult<H2HRaw[]>;

  const { data } = assertSelectOk(result, 'analysis getSeasonH2HData');
  const pairMap = new Map<string, Record<string, number>>();

  for (const row of (data as unknown as H2HRaw[]) ?? []) {
    const homeCode = row.home_team?.code;
    const awayCode = row.away_team?.code;
    const winnerCode = row.winner_team?.code;
    if (!homeCode || !awayCode || !winnerCode) continue;
    const [a, b] = [homeCode, awayCode].sort();
    const key = `${a}:${b}`;
    const pair = pairMap.get(key) ?? {};
    pair[winnerCode] = (pair[winnerCode] ?? 0) + 1;
    pairMap.set(key, pair);
  }

  return pairMap;
}
