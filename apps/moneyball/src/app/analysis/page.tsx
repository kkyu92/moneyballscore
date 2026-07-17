import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  ANALYSIS_TOP_FACTORS_LIMIT,
  ANALYSIS_UPCOMING_LIMIT,
  assertSelectOk,
  CE_DETECT_THRESHOLD,
  CE_MIN_SAMPLES,
  classifyWinnerProb,
  ELO_DISPLAY_NEUTRAL_BAND,
  ELO_DIVIDER,
  ELO_NEUTRAL,
  ELO_NEUTRAL_WIN_PCT,
  NEUTRAL_FACTOR,
  HOME_ELO_BONUS,
  KBO_PREDICT_DAILY_TIME_KST,
  RECENT_FORM_GAMES,
  pickTierEmoji,
  PRODUCTION_COHORT_RULES,
  shortTeamName,
  SITE_URL,
  STANDINGS_BOTTOM_TIER,
  STANDINGS_TOP_TIER,
  VENUE_RECORD_MIN_GAMES,
  VENUE_WIN_RATE_HIGH,
  VENUE_WIN_RATE_LOW,
  RECENT10_MIN_GAMES,
  RECENT10_HOT_WINS,
  RECENT10_COLD_WINS,
  H2H_MIN_GAMES,
  H2H_DOMINANT_RATE,
  H2H_WEAK_RATE,
  SP_FIP_STRONG,
  SP_FIP_WEAK,
  LINEUP_WOBA_STRONG_TAG,
  LINEUP_WOBA_WEAK_TAG,
  BULLPEN_FIP_STRONG,
  BULLPEN_FIP_WEAK,
  BULLPEN_FIP_DIFF_MIN,
  SFR_STRONG,
  SFR_WEAK,
  WAR_STRONG,
  WAR_WEAK,
  WAR_DUEL_MIN,
  SP_AVG_FIP_DUEL,
  LINEUP_AVG_WOBA_HITTER,
  TEAM_STRENGTH_FORM_STRONG,
  TEAM_STRENGTH_FORM_WEAK,
  toKSTDateString,
  winnerProbOf,
  WINNER_PROB_CONFIDENT,
  SP_XFIP_GAP_REGRESS,
  SP_XFIP_GAP_BOUNCE,
  LINEUP_WOBA_DUEL_MIN,
  SFR_DUEL_MIN,
  SP_FIP_DUEL_MIN,
  SP_XFIP_DUEL_MIN,
  COMPOSITE_DUEL_THRESHOLD,
  COMPOSITE_DUEL_MIN_VALID,
  RECENT_FORM_DUEL_MIN,
  ELO_GAP_STRONG,
  KBO_TEAMS,
  KBO_STADIUM_SHORT,
  PARK_FACTOR_HITTER_MIN,
  PARK_FACTOR_PITCHER_MAX,
  FACTOR_PICK_MIN_FACTORS,
  type SelectResult,
  type TeamCode,
} from '@moneyball/shared';
import { selectBigMatch, fetchStandings, type BigMatchCandidate, type StandingRow } from '@moneyball/kbo-data';
import { getYesterdayKSTDateString } from '@/lib/predictions/yesterdayDate';
import { getCurrentWeek } from '@/lib/reviews/computeWeekRange';
import { getCurrentMonth } from '@/lib/reviews/computeMonthRange';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { YesterdayStatusFilter } from '@/components/analysis/YesterdayStatusFilter';
import { ThisWeekStatusFilter } from '@/components/analysis/ThisWeekStatusFilter';
import { TeamStrengthGrid } from '@/components/analysis/TeamStrengthGrid';
import { buildTeamStrengthSnapshot } from '@/lib/teams/buildTeamStrengthSnapshot';
import { CURRENT_MODEL_FILTER } from '@/config/model';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';
import { FACTOR_LABELS } from '@/lib/predictions/factorLabels';
import { canonicalPair } from '@/lib/matchup/canonicalPair';

export const metadata: Metadata = {
  title: 'AI 분석 — 오늘 전체 예측 + 빅매치 + 이번 주 경기',
  description: `오늘 KBO 전체 경기 AI 분석 — 빅매치 에이전트 토론 (홈/원정 옹호 + 심판 보정), 팩터별 강약점, 이번 주 전체 경기 신뢰도 정렬. 매일 ${KBO_PREDICT_DAILY_TIME_KST} 갱신.`,
  alternates: { canonical: `${SITE_URL}/analysis` },
  openGraph: {
    title: 'AI 분석 — 오늘 KBO 전체 경기 예측 | MoneyBall Score',
    description: `오늘 KBO 전체 경기 AI 분석 — 빅매치 에이전트 토론, 팩터별 강약점, 이번 주 신뢰도 정렬. 매일 ${KBO_PREDICT_DAILY_TIME_KST} 갱신.`,
    url: `${SITE_URL}/analysis`,
    type: 'website',
    locale: 'ko_KR',
    siteName: 'MoneyBall Score',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 분석 — 오늘 KBO 전체 경기 예측 | MoneyBall Score',
    description: '오늘 KBO 전체 경기 AI 분석 — 빅매치 에이전트 토론, 팩터별 강약점, 이번 주 신뢰도 정렬.',
  },
};

export const revalidate = 3600; // ANALYSIS_INDEX_ISR_SECONDS (Next.js 16 Turbopack: literal required)

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

interface TodayGameCard {
  gameId: number;
  gameTime: string | null;
  homeCode: TeamCode;
  awayCode: TeamCode;
  predictedWinnerCode: TeamCode | null;
  homeWinProb: number;
  confidence: number;
  topFactors: Array<{ label: string; favoredCode: TeamCode }>;
  /** wave-321: Elo & 폼 비교 배지 */
  homeElo?: number;
  awayElo?: number;
  homeRecentForm?: number;
  awayRecentForm?: number;
  /** wave-325: 현재 KBO 순위 배지 */
  homeRank?: number;
  awayRank?: number;
  /** wave-331: 최근 10경기 배지 */
  homeRecent10?: { wins: number; losses: number };
  awayRecent10?: { wins: number; losses: number };
  /** wave-333: 올 시즌 상대전적 배지 (홈팀 기준 승수/패수) */
  h2hHomeWins?: number;
  h2hAwayWins?: number;
  /** wave-335: 선발투수 배지 */
  homeSP?: string;
  awaySP?: string;
  /** wave-337: 선발투수 FIP 배지 */
  homeSPFip?: number;
  awaySPFip?: number;
  /** wave-353: 선발투수 xFIP 갭 배지 */
  homeSPXfip?: number;
  awaySPXfip?: number;
  /** wave-339: 타선 wOBA 배지 */
  homeLineupWoba?: number;
  awayLineupWoba?: number;
  /** wave-341: 불펜 FIP 배지 */
  homeBullpenFip?: number;
  awayBullpenFip?: number;
  /** wave-343: 수비 SFR 배지 */
  homeSfr?: number;
  awaySfr?: number;
  /** wave-345: 팀 WAR 배지 */
  homeWar?: number;
  awayWar?: number;
}

interface TodayAnalysisData {
  bigMatchId: number | null;
  bigMatchMode: string | undefined;
  bigMatchHomeCode: TeamCode | null;
  bigMatchAwayCode: TeamCode | null;
  games: TodayGameCard[];
}

async function getTodayAnalysisData(): Promise<TodayAnalysisData> {
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
        topFactors.push({ label: FACTOR_LABELS[f.key], favoredCode: f.favorable });
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

interface YesterdayGameCard {
  gameId: number;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: TeamCode | null;
  homeWinProb: number;
  isCorrect: boolean | null;
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
  }>;
}

async function getYesterdayGames(): Promise<YesterdayGameCard[]> {
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
    cards.push({
      gameId: row.id,
      homeCode,
      awayCode,
      homeScore: row.home_score,
      awayScore: row.away_score,
      predictedWinnerCode: (pred.predicted_winner_team?.code as TeamCode | null) ?? null,
      homeWinProb: winnerProbOf(pred.reasoning?.homeWinProb),
      isCorrect: pred.is_correct,
    });
  }
  return cards;
}

interface ThisWeekGameCard {
  gameId: number;
  gameDate: string;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: TeamCode | null;
  confidence: number | null;
  isCorrect: boolean | null;
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
  }>;
}

async function getThisWeekPreviousGames(): Promise<ThisWeekGameCard[]> {
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
    });
  }
  return cards;
}

interface UpcomingScheduledGame {
  gameId: number;
  gameDate: string;
  gameTime: string | null;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeWinProb: number;
  modelHomeWinProb: number | null; // wave-313: full-model prediction (null = not yet generated)
}

async function getThisWeekRemainingGames(): Promise<UpcomingScheduledGame[]> {
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
  if (eloResult.data) {
    type EloRow = { game_id: number | null; home_elo: number | null; away_elo: number | null; home_win_prob: number | null; game: { home_team: { code: string } | null; away_team: { code: string } | null } | null };
    for (const row of eloResult.data as unknown as EloRow[]) {
      const hc = row.game?.home_team?.code;
      const ac = row.game?.away_team?.code;
      if (hc && row.home_elo != null && !eloMap.has(hc)) eloMap.set(hc, row.home_elo);
      if (ac && row.away_elo != null && !eloMap.has(ac)) eloMap.set(ac, row.away_elo);
      if (row.game_id != null && row.home_win_prob != null && !modelProbMap.has(row.game_id)) {
        modelProbMap.set(row.game_id, row.home_win_prob);
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
    result.push({
      gameId: r.id,
      gameDate: r.game_date,
      gameTime: r.game_time,
      homeCode,
      awayCode,
      homeWinProb,
      modelHomeWinProb: modelProbMap.get(r.id) ?? null,
    });
  }
  return result;
}

function groupByDate(games: ThisWeekGameCard[]): Array<{ date: string; games: ThisWeekGameCard[] }> {
  const map = new Map<string, ThisWeekGameCard[]>();
  for (const g of games) {
    const existing = map.get(g.gameDate) ?? [];
    existing.push(g);
    map.set(g.gameDate, existing);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, gs]) => ({ date, gs: gs }))
    .map(({ date, gs }) => ({ date, games: gs }));
}

function groupUpcomingByDate(games: UpcomingScheduledGame[]): Array<{ date: string; games: UpcomingScheduledGame[] }> {
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

async function getPeriodStats(startDate: string, endDate: string): Promise<PeriodStats> {
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

interface BestPickCard {
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

async function getBestPickOfWeek(startDate: string, endDate: string): Promise<BestPickCard | null> {
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

async function getUpsetPickOfMonth(startDate: string, endDate: string): Promise<BestPickCard | null> {
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

async function getSeasonH2HData(): Promise<Map<string, Record<string, number>>> {
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

export default async function AnalysisIndexPage() {
  const currentMonth = getCurrentMonth();
  const currentWeek = getCurrentWeek();
  const [todayData, yesterdayGames, thisWeekPreviousGames, thisWeekRemainingGames, weeklyStats, monthlyStats, bestPickOfWeek, bestPickOfMonth, upsetPickOfMonth, teamStrengthRows, standingsRows, h2hMap] = await Promise.all([
    getTodayAnalysisData(),
    getYesterdayGames(),
    getThisWeekPreviousGames(),
    getThisWeekRemainingGames(),
    getPeriodStats(currentWeek.startDate, currentWeek.endDate),
    getPeriodStats(currentMonth.startDate, currentMonth.endDate),
    getBestPickOfWeek(currentWeek.startDate, currentWeek.endDate),
    getBestPickOfWeek(currentMonth.startDate, currentMonth.endDate),
    getUpsetPickOfMonth(currentMonth.startDate, currentMonth.endDate),
    buildTeamStrengthSnapshot(),
    fetchStandings(),
    getSeasonH2HData(),
  ]);

  // wave-325: 현재 KBO 순위 맵
  const rankMap = new Map<TeamCode, number>(
    (standingsRows as StandingRow[]).map((r) => [r.teamCode, r.rank]),
  );
  // wave-331: 최근 10경기 맵 (recent10 string "7승3패" → {wins, losses})
  function parseRecent10(text: string): { wins: number; losses: number } | null {
    const wm = text.match(/(\d+)승/);
    const lm = text.match(/(\d+)패/);
    if (!wm || !lm) return null;
    return { wins: parseInt(wm[1], 10), losses: parseInt(lm[1], 10) };
  }
  const recent10Map = new Map<TeamCode, { wins: number; losses: number }>(
    (standingsRows as StandingRow[])
      .map((r) => [r.teamCode, parseRecent10(r.recent10)])
      .filter((entry): entry is [TeamCode, { wins: number; losses: number }] => entry[1] !== null),
  );
  // wave-329: 홈/원정 성적 맵 (homeWins/homeLosses parsed from column 8)
  const venueMap = new Map<TeamCode, { homeWins: number; homeLosses: number; awayWins: number; awayLosses: number }>(
    (standingsRows as StandingRow[])
      .filter((r) => r.homeWins !== undefined && r.homeLosses !== undefined)
      .map((r) => [
        r.teamCode,
        {
          homeWins: r.homeWins!,
          homeLosses: r.homeLosses!,
          awayWins: Math.max(0, r.wins - r.homeWins!),
          awayLosses: Math.max(0, r.losses - r.homeLosses!),
        },
      ]),
  );
  // wave-377: 탑픽 배지 — winnerProb 기준 최대값 게임 (confident 티어만)
  const bestPickGameId = [...todayData.games]
    .sort((a, b) => winnerProbOf(b.homeWinProb) - winnerProbOf(a.homeWinProb))
    .find((g) => classifyWinnerProb(g.homeWinProb) === 'confident')
    ?.gameId ?? null;

  const gamesWithRank = todayData.games.map((g) => {
    // wave-333: 올 시즌 상대전적 (canonical pair key)
    const [h2hA, h2hB] = [g.homeCode as string, g.awayCode as string].sort();
    const h2hKey = `${h2hA}:${h2hB}`;
    const h2hPair = h2hMap.get(h2hKey) ?? {};
    const h2hHomeWins = h2hPair[g.homeCode] ?? 0;
    const h2hAwayWins = h2hPair[g.awayCode] ?? 0;
    const h2hTotal = h2hHomeWins + h2hAwayWins;
    const h2hHomeArg = h2hTotal >= H2H_MIN_GAMES ? h2hHomeWins : undefined;
    const h2hAwayArg = h2hTotal >= H2H_MIN_GAMES ? h2hAwayWins : undefined;

    // wave-390: COMPOSITE_DUEL 10팩터 net score
    const duel = computeCompositeDuel({
      homeCode: g.homeCode,
      homeLineupWoba: g.homeLineupWoba,
      awayLineupWoba: g.awayLineupWoba,
      homeSfr: g.homeSfr,
      awaySfr: g.awaySfr,
      homeBullpenFip: g.homeBullpenFip,
      awayBullpenFip: g.awayBullpenFip,
      homeSPFip: g.homeSPFip,
      awaySPFip: g.awaySPFip,
      homeSPXfip: g.homeSPXfip,
      awaySPXfip: g.awaySPXfip,
      homeWar: g.homeWar,
      awayWar: g.awayWar,
      homeElo: g.homeElo,
      awayElo: g.awayElo,
      homeRecentForm: g.homeRecentForm,
      awayRecentForm: g.awayRecentForm,
      h2hHomeWins: h2hHomeArg,
      h2hAwayWins: h2hAwayArg,
    });
    const valid = duel.validCount >= COMPOSITE_DUEL_MIN_VALID;
    const compositeDuelScore = valid ? duel.netScore : null;
    const compositeDuelHomeWins = valid ? duel.homeWins : null;
    const compositeDuelAwayWins = valid ? duel.awayWins : null;
    /** wave-394: 우세 팩터 slug 배열 (팩터 수렴 픽 레이블 표시용) */
    const compositeDuelHomeSlugs = valid ? duel.homeFavoredSlugs : null;
    const compositeDuelAwaySlugs = valid ? duel.awayFavoredSlugs : null;

    return {
      ...g,
      homeRank: rankMap.get(g.homeCode),
      awayRank: rankMap.get(g.awayCode),
      homeTeamVenue: venueMap.get(g.homeCode),
      awayTeamVenue: venueMap.get(g.awayCode),
      homeRecent10: recent10Map.get(g.homeCode),
      awayRecent10: recent10Map.get(g.awayCode),
      h2hHomeWins: h2hHomeArg,
      h2hAwayWins: h2hAwayArg,
      /** wave-377: 오늘의 탑픽 (confident 티어 + 최고 winnerProb) */
      isTopPick: g.gameId === bestPickGameId,
      /** wave-390: COMPOSITE_DUEL 10팩터 net score (null = 데이터 부족) */
      compositeDuelScore,
      /** wave-391: 종합 우세 배지 렌더링용 홈/원정 팩터 수 */
      compositeDuelHomeWins,
      compositeDuelAwayWins,
      /** wave-394: 우세 팩터 slug 배열 */
      compositeDuelHomeSlugs,
      compositeDuelAwaySlugs,
    };
  });

  // wave-392: 팩터 수렴 픽 — |netScore| ≥ FACTOR_PICK_MIN_FACTORS 인 경기, 최대 우세 순 top 3
  const factorPickGames = [...gamesWithRank]
    .filter((g) => g.compositeDuelScore !== null && Math.abs(g.compositeDuelScore!) >= FACTOR_PICK_MIN_FACTORS)
    .sort((a, b) => Math.abs(b.compositeDuelScore!) - Math.abs(a.compositeDuelScore!))
    .slice(0, 3);

  const simplifiedMode =
    todayData.games.length >= CE_MIN_SAMPLES &&
    todayData.games.reduce((s, g) => s + g.confidence, 0) / todayData.games.length <= CE_DETECT_THRESHOLD;

  const hasAnyModelPrediction = thisWeekRemainingGames.some((g) => g.modelHomeWinProb != null);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <Breadcrumb items={[{ label: 'AI 분석' }]} />
      {simplifiedMode && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          AI 에이전트 심층 분석이 일시 중단됩니다. 통계 기반 승부예측은 계속 제공됩니다.
        </div>
      )}
      <header className="border-b border-gray-200 dark:border-[var(--color-border)] pb-4">
        <h1 className="text-3xl font-bold mb-2">AI 분석 센터</h1>
        <p className="text-gray-600 dark:text-gray-300">
          오늘의 전체 AI 예측 · 빅매치 에이전트 토론 · 이번 주 전체 경기 분석을 한 곳에서.
        </p>
      </header>

      {/* 오늘의 빅매치 */}
      <section aria-labelledby="big-match-title">
        <h2 id="big-match-title" className="text-xl font-bold mb-4">
          ⭐ 오늘의 빅매치
        </h2>
        {todayData.bigMatchId ? (
          <Link
            href={`/analysis/game/${todayData.bigMatchId}`}
            className="block bg-gradient-to-br from-[var(--color-bg-hero-start)] to-[var(--color-bg-hero-end)] text-white rounded-2xl p-8 hover:shadow-xl transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {todayData.bigMatchAwayCode && todayData.bigMatchHomeCode && (
              <p className="text-2xl font-bold mb-1">
                {shortTeamName(todayData.bigMatchAwayCode)} vs {shortTeamName(todayData.bigMatchHomeCode)}
              </p>
            )}
            <p className="text-sm text-brand-200 mb-3">
              AI 에이전트 토론 대상 경기
            </p>
            <p className="text-lg font-semibold">상세 분석 보기 →</p>
          </Link>
        ) : (
          <div className="bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
            {todayData.bigMatchMode === 'no-games' ? (
              <>
                <p className="text-4xl mb-2">😴</p>
                <p className="text-lg font-medium">오늘은 KBO 휴식일</p>
                <div className="mt-4 flex gap-3 justify-center text-sm">
                  <Link
                    href="/reviews"
                    className="text-brand-600 hover:underline"
                  >
                    어제 결과 보기 →
                  </Link>
                  <Link
                    href="/predictions"
                    className="text-brand-600 hover:underline"
                  >
                    내일 미리보기 →
                  </Link>
                </div>
              </>
            ) : (
              <p>오늘 빅매치 후보가 접전 기준을 충족하지 않습니다</p>
            )}
          </div>
        )}
      </section>

      {/* 팩터 수렴 픽 — wave-392: 복수 경기 · wave-394: 팩터 레이블 · wave-396: 모델 확신도 · wave-398: 수렴 강도 색상 + 경기 시간 */}
      {factorPickGames.length > 0 && (
        <section aria-labelledby="factor-pick-title">
          <div className="rounded-lg border border-brand-200 dark:border-brand-800/50 bg-brand-50 dark:bg-brand-900/20 px-4 py-3">
            <h2 id="factor-pick-title" className="text-xs font-semibold text-brand-600 dark:text-brand-400 mb-2">
              팩터 수렴 경기{factorPickGames.length > 1 ? ` (${factorPickGames.length}경기)` : ''}
            </h2>
            <ul className="space-y-2">
              {factorPickGames.map((pick) => {
                const favoredHome = pick.compositeDuelScore! > 0;
                const hw = pick.compositeDuelHomeWins!;
                const aw = pick.compositeDuelAwayWins!;
                const favoredName = shortTeamName(favoredHome ? pick.homeCode : pick.awayCode);
                const ratio = favoredHome ? `${hw}:${aw}` : `${aw}:${hw}`;
                // wave-398: 수렴 강도 (|netScore|) — 7=임계, 8-9=강, 10=완전수렴
                const convStrength = Math.abs(pick.compositeDuelScore!);
                const ratioColorClass = convStrength >= 10
                  ? 'font-mono text-xs text-[var(--color-accent)] dark:text-[#e2c96b]'
                  : convStrength >= 8
                    ? 'font-mono text-xs text-brand-500 dark:text-brand-400'
                    : 'font-mono text-xs text-gray-500 dark:text-gray-400';
                // wave-394: 우세 팩터 레이블 (favored team 기준)
                const favoredSlugs = favoredHome
                  ? (pick.compositeDuelHomeSlugs ?? [])
                  : (pick.compositeDuelAwaySlugs ?? []);
                const favoredLabels = favoredSlugs.map((s) => FACTOR_LABELS[s]).filter(Boolean);
                // wave-396: 모델 확신도 + 팩터-모델 합치 여부
                const favoredCode = favoredHome ? pick.homeCode : pick.awayCode;
                const modelAgrees = pick.predictedWinnerCode != null && pick.predictedWinnerCode === favoredCode;
                const probPct = favoredHome
                  ? Math.round(pick.homeWinProb * 100)
                  : Math.round((1 - pick.homeWinProb) * 100);
                return (
                  <li key={pick.gameId} className="text-sm text-gray-900 dark:text-gray-100">
                    <Link
                      href={`/analysis/game/${pick.gameId}`}
                      className="flex items-center gap-1.5 flex-wrap hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                    >
                      <span className={`font-semibold ${favoredHome ? 'text-brand-600 dark:text-brand-400' : 'text-orange-500 dark:text-orange-400'}`}>
                        {favoredName}
                      </span>
                      <span className={ratioColorClass}>{ratio}</span>
                      {pick.predictedWinnerCode != null && (
                        <span className={`font-mono text-xs ${modelAgrees ? 'text-brand-500 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {probPct}%
                        </span>
                      )}
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {shortTeamName(pick.awayCode)} vs {shortTeamName(pick.homeCode)}
                      </span>
                      {/* wave-398: 경기 시간 */}
                      {pick.gameTime && (
                        <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                          {pick.gameTime.substring(0, 5)}
                        </span>
                      )}
                    </Link>
                    {favoredLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {favoredLabels.map((label) => (
                          <span
                            key={label}
                            className="inline-block text-xs px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* 오늘 전체 AI 예측 — 확신 순 정렬 */}
      {todayData.games.length > 0 && (
        <section aria-labelledby="today-all-title">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 id="today-all-title" className="text-xl font-bold">
              ⚾ 오늘 AI 예측 ({todayData.games.length}경기)
            </h2>
            <Link href="/" className="text-sm text-brand-600 hover:underline">
              홈에서 라이브 현황 →
            </Link>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gamesWithRank.map((g) => {
              const homeName = shortTeamName(g.homeCode);
              const awayName = shortTeamName(g.awayCode);
              const winnerCode = g.predictedWinnerCode;
              const winnerName = winnerCode ? shortTeamName(winnerCode) : null;
              const winnerPct = winnerCode === g.homeCode
                ? Math.round(g.homeWinProb * 100)
                : Math.round((1 - g.homeWinProb) * 100);
              const tier = classifyWinnerProb(g.homeWinProb);
              const isBig = g.gameId === todayData.bigMatchId;
              const isTopPick = g.isTopPick;
              // wave-347: 경기 유형 배지 — avgSPFip < SP_AVG_FIP_DUEL = 투수전, avgWoba > LINEUP_AVG_WOBA_HITTER = 타격전
              const avgSpFip =
                g.awaySPFip != null && g.homeSPFip != null
                  ? (g.awaySPFip + g.homeSPFip) / 2
                  : null;
              const avgLineupWoba =
                g.awayLineupWoba != null && g.homeLineupWoba != null
                  ? (g.awayLineupWoba + g.homeLineupWoba) / 2
                  : null;
              const gameTypeTag =
                avgSpFip != null && avgSpFip < SP_AVG_FIP_DUEL
                  ? ('투수전 예상' as const)
                  : avgLineupWoba != null && avgLineupWoba > LINEUP_AVG_WOBA_HITTER
                    ? ('타격전 예상' as const)
                    : null;
              return (
                <li key={g.gameId}>
                  <Link
                    href={`/analysis/game/${g.gameId}`}
                    className={`block rounded-xl border p-4 hover:shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      isBig
                        ? 'bg-white dark:bg-[var(--color-surface-card)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20'
                        : isTopPick
                          ? 'bg-white dark:bg-[var(--color-surface-card)] border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-300/40 dark:ring-amber-700/30'
                          : 'bg-white dark:bg-[var(--color-surface-card)] border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 dark:hover:border-brand-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {awayName} vs {homeName}
                        </p>
                        {g.gameTime && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {g.gameTime.substring(0, 5)}
                            {isBig && (
                              <span className="ml-2 text-[var(--color-accent)] font-semibold">⭐ 빅매치</span>
                            )}
                            {/* wave-377: 오늘의 탑픽 배지 */}
                            {isTopPick && !isBig && (
                              <span className="ml-2 text-amber-500 dark:text-amber-400 font-semibold">★ 탑픽</span>
                            )}
                            {/* wave-325: 현재 KBO 순위 배지 */}
                            {g.homeRank !== undefined && g.awayRank !== undefined && (
                              <span className="ml-2">
                                <span className={
                                  g.awayRank <= STANDINGS_TOP_TIER
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : g.awayRank >= STANDINGS_BOTTOM_TIER
                                      ? 'text-orange-500 dark:text-orange-400'
                                      : ''
                                }>{g.awayRank}위</span>
                                <span className="text-gray-300 dark:text-gray-600 mx-0.5">vs</span>
                                <span className={
                                  g.homeRank <= STANDINGS_TOP_TIER
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : g.homeRank >= STANDINGS_BOTTOM_TIER
                                      ? 'text-orange-500 dark:text-orange-400'
                                      : ''
                                }>{g.homeRank}위</span>
                              </span>
                            )}
                            {/* wave-347: 경기 유형 배지 */}
                            {gameTypeTag && (
                              <span className={`ml-2 font-medium ${
                                gameTypeTag === '투수전 예상'
                                  ? 'text-brand-600 dark:text-brand-400'
                                  : 'text-orange-500 dark:text-orange-400'
                              }`}>{gameTypeTag}</span>
                            )}
                          </p>
                        )}
                      </div>
                      {winnerName && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {winnerName}
                          </p>
                          <p className={`text-xs font-semibold mt-0.5 ${
                            tier === 'confident'
                              ? 'text-brand-600 dark:text-brand-400'
                              : tier === 'lean'
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {pickTierEmoji(tier)} {winnerPct}%
                          </p>
                        </div>
                      )}
                    </div>
                    {/* wave-323: 승부 확률 바 */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono tabular-nums w-7 shrink-0 text-right ${
                        winnerCode === g.homeCode
                          ? 'text-brand-500 dark:text-brand-400 font-semibold'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {Math.round(g.homeWinProb * 100)}%
                      </span>
                      <div
                        className="relative flex-1 h-1 rounded-full bg-orange-100 dark:bg-orange-900/30 overflow-hidden"
                        title={`홈 ${Math.round(g.homeWinProb * 100)}% · 원정 ${Math.round((1 - g.homeWinProb) * 100)}%`}
                      >
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full ${
                            tier === 'confident'
                              ? 'bg-brand-500 dark:bg-brand-400'
                              : tier === 'lean'
                                ? 'bg-brand-400 dark:bg-brand-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          style={{ width: `${Math.round(g.homeWinProb * 100)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono tabular-nums w-7 shrink-0 ${
                        winnerCode !== g.homeCode
                          ? 'text-orange-500 dark:text-orange-400 font-semibold'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {Math.round((1 - g.homeWinProb) * 100)}%
                      </span>
                    </div>
                    {g.topFactors.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {g.topFactors.map((f, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          >
                            {f.label}: {shortTeamName(f.favoredCode)}↑
                          </span>
                        ))}
                      </div>
                    )}
                    {/* wave-321: Elo & 폼 비교 배지 */}
                    {g.homeElo !== undefined && g.awayElo !== undefined && (() => {
                      const eloDelta = g.homeElo - g.awayElo;
                      const absEloDelta = Math.abs(eloDelta);
                      const eloNeutral = absEloDelta <= ELO_DISPLAY_NEUTRAL_BAND;
                      const eloFavorsHome = eloDelta > ELO_DISPLAY_NEUTRAL_BAND;
                      const eloLabel = eloNeutral
                        ? 'Elo 균형'
                        : `Elo △${absEloDelta} ${shortTeamName(eloFavorsHome ? g.homeCode : g.awayCode)} 우위`;
                      const eloColorClass = eloNeutral
                        ? 'text-gray-400 dark:text-gray-500'
                        : eloFavorsHome
                          ? 'text-brand-500 dark:text-brand-400'
                          : 'text-orange-500 dark:text-orange-400';
                      const homeForm = g.homeRecentForm;
                      const awayForm = g.awayRecentForm;
                      return (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] font-mono tabular-nums">
                          <span className={`font-sans font-medium ${eloColorClass}`}>{eloLabel}</span>
                          {homeForm !== undefined && awayForm !== undefined && (
                            <>
                              <span className="text-gray-300 dark:text-gray-700">·</span>
                              <span className="text-gray-400 dark:text-gray-500">
                                폼{' '}
                                <span className={
                                  awayForm >= TEAM_STRENGTH_FORM_STRONG
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : awayForm <= TEAM_STRENGTH_FORM_WEAK
                                      ? 'text-orange-500 dark:text-orange-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                }>{(awayForm * 100).toFixed(0)}%</span>
                                {' / '}
                                <span className={
                                  homeForm >= TEAM_STRENGTH_FORM_STRONG
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : homeForm <= TEAM_STRENGTH_FORM_WEAK
                                      ? 'text-orange-500 dark:text-orange-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                }>{(homeForm * 100).toFixed(0)}%</span>
                                <span className="text-gray-400 dark:text-gray-500"> (원/홈)</span>
                              </span>
                            </>
                          )}
                          {/* wave-373: 최근폼 직접 대결 배지 */}
                          {g.homeRecentForm != null && g.awayRecentForm != null && (() => {
                            const gap = g.homeRecentForm - g.awayRecentForm;
                            if (Math.abs(gap) < RECENT_FORM_DUEL_MIN) return null;
                            const favoredHome = gap > 0;
                            const favoredName = shortTeamName(favoredHome ? g.homeCode : g.awayCode);
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className={`font-sans font-medium ${
                                  favoredHome
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : 'text-orange-500 dark:text-orange-400'
                                }`}>
                                  폼 {favoredName} 강세
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-375: 상대전적 직접 대결 배지 */}
                          {g.h2hHomeWins !== undefined && g.h2hAwayWins !== undefined && (() => {
                            const total = g.h2hHomeWins + g.h2hAwayWins;
                            if (total === 0) return null;
                            const homeRate = g.h2hHomeWins / total;
                            if (homeRate >= H2H_DOMINANT_RATE) {
                              const favoredName = shortTeamName(g.homeCode);
                              return (
                                <>
                                  <span className="text-gray-300 dark:text-gray-700">·</span>
                                  <span className="font-medium text-brand-500 dark:text-brand-400">
                                    상대전적 {favoredName} 강세
                                  </span>
                                </>
                              );
                            }
                            if (homeRate <= H2H_WEAK_RATE) {
                              const favoredName = shortTeamName(g.awayCode);
                              return (
                                <>
                                  <span className="text-gray-300 dark:text-gray-700">·</span>
                                  <span className="font-medium text-orange-500 dark:text-orange-400">
                                    상대전적 {favoredName} 강세
                                  </span>
                                </>
                              );
                            }
                            return null;
                          })()}
                          {/* wave-329: 홈/원정 성적 배지 (wave-327 시즌 성적 → 구장별 성적으로 업그레이드) */}
                          {(() => {
                            const hv = g.homeTeamVenue;
                            const av = g.awayTeamVenue;
                            if (!hv || !av) return null;
                            if (hv.homeWins + hv.homeLosses < VENUE_RECORD_MIN_GAMES) return null;
                            if (av.awayWins + av.awayLosses < VENUE_RECORD_MIN_GAMES) return null;
                            const awayWinRate = av.awayWins / (av.awayWins + av.awayLosses);
                            const homeWinRate = hv.homeWins / (hv.homeWins + hv.homeLosses);
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className="text-gray-400 dark:text-gray-500">
                                  원{' '}
                                  <span className={
                                    awayWinRate >= VENUE_WIN_RATE_HIGH
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : awayWinRate <= VENUE_WIN_RATE_LOW
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : ''
                                  }>{av.awayWins}승{av.awayLosses}패</span>
                                  <span className="mx-0.5 text-gray-300 dark:text-gray-700">/</span>
                                  홈{' '}
                                  <span className={
                                    homeWinRate >= VENUE_WIN_RATE_HIGH
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : homeWinRate <= VENUE_WIN_RATE_LOW
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : ''
                                  }>{hv.homeWins}승{hv.homeLosses}패</span>
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-331: 최근 10경기 배지 */}
                          {(() => {
                            const ar = g.awayRecent10;
                            const hr = g.homeRecent10;
                            if (!ar || !hr) return null;
                            if (ar.wins + ar.losses < RECENT10_MIN_GAMES || hr.wins + hr.losses < RECENT10_MIN_GAMES) return null;
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className="text-gray-400 dark:text-gray-500">
                                  최근{' '}
                                  <span className={
                                    ar.wins >= RECENT10_HOT_WINS
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : ar.wins <= RECENT10_COLD_WINS
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : ''
                                  }>{ar.wins}승{ar.losses}패</span>
                                  <span className="mx-0.5 text-gray-300 dark:text-gray-700">/</span>
                                  <span className={
                                    hr.wins >= RECENT10_HOT_WINS
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : hr.wins <= RECENT10_COLD_WINS
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : ''
                                  }>{hr.wins}승{hr.losses}패</span>
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-333: 올 시즌 상대전적 배지 */}
                          {g.h2hHomeWins !== undefined && g.h2hAwayWins !== undefined && (() => {
                            const total = g.h2hHomeWins + g.h2hAwayWins;
                            const homeRate = g.h2hHomeWins / total;
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className="text-gray-400 dark:text-gray-500">
                                  상대{' '}
                                  <span className={
                                    homeRate >= H2H_DOMINANT_RATE
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : homeRate <= H2H_WEAK_RATE
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : ''
                                  }>{g.h2hHomeWins}승</span>
                                  {g.h2hAwayWins}패
                                  <span className="text-gray-300 dark:text-gray-600"> (홈)</span>
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-335/337: 선발투수 이름 + FIP 배지 */}
                          {(g.awaySP || g.homeSP) && (
                            <>
                              <span className="text-gray-300 dark:text-gray-700">·</span>
                              <span className="text-gray-400 dark:text-gray-500">
                                선발{' '}
                                <span className="text-gray-600 dark:text-gray-300">{g.awaySP ?? '미확정'}</span>
                                {g.awaySPFip != null && (
                                  <span className={`ml-0.5 font-mono tabular-nums text-[10px] ${
                                    g.awaySPFip < SP_FIP_STRONG
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : g.awaySPFip > SP_FIP_WEAK
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                  }`}>
                                    {g.awaySPFip.toFixed(2)}
                                  </span>
                                )}
                                {/* wave-353: 선발 xFIP 갭 배지 (원정) */}
                                {g.awaySPFip != null && g.awaySPXfip != null && (
                                  g.awaySPXfip - g.awaySPFip > SP_XFIP_GAP_REGRESS ? (
                                    <span className="text-[9px] text-orange-400 dark:text-orange-500" title="xFIP 기준 회귀 가능">↑</span>
                                  ) : g.awaySPFip - g.awaySPXfip > SP_XFIP_GAP_BOUNCE ? (
                                    <span className="text-[9px] text-brand-500 dark:text-brand-400" title="xFIP 기준 반등 가능">↓</span>
                                  ) : null
                                )}
                                <span className="mx-0.5 text-gray-300 dark:text-gray-700">/</span>
                                <span className="text-gray-600 dark:text-gray-300">{g.homeSP ?? '미확정'}</span>
                                {g.homeSPFip != null && (
                                  <span className={`ml-0.5 font-mono tabular-nums text-[10px] ${
                                    g.homeSPFip < SP_FIP_STRONG
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : g.homeSPFip > SP_FIP_WEAK
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                  }`}>
                                    {g.homeSPFip.toFixed(2)}
                                  </span>
                                )}
                                {/* wave-353: 선발 xFIP 갭 배지 (홈) */}
                                {g.homeSPFip != null && g.homeSPXfip != null && (
                                  g.homeSPXfip - g.homeSPFip > SP_XFIP_GAP_REGRESS ? (
                                    <span className="text-[9px] text-orange-400 dark:text-orange-500" title="xFIP 기준 회귀 가능">↑</span>
                                  ) : g.homeSPFip - g.homeSPXfip > SP_XFIP_GAP_BOUNCE ? (
                                    <span className="text-[9px] text-brand-500 dark:text-brand-400" title="xFIP 기준 반등 가능">↓</span>
                                  ) : null
                                )}
                              </span>
                            </>
                          )}
                          {/* wave-363: 선발 FIP 직접 대결 배지 */}
                          {g.homeSPFip != null && g.awaySPFip != null && (() => {
                            const gap = g.awaySPFip - g.homeSPFip;
                            if (Math.abs(gap) < SP_FIP_DUEL_MIN) return null;
                            const favoredHome = gap > 0;
                            const favoredName = shortTeamName(favoredHome ? g.homeCode : g.awayCode);
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className={`font-medium ${
                                  favoredHome
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : 'text-orange-500 dark:text-orange-400'
                                }`}>
                                  선발 {favoredName} 강세
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-371: 선발 xFIP 직접 대결 배지 */}
                          {g.homeSPXfip != null && g.awaySPXfip != null && (() => {
                            const gap = g.awaySPXfip - g.homeSPXfip;
                            if (Math.abs(gap) < SP_XFIP_DUEL_MIN) return null;
                            const favoredHome = gap > 0;
                            const favoredName = shortTeamName(favoredHome ? g.homeCode : g.awayCode);
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className={`font-medium ${
                                  favoredHome
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : 'text-orange-500 dark:text-orange-400'
                                }`}>
                                  xFIP {favoredName} 강세
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-339: 타선 wOBA 배지 */}
                          {(g.awayLineupWoba != null || g.homeLineupWoba != null) && (
                            <>
                              <span className="text-gray-300 dark:text-gray-700">·</span>
                              <span className="text-gray-400 dark:text-gray-500">
                                타선{' '}
                                {g.awayLineupWoba != null ? (
                                  <span className={`font-mono tabular-nums ${
                                    g.awayLineupWoba >= LINEUP_WOBA_STRONG_TAG
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : g.awayLineupWoba <= LINEUP_WOBA_WEAK_TAG
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : ''
                                  }`}>{g.awayLineupWoba.toFixed(3)}</span>
                                ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                                <span className="mx-0.5 text-gray-300 dark:text-gray-700">/</span>
                                {g.homeLineupWoba != null ? (
                                  <span className={`font-mono tabular-nums ${
                                    g.homeLineupWoba >= LINEUP_WOBA_STRONG_TAG
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : g.homeLineupWoba <= LINEUP_WOBA_WEAK_TAG
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : ''
                                  }`}>{g.homeLineupWoba.toFixed(3)}</span>
                                ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                                <span className="text-gray-400 dark:text-gray-500"> (원/홈)</span>
                              </span>
                            </>
                          )}
                          {/* wave-355: 타선 wOBA 직접 대결 배지 */}
                          {g.homeLineupWoba != null && g.awayLineupWoba != null && (() => {
                            const gap = g.homeLineupWoba - g.awayLineupWoba;
                            if (Math.abs(gap) < LINEUP_WOBA_DUEL_MIN) return null;
                            const favoredHome = gap > 0;
                            const favoredName = shortTeamName(favoredHome ? g.homeCode : g.awayCode);
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className={`font-medium ${
                                  favoredHome
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : 'text-orange-500 dark:text-orange-400'
                                }`}>
                                  타선 {favoredName} 강세
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-341: 불펜 FIP 배지 */}
                          {(g.awayBullpenFip != null || g.homeBullpenFip != null) && (
                            <>
                              <span className="text-gray-300 dark:text-gray-700">·</span>
                              <span className="text-gray-400 dark:text-gray-500">
                                불펜{' '}
                                {g.awayBullpenFip != null ? (
                                  <span className={`font-mono tabular-nums text-[10px] ${
                                    g.awayBullpenFip < BULLPEN_FIP_STRONG
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : g.awayBullpenFip > BULLPEN_FIP_WEAK
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                  }`}>{g.awayBullpenFip.toFixed(2)}</span>
                                ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                                <span className="mx-0.5 text-gray-300 dark:text-gray-700">/</span>
                                {g.homeBullpenFip != null ? (
                                  <span className={`font-mono tabular-nums text-[10px] ${
                                    g.homeBullpenFip < BULLPEN_FIP_STRONG
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : g.homeBullpenFip > BULLPEN_FIP_WEAK
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                  }`}>{g.homeBullpenFip.toFixed(2)}</span>
                                ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                                <span className="text-gray-400 dark:text-gray-500"> (원/홈)</span>
                              </span>
                            </>
                          )}
                          {/* wave-359: 불펜 FIP 직접 대결 배지 */}
                          {g.homeBullpenFip != null && g.awayBullpenFip != null && (() => {
                            const gap = g.awayBullpenFip - g.homeBullpenFip;
                            if (Math.abs(gap) < BULLPEN_FIP_DIFF_MIN) return null;
                            const favoredHome = gap > 0;
                            const favoredName = shortTeamName(favoredHome ? g.homeCode : g.awayCode);
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className={`font-medium ${
                                  favoredHome
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : 'text-orange-500 dark:text-orange-400'
                                }`}>
                                  불펜 {favoredName} 강세
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-343: 수비 SFR 배지 */}
                          {(g.awaySfr != null || g.homeSfr != null) && (g.awaySfr !== 0 || g.homeSfr !== 0) && (
                            <>
                              <span className="text-gray-300 dark:text-gray-700">·</span>
                              <span className="text-gray-400 dark:text-gray-500">
                                수비{' '}
                                {g.awaySfr != null ? (
                                  <span className={`font-mono tabular-nums text-[10px] ${
                                    g.awaySfr >= SFR_STRONG
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : g.awaySfr <= SFR_WEAK
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                  }`}>{g.awaySfr >= 0 ? '+' : ''}{g.awaySfr.toFixed(1)}</span>
                                ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                                <span className="mx-0.5 text-gray-300 dark:text-gray-700">/</span>
                                {g.homeSfr != null ? (
                                  <span className={`font-mono tabular-nums text-[10px] ${
                                    g.homeSfr >= SFR_STRONG
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : g.homeSfr <= SFR_WEAK
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                  }`}>{g.homeSfr >= 0 ? '+' : ''}{g.homeSfr.toFixed(1)}</span>
                                ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                                <span className="text-gray-400 dark:text-gray-500"> (원/홈)</span>
                              </span>
                            </>
                          )}
                          {/* wave-357: 수비 SFR 직접 대결 배지 */}
                          {g.homeSfr != null && g.awaySfr != null && (() => {
                            const gap = g.homeSfr - g.awaySfr;
                            if (Math.abs(gap) < SFR_DUEL_MIN) return null;
                            const favoredHome = gap > 0;
                            const favoredName = shortTeamName(favoredHome ? g.homeCode : g.awayCode);
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className={`font-medium ${
                                  favoredHome
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : 'text-orange-500 dark:text-orange-400'
                                }`}>
                                  수비 {favoredName} 강세
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-365→wave-393: 종합 우세 배지 (compositeDuelScore 기준 우세 팀 결정) */}
                          {(() => {
                            const hw = g.compositeDuelHomeWins;
                            const aw = g.compositeDuelAwayWins;
                            if (hw == null || aw == null) return null;
                            const score = g.compositeDuelScore!;
                            if (score === 0) return null;
                            const favoredHome = score > 0;
                            const count = favoredHome ? hw : aw;
                            if (count < COMPOSITE_DUEL_THRESHOLD) return null;
                            const favoredName = shortTeamName(favoredHome ? g.homeCode : g.awayCode);
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className={`font-medium ${
                                  favoredHome
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : 'text-orange-500 dark:text-orange-400'
                                }`}>
                                  {favoredName} {count}팩터 우세
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-345: 팀 WAR 배지 */}
                          {(g.awayWar != null || g.homeWar != null) && (
                            <>
                              <span className="text-gray-300 dark:text-gray-700">·</span>
                              <span className="text-gray-400 dark:text-gray-500">
                                WAR{' '}
                                {g.awayWar != null ? (
                                  <span className={`font-mono tabular-nums text-[10px] ${
                                    g.awayWar >= WAR_STRONG
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : g.awayWar <= WAR_WEAK
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                  }`}>{g.awayWar.toFixed(1)}</span>
                                ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                                <span className="mx-0.5 text-gray-300 dark:text-gray-700">/</span>
                                {g.homeWar != null ? (
                                  <span className={`font-mono tabular-nums text-[10px] ${
                                    g.homeWar >= WAR_STRONG
                                      ? 'text-brand-500 dark:text-brand-400'
                                      : g.homeWar <= WAR_WEAK
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                  }`}>{g.homeWar.toFixed(1)}</span>
                                ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                                <span className="text-gray-400 dark:text-gray-500"> (원/홈)</span>
                              </span>
                            </>
                          )}
                          {/* wave-367: WAR 직접 대결 배지 */}
                          {g.homeWar != null && g.awayWar != null && (() => {
                            const gap = g.homeWar - g.awayWar;
                            if (Math.abs(gap) < WAR_DUEL_MIN) return null;
                            const favoredHome = gap > 0;
                            const favoredName = shortTeamName(favoredHome ? g.homeCode : g.awayCode);
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className={`font-medium ${
                                  favoredHome
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : 'text-orange-500 dark:text-orange-400'
                                }`}>
                                  WAR {favoredName} 강세
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-379: Elo 직접 대결 배지 — Elo 격차 ELO_GAP_STRONG(50) 이상 시 우세 팀 강조 */}
                          {g.homeElo !== undefined && g.awayElo !== undefined && (() => {
                            const gap = g.homeElo - g.awayElo;
                            if (Math.abs(gap) < ELO_GAP_STRONG) return null;
                            const favoredHome = gap > 0;
                            const favoredName = shortTeamName(favoredHome ? g.homeCode : g.awayCode);
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className={`font-medium ${
                                  favoredHome
                                    ? 'text-brand-500 dark:text-brand-400'
                                    : 'text-orange-500 dark:text-orange-400'
                                }`}>
                                  Elo {favoredName} 강세
                                </span>
                              </>
                            );
                          })()}
                          {/* wave-369: 구장 팩터 배지 — 홈팀 구장 유형 (타자 친화 / 투수 친화) */}
                          {(() => {
                            const parkPf = KBO_TEAMS[g.homeCode]?.parkPf;
                            if (parkPf === undefined) return null;
                            const isHitterFriendly = parkPf >= PARK_FACTOR_HITTER_MIN;
                            const isPitcherFriendly = parkPf <= PARK_FACTOR_PITCHER_MAX;
                            if (!isHitterFriendly && !isPitcherFriendly) return null;
                            const city = KBO_STADIUM_SHORT[g.homeCode];
                            return (
                              <>
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                                <span className={isHitterFriendly
                                  ? 'text-orange-500 dark:text-orange-400'
                                  : 'text-brand-500 dark:text-brand-400'
                                }>
                                  {city} {isHitterFriendly ? '타자 친화' : '투수 친화'}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </Link>
                  {/* wave-361: 매치업 심층 분석 딥링크 — battle badge 강세 신호 → matchup 상세 연결 (cycle 1699) */}
                  {(() => {
                    const pair = canonicalPair(g.awayCode, g.homeCode);
                    if (!pair) return null;
                    return (
                      <div className="mt-1.5 px-1 flex justify-end">
                        <Link href={pair.path} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                          매치업 심층 분석 →
                        </Link>
                      </div>
                    );
                  })()}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 이번 주 남은 경기 — wave-311 (cycle 1642) */}
      {thisWeekRemainingGames.length > 0 && (
        <section aria-labelledby="this-week-remaining-title">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 id="this-week-remaining-title" className="text-xl font-bold">
              📆 이번 주 남은 경기
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{hasAnyModelPrediction ? '모델 + Elo 예비 예측' : 'Elo 기반 예비 예측'}</span>
          </div>
          <div className="space-y-4">
            {groupUpcomingByDate(thisWeekRemainingGames).map(({ date, games: dayGames }) => {
              const [, mm, dd] = date.split('-');
              const dateLabel = `${Number(mm)}월 ${Number(dd)}일`;
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {dateLabel}
                    </p>
                    <Link
                      href={`/predictions/${date}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      예측 보기 →
                    </Link>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dayGames.map((g) => {
                      const homeName = shortTeamName(g.homeCode);
                      const awayName = shortTeamName(g.awayCode);
                      const favoredHome = g.homeWinProb >= ELO_NEUTRAL_WIN_PCT;
                      const favoredCode = favoredHome ? g.homeCode : g.awayCode;
                      const favoredName = shortTeamName(favoredCode);
                      const winPct = Math.round((favoredHome ? g.homeWinProb : 1 - g.homeWinProb) * 100);
                      // wave-313: model prediction badge
                      const hasModel = g.modelHomeWinProb != null;
                      const mFavoredHome = hasModel ? g.modelHomeWinProb! >= ELO_NEUTRAL_WIN_PCT : favoredHome;
                      const mFavoredName = shortTeamName(mFavoredHome ? g.homeCode : g.awayCode);
                      const mWinPct = hasModel
                        ? Math.round((mFavoredHome ? g.modelHomeWinProb! : 1 - g.modelHomeWinProb!) * 100)
                        : winPct;
                      return (
                        <li key={g.gameId}>
                          <Link href={`/analysis/game/${g.gameId}`} className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
                            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-[var(--color-surface)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-300 dark:hover:border-brand-600 transition-colors px-3 py-2.5 text-sm">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {awayName} @ {homeName}
                                </p>
                                {g.gameTime && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                                    {g.gameTime.slice(0, 5)}
                                  </p>
                                )}
                              </div>
                              <div className="ml-3 shrink-0 text-right">
                                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                                  {hasModel ? mFavoredName : favoredName} {hasModel ? mWinPct : winPct}%
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {hasModel ? '모델 예측' : 'Elo 기반'}
                                </p>
                                {hasModel && (
                                  <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">
                                    Elo: {favoredName} {winPct}%
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 팀 전력 현황 — wave-317 (cycle 1648) */}
      {teamStrengthRows.length > 0 && (
        <section aria-labelledby="team-strength-title">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 id="team-strength-title" className="text-xl font-bold">
              📊 팀 전력 현황
            </h2>
            <Link href="/standings" className="text-sm text-brand-600 hover:underline">
              순위표 →
            </Link>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Elo 레이팅 + 최근 {RECENT_FORM_GAMES}경기 승률 기준 — 팀 이름 클릭 시 상세 프로필
          </p>
          <TeamStrengthGrid rows={teamStrengthRows} />
        </section>
      )}

      {/* 어제 경기 분석 진입점 — 빅매치 외 경기 retention */}
      {yesterdayGames.length > 0 && (
        <section aria-labelledby="yesterday-games-title">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 id="yesterday-games-title" className="text-xl font-bold">
              📅 어제 경기 분석
            </h2>
            <Link
              href="/reviews"
              className="text-sm text-brand-600 hover:underline"
            >
              전체 결과 →
            </Link>
          </div>
          <YesterdayStatusFilter
            counts={{
              all: yesterdayGames.length,
              correct: yesterdayGames.filter((g) => g.isCorrect === true).length,
              wrong: yesterdayGames.filter((g) => g.isCorrect === false).length,
              pending: yesterdayGames.filter((g) => g.isCorrect === null).length,
            }}
          />
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {yesterdayGames.map((g) => {
              const homeName = shortTeamName(g.homeCode);
              const awayName = shortTeamName(g.awayCode);
              const winnerName = g.predictedWinnerCode
                ? shortTeamName(g.predictedWinnerCode)
                : null;
              const winnerPct = g.predictedWinnerCode === g.homeCode
                ? Math.round(g.homeWinProb * 100)
                : Math.round((1 - g.homeWinProb) * 100);
              const yesterdayStatus =
                g.isCorrect === true ? 'correct' : g.isCorrect === false ? 'wrong' : 'pending';
              return (
                <li key={g.gameId} data-yesterday-status={yesterdayStatus}>
                  <Link
                    href={`/analysis/game/${g.gameId}`}
                    className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {awayName} {g.awayScore ?? '-'} : {g.homeScore ?? '-'} {homeName}
                        </p>
                        {winnerName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            예측: {winnerName} {winnerPct}%
                          </p>
                        )}
                      </div>
                      {g.isCorrect !== null && (
                        <span
                          className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                            g.isCorrect
                              ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                              : 'bg-error/10 text-error'
                          }`}
                        >
                          {g.isCorrect ? '적중' : '실패'}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 이번 주 경기 아카이브 — 월요일 이후 어제까지 */}
      {thisWeekPreviousGames.length > 0 && (
        <section aria-labelledby="this-week-archive-title">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 id="this-week-archive-title" className="text-xl font-bold">
              📆 이번 주 경기 분석
            </h2>
            <Link
              href={`/reviews/weekly/${currentWeek.weekId}`}
              className="text-sm text-brand-600 hover:underline"
            >
              이번 주 전체 리뷰 →
            </Link>
          </div>
          <ThisWeekStatusFilter
            counts={{
              all: thisWeekPreviousGames.length,
              correct: thisWeekPreviousGames.filter((g) => g.isCorrect === true).length,
              wrong: thisWeekPreviousGames.filter((g) => g.isCorrect === false).length,
              pending: thisWeekPreviousGames.filter((g) => g.isCorrect === null).length,
            }}
          />
          <div className="space-y-5">
            {groupByDate(thisWeekPreviousGames).map(({ date, games: dayGames }) => {
              const [, mm, dd] = date.split('-');
              const dateLabel = `${Number(mm)}월 ${Number(dd)}일`;
              return (
                <div key={date} data-this-week-day-group>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    {dateLabel}
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dayGames.map((g) => {
                      const homeName = shortTeamName(g.homeCode);
                      const awayName = shortTeamName(g.awayCode);
                      const winnerName = g.predictedWinnerCode
                        ? shortTeamName(g.predictedWinnerCode)
                        : null;
                      const confPct = g.confidence !== null
                        ? Math.round(g.confidence * 100)
                        : null;
                      const thisWeekStatus =
                        g.isCorrect === true ? 'correct' : g.isCorrect === false ? 'wrong' : 'pending';
                      return (
                        <li key={g.gameId} data-this-week-status={thisWeekStatus}>
                          <Link
                            href={`/analysis/game/${g.gameId}`}
                            className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {awayName} {g.awayScore ?? '-'} : {g.homeScore ?? '-'} {homeName}
                                </p>
                                {winnerName && confPct !== null && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    예측: {winnerName} {confPct}%
                                  </p>
                                )}
                              </div>
                              {g.isCorrect !== null ? (
                                <span
                                  className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                                    g.isCorrect
                                      ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                                      : 'bg-error/10 text-error'
                                  }`}
                                >
                                  {g.isCorrect ? '적중' : '실패'}
                                </span>
                              ) : (
                                <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-[var(--color-surface-card)] text-gray-500 dark:text-gray-400">
                                  미결
                                </span>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 이번 주 AI 최고 픽 — 가장 자신 있게 맞춘 예측 */}
      {bestPickOfWeek && (
        <section aria-labelledby="best-pick-title">
          <h2 id="best-pick-title" className="text-xl font-bold mb-3">
            🏆 이번 주 AI 최고 픽
          </h2>
          <Link
            href={`/analysis/game/${bestPickOfWeek.gameId}`}
            className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/40 dark:border-brand-500/30 p-5 hover:border-brand-500 hover:shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                    적중
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {bestPickOfWeek.gameDate}
                  </span>
                </div>
                <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                  {shortTeamName(bestPickOfWeek.awayCode)}{' '}
                  {bestPickOfWeek.awayScore ?? '-'} : {bestPickOfWeek.homeScore ?? '-'}{' '}
                  {shortTeamName(bestPickOfWeek.homeCode)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  예측: {shortTeamName(bestPickOfWeek.predictedWinnerCode)}{' '}
                  {bestPickOfWeek.predictedWinnerCode === bestPickOfWeek.homeCode
                    ? Math.round(bestPickOfWeek.homeWinProb * 100)
                    : Math.round((1 - bestPickOfWeek.homeWinProb) * 100)}%
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                  {Math.round(
                    (bestPickOfWeek.predictedWinnerCode === bestPickOfWeek.homeCode
                      ? bestPickOfWeek.homeWinProb
                      : 1 - bestPickOfWeek.homeWinProb) * 100,
                  )}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">확신도</p>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* 이번 주 리뷰 CTA → /reviews/weekly/[weekId] */}
      <section aria-labelledby="weekly-review-title">
        <h2 id="weekly-review-title" className="sr-only">이번 주 예측 리뷰</h2>
        <Link
          href={`/reviews/weekly/${currentWeek.weekId}`}
          className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 hover:border-brand-500 dark:hover:border-brand-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl shrink-0">📅</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                이번 주 예측 리뷰 →
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentWeek.label}
                {weeklyStats.total > 0
                  ? ` · ${weeklyStats.total}경기 중 ${weeklyStats.correct}적중 (${Math.round((weeklyStats.correct / weeklyStats.total) * 100)}%)`
                  : ' · 이번 주 검증된 경기를 기다리는 중'}
              </p>
            </div>
          </div>
        </Link>
      </section>

      {/* 이번 달 AI 최고 픽 — 이달 가장 자신 있게 맞춘 예측 */}
      {bestPickOfMonth && bestPickOfMonth.gameId !== bestPickOfWeek?.gameId && (
        <section aria-labelledby="best-pick-month-title">
          <h2 id="best-pick-month-title" className="text-xl font-bold mb-3">
            🥇 이번 달 AI 최고 픽
          </h2>
          <Link
            href={`/analysis/game/${bestPickOfMonth.gameId}`}
            className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/40 dark:border-brand-500/30 p-5 hover:border-brand-500 hover:shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                    적중
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {bestPickOfMonth.gameDate}
                  </span>
                </div>
                <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                  {shortTeamName(bestPickOfMonth.awayCode)}{' '}
                  {bestPickOfMonth.awayScore ?? '-'} : {bestPickOfMonth.homeScore ?? '-'}{' '}
                  {shortTeamName(bestPickOfMonth.homeCode)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  예측: {shortTeamName(bestPickOfMonth.predictedWinnerCode)}{' '}
                  {bestPickOfMonth.predictedWinnerCode === bestPickOfMonth.homeCode
                    ? Math.round(bestPickOfMonth.homeWinProb * 100)
                    : Math.round((1 - bestPickOfMonth.homeWinProb) * 100)}%
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                  {Math.round(
                    (bestPickOfMonth.predictedWinnerCode === bestPickOfMonth.homeCode
                      ? bestPickOfMonth.homeWinProb
                      : 1 - bestPickOfMonth.homeWinProb) * 100,
                  )}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">확신도</p>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* 이번 달 AI 이변 경기 — 고확신(65%+) 예측이 틀린 경기 */}
      {upsetPickOfMonth && (
        <section aria-labelledby="upset-pick-month-title">
          <h2 id="upset-pick-month-title" className="text-xl font-bold mb-3">
            🤯 이번 달 AI 이변 경기
          </h2>
          <Link
            href={`/analysis/game/${upsetPickOfMonth.gameId}`}
            className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-red-300/50 dark:border-red-800/40 p-5 hover:border-red-400 dark:hover:border-red-600 hover:shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-error/10 text-error">
                    실패
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {upsetPickOfMonth.gameDate}
                  </span>
                </div>
                <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                  {shortTeamName(upsetPickOfMonth.awayCode)}{' '}
                  {upsetPickOfMonth.awayScore ?? '-'} : {upsetPickOfMonth.homeScore ?? '-'}{' '}
                  {shortTeamName(upsetPickOfMonth.homeCode)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  예측: {shortTeamName(upsetPickOfMonth.predictedWinnerCode)}{' '}
                  {upsetPickOfMonth.predictedWinnerCode === upsetPickOfMonth.homeCode
                    ? Math.round(upsetPickOfMonth.homeWinProb * 100)
                    : Math.round((1 - upsetPickOfMonth.homeWinProb) * 100)}% → 실패
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-error">
                  {Math.round(
                    (upsetPickOfMonth.predictedWinnerCode === upsetPickOfMonth.homeCode
                      ? upsetPickOfMonth.homeWinProb
                      : 1 - upsetPickOfMonth.homeWinProb) * 100,
                  )}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">확신했는데</p>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* 이번 달 리뷰 CTA → /reviews/monthly/[monthId] */}
      <section aria-labelledby="monthly-review-title">
        <h2 id="monthly-review-title" className="sr-only">이번 달 예측 리뷰</h2>
        <Link
          href={`/reviews/monthly/${currentMonth.monthId}`}
          className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 hover:border-brand-500 dark:hover:border-brand-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl shrink-0">📆</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                이번 달 예측 리뷰 →
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentMonth.label}
                {monthlyStats.total > 0
                  ? ` · ${monthlyStats.total}경기 중 ${monthlyStats.correct}적중 (${Math.round((monthlyStats.correct / monthlyStats.total) * 100)}%)`
                  : ' · 이번 달 검증된 경기를 기다리는 중'}
              </p>
            </div>
          </div>
        </Link>
      </section>

      {/* 시즌 성과 CTA → /dashboard */}
      <section aria-labelledby="season-stats-title">
        <h2 id="season-stats-title" className="sr-only">시즌 성과</h2>
        <Link
          href="/dashboard"
          className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 hover:border-brand-500 dark:hover:border-brand-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl shrink-0">📊</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                전체 성과 대시보드 →
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                누적 적중률, 일자별 추이, 확신 구간, 팀별 성과, 팩터 분석까지 한 곳에서
              </p>
            </div>
          </div>
        </Link>
      </section>

      {/* AI 적중 기록 CTA → /accuracy */}
      <section aria-labelledby="accuracy-title">
        <h2 id="accuracy-title" className="sr-only">AI 적중 기록</h2>
        <Link
          href="/accuracy"
          className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 hover:border-brand-500 dark:hover:border-brand-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl shrink-0">🎯</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                AI 적중 기록 →
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                신뢰도별 캘리브레이션, 주별 트렌드, 팀별 성과 — 얼마나 정확한지 솔직하게 공개합니다
              </p>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
