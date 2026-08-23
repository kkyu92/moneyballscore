import { createClient } from '@/lib/supabase/server';
import {
  MLB_TEAMS,
  type MlbTeamCode,
  mlbShortTeamName,
  mlbTeamDivision,
  normalizeMlbTeamCode,
  toMlbStatsApiCode,
  assertSelectOk,
  MLB_PRODUCTION_COHORT_RULES,
} from '@moneyball/shared';
import {
  computeTeamStreak,
  type TeamStreak,
  computeTeamAvgMargin,
  type TeamAvgMargin,
  computeTeamBlowoutCount,
  type TeamBlowoutStats,
  computeTeamCloseGameCount,
  type TeamCloseGameStats,
  computeTeamHomeAwayEdge,
  type TeamHomeAwaySplit,
  computeTeamRecentRecord,
  type TeamRecentRecord,
} from '@/lib/teams/buildTeamProfile';
import { deriveMlbOutcome } from './deriveMlbOutcome';

export interface MlbTeamRecentGame {
  gameId: number;
  gameDate: string;
  isHome: boolean;
  opponentCode: MlbTeamCode | null;
  opponentName: string | null;
  predictedAsWinner: boolean;
  confidence: number | null;
  isCorrect: boolean | null;
  ourScore: number | null;
  opponentScore: number | null;
  status: string | null;
}

export interface MlbTeamFactorAverages {
  spFip: number | null;
  lineupWoba: number | null;
  bullpenFip: number | null;
  recentForm: number | null;
  elo: number | null;
  lineupXwoba: number | null;
  lineupBarrelPct: number | null;
}

// mlb_team_stats(migration 044) 가 FanGraphs/Savant 스크랩으로 채우지만 어느 UI 도
// 소비하지 않던 타구 스프레이/타입 컬럼 — buildMlbTeamProfile 이 시즌 스냅샷째로 노출.
export interface MlbBattedBallProfile {
  pullPct: number | null;
  centPct: number | null;
  oppoPct: number | null;
  gbPct: number | null;
  fbPct: number | null;
  hardHitPct: number | null;
  ldPct: number | null;
  iffbPct: number | null;
  hrFbPct: number | null;
  launchAngle: number | null;
}

export interface MlbTeamProfile {
  code: MlbTeamCode;
  name: string;
  shortName: string;
  city: string;
  stadium: string;
  color: string;
  parkPf: number;
  league: 'AL' | 'NL';
  division: 'East' | 'Central' | 'West';
  predictedGames: number;
  predictedWins: number;
  predictedWinRate: number | null;
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null;
  factorAverages: MlbTeamFactorAverages;
  battedBallProfile: MlbBattedBallProfile | null;
  recentGames: MlbTeamRecentGame[];
  streak: TeamStreak | null;
  avgMargin: TeamAvgMargin | null;
  blowout: TeamBlowoutStats | null;
  closeGame: TeamCloseGameStats | null;
  homeAwayEdge: TeamHomeAwaySplit | null;
  recentRecord: TeamRecentRecord | null;
}

interface ScheduleRow {
  id: number;
  external_game_id: string;
  game_date: string;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team_code: string;
  away_team_code: string;
}

interface PredRow {
  external_game_id: string | null;
  home_win_prob: number | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_recent_form: number | null;
  away_recent_form: number | null;
  home_elo: number | null;
  away_elo: number | null;
  home_lineup_xwoba: number | null;
  away_lineup_xwoba: number | null;
  home_lineup_barrel_pct: number | null;
  away_lineup_barrel_pct: number | null;
  prediction_type: string | null;
}

interface BattedBallStatsRow {
  pull_pct: number | null;
  cent_pct: number | null;
  oppo_pct: number | null;
  gb_pct: number | null;
  fb_pct: number | null;
  hard_hit_pct: number | null;
  ld_pct: number | null;
  iffb_pct: number | null;
  hr_fb_pct: number | null;
  launch_angle: number | null;
}

function safeAvg(sum: number, n: number): number | null {
  return n > 0 ? sum / n : null;
}

// Plan B Tier C+D Task 3 — MLB 팀 프로필 빌더. KBO buildTeamProfile.ts 패턴 정합:
// - assertSelectOk wrap (silent drift family 차단)
// - mlb_schedule + predictions(external_game_id) 조인 (pre_game 만)
// - 14 factor (KBO 10 + Statcast 4 부분 — xwOBA / Barrel%) 집계
//
// cycle 2066 fix (사례 22 후속) — `teams`/`games` FK 는 MLB row 가 0건이라
// teamId 가 항상 null 이 되어 이 함수가 항상 emptyProfile 만 반환했음(프로덕션
// 렌더 검증 없이 테스트만 통과해 온 silent drift). MLB 는 `mlb_schedule`(팀 코드
// string) + `predictions`(`external_game_id`, `league='mlb'`) 로만 실제 기록됨.
// `predicted_winner`/`is_correct`/`confidence` 컬럼도 MLB 는 전량 NULL(파이프라인이
// 안 씀, mlb-pipeline.ts 주석 참조) — `home_win_prob` + 실제 스코어로 직접 derive.
export async function buildMlbTeamProfile(
  teamCode: MlbTeamCode,
): Promise<MlbTeamProfile | null> {
  const meta = MLB_TEAMS[teamCode];
  if (!meta) return null;

  const supabase = await createClient();
  const division = mlbTeamDivision(teamCode);

  const emptyProfile: MlbTeamProfile = {
    code: teamCode,
    name: meta.name,
    shortName: mlbShortTeamName(teamCode),
    city: meta.city,
    stadium: meta.stadium,
    color: meta.color,
    parkPf: meta.parkPf,
    league: division.league,
    division: division.division,
    predictedGames: 0,
    predictedWins: 0,
    predictedWinRate: null,
    verifiedN: 0,
    correctN: 0,
    accuracyRate: null,
    factorAverages: {
      spFip: null,
      lineupWoba: null,
      bullpenFip: null,
      recentForm: null,
      elo: null,
      lineupXwoba: null,
      lineupBarrelPct: null,
    },
    battedBallProfile: null,
    recentGames: [],
    streak: null,
    avgMargin: null,
    blowout: null,
    closeGame: null,
    homeAwayEdge: null,
    recentRecord: null,
  };

  // mlb_team_stats.team_code 는 canonical(Baseball-Reference) 컨벤션 — teamCode 파라미터와
  // 동일 컨벤션이라 정규화 없이 직접 매칭(mlb_schedule 과 달리 alias 변환 불필요).
  const season = new Date().getFullYear();
  const statsResult = await supabase
    .from('mlb_team_stats')
    .select('pull_pct, cent_pct, oppo_pct, gb_pct, fb_pct, hard_hit_pct, ld_pct, iffb_pct, hr_fb_pct, launch_angle')
    .eq('team_code', teamCode)
    .eq('season', season)
    .maybeSingle();
  const { data: statsRow } = assertSelectOk(statsResult, 'buildMlbTeamProfile mlb_team_stats');
  const battedBall = statsRow as BattedBallStatsRow | null;
  const battedBallProfile: MlbBattedBallProfile | null = battedBall
    ? {
        pullPct: battedBall.pull_pct,
        centPct: battedBall.cent_pct,
        oppoPct: battedBall.oppo_pct,
        gbPct: battedBall.gb_pct,
        fbPct: battedBall.fb_pct,
        hardHitPct: battedBall.hard_hit_pct,
        ldPct: battedBall.ld_pct,
        iffbPct: battedBall.iffb_pct,
        hrFbPct: battedBall.hr_fb_pct,
        launchAngle: battedBall.launch_angle,
      }
    : null;

  // mlb_schedule 은 StatsAPI 컨벤션 저장 — canonical(Baseball-Reference) 코드로 그대로 필터링하면
  // 7팀(TBR/CHW/KCR/SDP/SFG/ARI/WSN)에서 항상 0건 매칭(silent empty, cycle 2081).
  const dbTeamCode = toMlbStatsApiCode(teamCode);
  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('id, external_game_id, game_date, status, home_score, away_score, home_team_code, away_team_code')
    .or(`home_team_code.eq.${dbTeamCode},away_team_code.eq.${dbTeamCode}`);

  const { data: scheduleData } = assertSelectOk(scheduleResult, 'buildMlbTeamProfile mlb_schedule');
  const scheduleRows = (scheduleData ?? []) as ScheduleRow[];

  if (scheduleRows.length === 0) return { ...emptyProfile, battedBallProfile };

  const scheduleByExternalId = new Map<string, ScheduleRow>();
  for (const s of scheduleRows) {
    scheduleByExternalId.set(s.external_game_id, s);
  }

  const predResult = await supabase
    .from('predictions')
    .select(
      `
        external_game_id, home_win_prob,
        home_sp_fip, away_sp_fip,
        home_lineup_woba, away_lineup_woba,
        home_bullpen_fip, away_bullpen_fip,
        home_recent_form, away_recent_form,
        home_elo, away_elo,
        home_lineup_xwoba, away_lineup_xwoba,
        home_lineup_barrel_pct, away_lineup_barrel_pct,
        prediction_type
      `,
    )
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', Array.from(scheduleByExternalId.keys()));

  const { data } = assertSelectOk(predResult, 'buildMlbTeamProfile predictions');

  const predByExternalId = new Map<string, PredRow>();
  for (const p of (data ?? []) as PredRow[]) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  const games: Array<{ schedule: ScheduleRow; pred: PredRow | null }> = scheduleRows.map(
    (schedule) => ({ schedule, pred: predByExternalId.get(schedule.external_game_id) ?? null }),
  );

  let predictedGames = 0;
  let predictedWins = 0;
  let verifiedN = 0;
  let correctN = 0;

  let spFipSum = 0, spFipN = 0;
  let wobaSum = 0, wobaN = 0;
  let bullpenSum = 0, bullpenN = 0;
  let formSum = 0, formN = 0;
  let eloSum = 0, eloN = 0;
  let xwobaSum = 0, xwobaN = 0;
  let barrelSum = 0, barrelN = 0;

  const teamGames: MlbTeamRecentGame[] = [];

  for (const { schedule: g, pred } of games) {
    if (!pred) continue;

    const isHome = g.home_team_code === dbTeamCode;
    const isAway = g.away_team_code === dbTeamCode;
    if (!isHome && !isAway) continue;

    predictedGames += 1;

    const spFip = isHome ? pred.home_sp_fip : pred.away_sp_fip;
    const woba = isHome ? pred.home_lineup_woba : pred.away_lineup_woba;
    const bullpen = isHome ? pred.home_bullpen_fip : pred.away_bullpen_fip;
    const form = isHome ? pred.home_recent_form : pred.away_recent_form;
    const elo = isHome ? pred.home_elo : pred.away_elo;
    const xwoba = isHome ? pred.home_lineup_xwoba : pred.away_lineup_xwoba;
    const barrel = isHome ? pred.home_lineup_barrel_pct : pred.away_lineup_barrel_pct;

    if (spFip != null) { spFipSum += spFip; spFipN += 1; }
    if (woba != null) { wobaSum += woba; wobaN += 1; }
    if (bullpen != null) { bullpenSum += bullpen; bullpenN += 1; }
    if (form != null) { formSum += form; formN += 1; }
    if (elo != null) { eloSum += elo; eloN += 1; }
    if (xwoba != null) { xwobaSum += xwoba; xwobaN += 1; }
    if (barrel != null) { barrelSum += barrel; barrelN += 1; }

    const hasFinalScore = g.status === 'final' && g.home_score != null && g.away_score != null;
    const { predictedHomeWin, isCorrect, confidence } = deriveMlbOutcome({
      homeWinProb: pred.home_win_prob,
      hasFinalScore,
      homeScore: g.home_score,
      awayScore: g.away_score,
    });
    const predictedThisTeam =
      predictedHomeWin != null && (isHome ? predictedHomeWin : !predictedHomeWin);
    if (predictedThisTeam) predictedWins += 1;

    if (isCorrect != null) {
      verifiedN += 1;
      if (isCorrect) correctN += 1;
    }

    const opponentCode = normalizeMlbTeamCode(isHome ? g.away_team_code : g.home_team_code) ?? null;

    teamGames.push({
      gameId: g.id,
      gameDate: g.game_date,
      isHome,
      opponentCode,
      opponentName: opponentCode ? mlbShortTeamName(opponentCode) : null,
      predictedAsWinner: predictedThisTeam,
      confidence,
      isCorrect,
      ourScore: isHome ? g.home_score : g.away_score,
      opponentScore: isHome ? g.away_score : g.home_score,
      status: g.status,
    });
  }

  // 명시적 정렬 — buildTeamProfile.ts (KBO) 동일 패턴 fix (review-code heavy 감사,
  // cycle 2399): 이전엔 정렬이 recentGames 조립 `.sort()` in-place mutation 부수효과로만
  // 보장돼 문장 순서 바꾸면 조용히 깨지는 암묵적 의존이었음. 독립 문장으로 분리.
  teamGames.sort((a, b) => b.gameDate.localeCompare(a.gameDate));
  const recentGames = teamGames.slice(0, 8);
  const streak = computeTeamStreak(teamGames);
  const avgMargin = computeTeamAvgMargin(teamGames);
  const blowout = computeTeamBlowoutCount(teamGames);
  const closeGame = computeTeamCloseGameCount(teamGames);
  const homeAwayEdge = computeTeamHomeAwayEdge(teamGames);
  const recentRecord = computeTeamRecentRecord(teamGames);

  return {
    ...emptyProfile,
    predictedGames,
    predictedWins,
    predictedWinRate: predictedGames > 0 ? predictedWins / predictedGames : null,
    verifiedN,
    correctN,
    accuracyRate: verifiedN > 0 ? correctN / verifiedN : null,
    factorAverages: {
      spFip: safeAvg(spFipSum, spFipN),
      lineupWoba: safeAvg(wobaSum, wobaN),
      bullpenFip: safeAvg(bullpenSum, bullpenN),
      recentForm: safeAvg(formSum, formN),
      elo: safeAvg(eloSum, eloN),
      lineupXwoba: safeAvg(xwobaSum, xwobaN),
      lineupBarrelPct: safeAvg(barrelSum, barrelN),
    },
    battedBallProfile,
    recentGames,
    streak,
    avgMargin,
    blowout,
    closeGame,
    homeAwayEdge,
    recentRecord,
  };
}
