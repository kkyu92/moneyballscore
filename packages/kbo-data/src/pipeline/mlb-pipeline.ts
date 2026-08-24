// MLB 파이프라인 오케스트레이터
//
// Plan C Task 2 — MLB 7 mode 실행 + silent drift alert 연동.
// mlb_statsapi_scrape: fetchMlbSchedule → games DB upsert (league='mlb').
// mlb_fancy_scrape: fetchFangraphsMlbTeams → mlb_team_stats upsert (cycle 1985 wiring — 스크래퍼는
//   이미 구현/테스트됨, 이전엔 pipeline 미연결 stub 이었음).
// mlb_savant_scrape: fetchSavantTeamStatcast → mlb_team_stats upsert (동일 cycle 1985 wiring).
// mlb_predict_final: computeMlbProbability → predictions DB insert.
// mlb_combined_notify: Telegram combined 메시지 (mlb_combined_notify route 통해 발송).
// mlb_shadow_train: trainShadowWeights → milestone check + walk_forward_brier insert.
// mlb_walk_forward_measure: computeBrier → walk_forward_brier insert.
//
// packages/kbo-data 는 apps/moneyball 를 import 못함 → mlb_combined_notify
// stub 처리 (API route 에서 직접 처리).

import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { fetchMlbSchedule, fetchProbablePitchers } from '../scrapers/statsapi-mlb';
import { fetchFangraphsMlbTeams } from '../scrapers/fangraphs-mlb';
import { fetchSavantTeamStatcast } from '../scrapers/baseball-savant';
import { computeMlbProbability } from '../factors/mlb-base';
import {
  trainShadowWeights,
  computeBrier,
  MILESTONE_TRIGGERS,
  type TrainingSample,
  type BrierInput,
} from '../factors/mlb-shadow-c';
import { computeMlbEloRatings, computeMlbEloHistory } from '../factors/mlb-elo';
import { calculateMlbRecentForm, calculateMlbHeadToHead, type MlbFinishedGameForForm } from '../factors/mlb-form';
import {
  shouldAlertSilentDrift,
  captureSilentDriftAlert,
} from './silent-drift-alert';
import { ELO_NEUTRAL, MLB_TEAMS, MLB_SCORING_RULE, normalizeMlbTeamCode, errMsg, assertSelectOk } from '@moneyball/shared';
import { DB_CONSTRAINTS } from './db-constraints';
import {
  generateMlbAgentMemories,
  MLB_MEMORY_PREDICTION_COLUMNS,
  type MlbPredictionRow,
  type MlbScheduleRow,
} from '../agents/mlb-retro';

// mlb_predict_final 실측 데이터 fallback 기본값 — mlb_team_stats row 부재(스크래퍼 미가동/미커버 팀) 시에만 사용.
// cycle 2057 이전엔 이 값들이 항상, 무조건 쓰였음 (모든 MLB 예측 home_win_prob 고정 0.556 — 사례 20).
const MLB_STAT_DEFAULTS = {
  woba: 0.320,
  fip: 4.0,
  xfip: 4.0,
  war: 0,
  xwoba: 0.320,
  barrelPct: 8,
} as const;

interface MlbTeamStatsRow {
  team_code: string;
  woba: number | null;
  fip: number | null;
  xfip: number | null;
  war: number | null;
  xwoba: number | null;
  barrel_pct: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = ReturnType<typeof createClient<any, any, any>>;

export type MlbPipelineMode =
  | 'mlb_statsapi_scrape'
  | 'mlb_fancy_scrape'
  | 'mlb_savant_scrape'
  | 'mlb_predict_final'
  | 'mlb_combined_notify'
  | 'mlb_shadow_train'
  | 'mlb_walk_forward_measure'
  | 'mlb_elo_update';

export interface MlbPipelineResult {
  mode: MlbPipelineMode;
  date: string;
  games_found: number;
  rows_inserted: number;
  errors: string[];
  triggered_by: string;
}

const MLB_MODES = new Set<MlbPipelineMode>([
  'mlb_statsapi_scrape',
  'mlb_fancy_scrape',
  'mlb_savant_scrape',
  'mlb_predict_final',
  'mlb_combined_notify',
  'mlb_shadow_train',
  'mlb_walk_forward_measure',
  'mlb_elo_update',
]);

function createAdminClient(): DB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─────────────────────────────────────────────
// mlb_statsapi_scrape
// ─────────────────────────────────────────────
async function runStatsApiScrape(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];
  let games: Awaited<ReturnType<typeof fetchMlbSchedule>> = [];

  try {
    games = await fetchMlbSchedule(date);
  } catch (e) {
    errors.push(`fetchMlbSchedule: ${e instanceof Error ? e.message : String(e)}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  if (games.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  // 선발투수 이름은 best-effort — 실패해도 schedule upsert 자체는 막지 않음
  // (KBO sp_confirmation_log 와 달리 별도 테이블 없이 mlb_schedule 컬럼으로 직접 저장).
  let pitchers: Awaited<ReturnType<typeof fetchProbablePitchers>> = {};
  try {
    pitchers = await fetchProbablePitchers(date);
  } catch (e) {
    errors.push(`fetchProbablePitchers: ${e instanceof Error ? e.message : String(e)}`);
  }

  const rows = games.map((g) => ({
    league: 'mlb',
    external_game_id: String(g.gamePk),
    game_date: date,
    game_datetime_utc: g.gameDateUtc.toISOString(),
    home_team_code: g.homeTeam,
    away_team_code: g.awayTeam,
    status: g.status,
    home_score: g.homeScore ?? null,
    away_score: g.awayScore ?? null,
    home_starter_name: pitchers[g.gamePk]?.home?.name ?? null,
    away_starter_name: pitchers[g.gamePk]?.away?.name ?? null,
  }));

  const { error } = await db
    .from('mlb_schedule')
    .upsert(rows, { onConflict: DB_CONSTRAINTS.mlbGames });

  if (error) {
    errors.push(`mlb_schedule upsert: ${error.message}`);
    return { gamesFound: games.length, rowsInserted: 0, errors };
  }

  return { gamesFound: games.length, rowsInserted: rows.length, errors };
}

// ─────────────────────────────────────────────
// mlb_fancy_scrape
// ─────────────────────────────────────────────
async function runFancyScrape(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];
  const season = parseInt(date.slice(0, 4), 10);

  let teams: Awaited<ReturnType<typeof fetchFangraphsMlbTeams>> = [];
  try {
    teams = await fetchFangraphsMlbTeams(season);
  } catch (e) {
    errors.push(`fetchFangraphsMlbTeams: ${e instanceof Error ? e.message : String(e)}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  if (teams.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const now = new Date().toISOString();
  const rows = teams.map((t) => ({
    team_code: t.teamCode,
    season,
    woba: t.woba,
    fip: t.fip,
    xfip: t.xfip,
    war: t.war,
    ld_pct: t.ldPct,
    gb_pct: t.gbPct,
    fb_pct: t.fbPct,
    iffb_pct: t.iffbPct,
    hr_fb_pct: t.hrFbPct,
    pull_pct: t.pullPct,
    cent_pct: t.centPct,
    oppo_pct: t.oppoPct,
    fancy_synced_at: now,
  }));

  const { error } = await db
    .from('mlb_team_stats')
    .upsert(rows, { onConflict: DB_CONSTRAINTS.mlbTeamStats });

  if (error) {
    errors.push(`mlb_team_stats upsert (fancy): ${error.message}`);
    return { gamesFound: teams.length, rowsInserted: 0, errors };
  }

  return { gamesFound: teams.length, rowsInserted: rows.length, errors };
}

// ─────────────────────────────────────────────
// mlb_savant_scrape
// ─────────────────────────────────────────────
async function runSavantScrape(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];
  const season = parseInt(date.slice(0, 4), 10);

  let teams: Awaited<ReturnType<typeof fetchSavantTeamStatcast>> = [];
  try {
    teams = await fetchSavantTeamStatcast(season);
  } catch (e) {
    errors.push(`fetchSavantTeamStatcast: ${e instanceof Error ? e.message : String(e)}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  if (teams.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const now = new Date().toISOString();
  const rows = teams.map((t) => ({
    team_code: t.teamCode,
    season,
    xwoba: t.xwoba,
    barrel_pct: t.barrelPct,
    hard_hit_pct: t.hardHitPct,
    launch_angle: t.launchAngle,
    savant_synced_at: now,
  }));

  const { error } = await db
    .from('mlb_team_stats')
    .upsert(rows, { onConflict: DB_CONSTRAINTS.mlbTeamStats });

  if (error) {
    errors.push(`mlb_team_stats upsert (savant): ${error.message}`);
    return { gamesFound: teams.length, rowsInserted: 0, errors };
  }

  return { gamesFound: teams.length, rowsInserted: rows.length, errors };
}

// ─────────────────────────────────────────────
// mlb_predict_final
// ─────────────────────────────────────────────
async function runPredictFinal(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];
  const season = parseInt(date.slice(0, 4), 10);

  // Load today's MLB games from mlb_schedule
  const { data: games, error: gErr } = await db
    .from('mlb_schedule')
    .select('external_game_id, home_team_code, away_team_code')
    .eq('game_date', date)
    .eq('status', 'scheduled');

  if (gErr) {
    errors.push(`mlb_schedule select: ${gErr.message}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const gameList = (games ?? []) as Array<{ external_game_id: string; home_team_code: string; away_team_code: string }>;
  if (gameList.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  // mlb_team_stats 실측 조회 (cycle 2057 wiring — mlb_fancy_scrape/mlb_savant_scrape 가 채워둔 값을
  // 이제야 소비. row 부재 팀/컬럼은 MLB_STAT_DEFAULTS fallback — 부분 데이터도 안전.
  // silent drift 가드 (review-code heavy cycle 2286 발견) — 기존 `.error` 미체크 시 DB 에러가
  // "team stats row 전부 없음"과 구분 안 돼 모든 팀이 MLB_STAT_DEFAULTS 로 조용히 fallback,
  // 이 파일 자신의 사례 20 (line 43-44) 과 동일 실패 모드가 select 에러 경로로도 재발 가능했음.
  let statsRows: MlbTeamStatsRow[] | null = null;
  try {
    const statsResult = await db
      .from('mlb_team_stats')
      .select('team_code, woba, fip, xfip, war, xwoba, barrel_pct')
      .eq('season', season);
    ({ data: statsRows } = assertSelectOk<MlbTeamStatsRow[]>(statsResult, 'mlb-pipeline.mlb_team_stats.select'));
  } catch (e) {
    errors.push(`mlb_team_stats select: ${errMsg(e)}`);
  }

  const statsByTeam = new Map<string, MlbTeamStatsRow>();
  for (const row of (statsRows ?? []) as MlbTeamStatsRow[]) {
    statsByTeam.set(row.team_code, row);
  }

  // mlb_team_elo 실측 조회 (cycle 2349 wiring — mlb_elo_update 가 채워둔 값을 이제야 소비.
  // mlb_team_elo.team_code 는 mlb_schedule 원본 코드로 upsert 됨(runEloUpdate 가 정규화 없이
  // 그대로 씀) — mlb_team_stats 와 달리 canonical alias 매핑 불필요, g.home/away_team_code 로 직결.
  let eloRows: Array<{ team_code: string; elo_rating: number }> | null = null;
  try {
    const eloResult = await db
      .from('mlb_team_elo')
      .select('team_code, elo_rating')
      .eq('season', season);
    ({ data: eloRows } = assertSelectOk<Array<{ team_code: string; elo_rating: number }>>(eloResult, 'mlb-pipeline.mlb_team_elo.select'));
  } catch (e) {
    errors.push(`mlb_team_elo select: ${errMsg(e)}`);
  }

  const eloByTeam = new Map<string, number>();
  for (const row of eloRows ?? []) {
    eloByTeam.set(row.team_code, row.elo_rating);
  }

  // mlb_schedule 시즌 종료 경기 실측 조회 (cycle 2353 wiring — recent_form/head_to_head
  // 는 mlb_team_elo 와 달리 별도 저장 테이블 없이 mlb_schedule 자체의 status='final' 행에서
  // 직접 파생 가능. mlb_schedule 은 이미 status='scheduled' 오늘 경기 조회에 쓰이는 동일
  // 테이블 — 별도 쿼리로 시즌 종료 경기(당일 이전, leak 방지) 만 추가 조회.
  // DB order() 대신 클라이언트 sort — mock 체인 단순화 + 어차피 클라이언트 slice 필요.
  let finishedGames: MlbFinishedGameForForm[] = [];
  try {
    const seasonStart = `${season}-01-01`;
    const finishedResult = await db
      .from('mlb_schedule')
      .select('home_team_code, away_team_code, home_score, away_score, game_date')
      .eq('status', 'final')
      .gte('game_date', seasonStart)
      .lt('game_date', date);
    const { data } = assertSelectOk<
      Array<MlbFinishedGameForForm & { game_date: string }>
    >(finishedResult, 'mlb-pipeline.mlb_schedule.finished.select');
    finishedGames = (data ?? []).slice().sort((a, b) => (a.game_date < b.game_date ? 1 : -1));
  } catch (e) {
    errors.push(`mlb_schedule finished select: ${errMsg(e)}`);
  }

  const predictionRows = gameList.map((g) => {
    const homeCanonicalCode = normalizeMlbTeamCode(g.home_team_code);
    const awayCanonicalCode = normalizeMlbTeamCode(g.away_team_code);
    // mlb_team_stats.team_code 는 canonical(Baseball-Reference) 컨벤션 — mlb_schedule 은
    // StatsAPI 원본(7팀 alias, cycle 2081 사례27) 이라 정규화 없이 조회하면 그 7팀은 항상
    // 미스매치로 MLB_STAT_DEFAULTS fallback (실측: home_sp_fip non-null 0/764, cycle 2097 발견).
    const home = statsByTeam.get(homeCanonicalCode ?? g.home_team_code);
    const away = statsByTeam.get(awayCanonicalCode ?? g.away_team_code);
    const homeParkPf = homeCanonicalCode ? MLB_TEAMS[homeCanonicalCode].parkPf : undefined;
    const homeElo = eloByTeam.get(g.home_team_code);
    const awayElo = eloByTeam.get(g.away_team_code);

    // cycle 2353 wiring — mlb_schedule status='final' 실측으로 recent_form/head_to_head
    // 계산. elo 와 동일 null-guard 원칙: 유효 경기 없으면(시즌 초반 등) 중립값 fallback,
    // 있으면 실측 반영. computeMlbFactorContributions 입력 스케일은 recent_form 이
    // 0-100(백분율), head_to_head 는 0-1(승률) — mlb-base.ts 계수와 일치.
    const homeForm = calculateMlbRecentForm(finishedGames, g.home_team_code, 10);
    const awayForm = calculateMlbRecentForm(finishedGames, g.away_team_code, 10);
    const h2h = calculateMlbHeadToHead(finishedGames, g.home_team_code, g.away_team_code);
    const h2hTotal = h2h.wins + h2h.losses;
    const h2hHomeWinRate = h2hTotal > 0 ? h2h.wins / h2hTotal : 0.5;

    // cycle 2402 발견 — sp_fip(12%)/bullpen_fip(10%) 양쪽 다 mlb_team_stats.fip(팀 전체
    // 투수진 aggregate, FanGraphs) 를 그대로 읽음. KBO 쪽은 sp_fip=실제 선발투수 개인 FIP
    // (kbo-pitcher.ts) vs bullpen_fip=팀 전체 FIP(fancy-stats.ts) 로 서로 다른 소스인 반면,
    // MLB 는 선발투수 개인 FIP 데이터 소스 자체가 없어(팀 aggregate 만 존재) 두 팩터가 동일
    // 값 공유 — mlb-pipeline.test.ts 508/580행이 이 duplicate 값을 이미 명시 assert(의도된
    // 동작으로 테스트 고정). statsapi-mlb.ts 의 fetchProbablePitchers 가 선발투수 이름/ID 는
    // 스크레이프하나 개인 FIP 통계 소스가 없어 프로덕션 미연결 상태(선수별 통계 신규 스크레이퍼
    // 필요 — 별도 스코프).
    const prob = computeMlbProbability({
      sp_fip: { home: home?.fip ?? MLB_STAT_DEFAULTS.fip, away: away?.fip ?? MLB_STAT_DEFAULTS.fip },
      sp_xfip: { home: home?.xfip ?? MLB_STAT_DEFAULTS.xfip, away: away?.xfip ?? MLB_STAT_DEFAULTS.xfip },
      lineup_woba: { home: home?.woba ?? MLB_STAT_DEFAULTS.woba, away: away?.woba ?? MLB_STAT_DEFAULTS.woba },
      bullpen_fip: { home: home?.fip ?? MLB_STAT_DEFAULTS.fip, away: away?.fip ?? MLB_STAT_DEFAULTS.fip },
      recent_form: { home: (homeForm ?? 0.5) * 100, away: (awayForm ?? 0.5) * 100 },
      war: { home: home?.war ?? MLB_STAT_DEFAULTS.war, away: away?.war ?? MLB_STAT_DEFAULTS.war },
      head_to_head: { homeWinRate: h2hHomeWinRate },
      park_factor: homeParkPf != null ? homeParkPf / 100 : 1.0,
      elo: { home: homeElo ?? ELO_NEUTRAL, away: awayElo ?? ELO_NEUTRAL },
      defense_sfr: { home: 0, away: 0 },
      lineup_xwoba: { home: home?.xwoba ?? MLB_STAT_DEFAULTS.xwoba, away: away?.xwoba ?? MLB_STAT_DEFAULTS.xwoba },
      lineup_barrel_pct: { home: home?.barrel_pct ?? MLB_STAT_DEFAULTS.barrelPct, away: away?.barrel_pct ?? MLB_STAT_DEFAULTS.barrelPct },
      // cycle 2402 발견 — defense_sfr(5%) 과 동일하게 sp_xwoba_against(4%)/woba_std(3%) 도
      // home/away 양쪽에 항상 동일 상수를 넣어 homeAdvantage 기여도가 구조적으로 항상 0
      // (diff=0). 단 defense_sfr 은 line 382 주석으로 이미 공개된 known placeholder 인 반면
      // 이 둘은 그동안 무주석 상태 — Baseball Savant 스크레이퍼(baseball-savant.ts)가
      // 팀 전체 타격 xwOBA 만 제공하고 "상대 투수 피안타 xwOBA(sp_xwoba_against)"·
      // "라인업 wOBA 표준편차(woba_std)" 는 별도 데이터 소스가 없어 실측 불가 (신규 스크레이퍼
      // 필요 — 별도 스코프). 합산 시 defense_sfr 과 동일 원리로 안전(diff=0 → 항상 무영향)하나
      // MLB_BASE_WEIGHTS 상 7%(4%+3%) 가 defense_sfr 5% 와 마찬가지로 항상 죽어있는 weight.
      sp_xwoba_against: { home: MLB_STAT_DEFAULTS.xwoba, away: MLB_STAT_DEFAULTS.xwoba },
      woba_std: { home: 0.030, away: 0.030 },
    });
    return {
      league: 'mlb',
      external_game_id: g.external_game_id,
      mlb_game_date: date,
      home_win_prob: prob,
      // predicted_winner = INT REFERENCES teams(id) — KBO 전용. MLB 팀 row 부재 → null.
      // 승자 정보는 home_win_prob + mlb_schedule.home/away_team_code 로 derive.
      predicted_winner: null,
      scoring_rule: MLB_SCORING_RULE,
      // model_version 명시 없으면 DB DEFAULT 'v1.0' (migration 001, KBO 초기 버전
      // literal) 이 조용히 상속 — MLB 는 버전 진화가 없어 MLB_SCORING_RULE 그대로 사용.
      // debate_version 명시 null 없으면 migration 007 stale DB DEFAULT 'v1-narrative'
      // 상속 (live.ts cycle 2240 이 in_game 경로에서 이미 발견/차단한 동일 landmine —
      // pre_game 경로인 본 MLB insert 는 그 fix 범위 밖이라 미차단 상태였음. MLB 는
      // LLM debate 미구현이라 항상 null). predicted_at 명시 없으면 NULL 유지(daily.ts
      // KBO pre_game 경로는 명시 박제 — MLB 만 누락돼 lead-time 파생값 항상 계산 불가).
      model_version: MLB_SCORING_RULE,
      debate_version: null,
      predicted_at: new Date().toISOString(),
      // cycle 2065 fix — computeMlbProbability 입력으로만 쓰이고 저장은 안 되던 실측
      // 팩터 값을 breakdown 컬럼에 영속화. buildMlbTeamFactorAverages / computeCompositeDuel
      // MLB 버전(plan #24 Phase 2a/3c)이 이 컬럼을 읽는데 전량 NULL이라 항상 빈 값이었음
      // (사례 21, DB 실측: home_sp_fip 등 non-null count 0/N). team stats row 부재 시
      // MLB_STAT_DEFAULTS 로 대체된 값(가짜)은 저장 X — null 유지해 null-guard 가 유효
      // 팩터 수에서 자연 제외(기존 computeCompositeDuel 설계와 동일 원칙).
      // defense_sfr 은 여전히 MLB 미구현 placeholder(계산 입력용 중립값)라 미저장 —
      // KBO 전용 지표(SFR)라 MLB 쪽 동등 데이터 소스 자체가 없음(별도 스코프). elo(cycle 2349)
      // + recent_form/head_to_head(cycle 2353) 는 mlb_team_elo/mlb_schedule 실측을 연결해
      // 계산 입력(위)뿐 아니라 여기서도 real 값 영속화 — 유효 경기/team row 부재(시즌 초반
      // 등) 시에만 null(가짜 중립값은 저장 X, 다른 팩터와 동일 원칙).
      home_sp_fip: home?.fip ?? null,
      away_sp_fip: away?.fip ?? null,
      home_sp_xfip: home?.xfip ?? null,
      away_sp_xfip: away?.xfip ?? null,
      home_lineup_woba: home?.woba ?? null,
      away_lineup_woba: away?.woba ?? null,
      home_bullpen_fip: home?.fip ?? null,
      away_bullpen_fip: away?.fip ?? null,
      home_war_total: home?.war ?? null,
      away_war_total: away?.war ?? null,
      home_lineup_xwoba: home?.xwoba ?? null,
      away_lineup_xwoba: away?.xwoba ?? null,
      home_lineup_barrel_pct: home?.barrel_pct ?? null,
      away_lineup_barrel_pct: away?.barrel_pct ?? null,
      home_elo: homeElo ?? null,
      away_elo: awayElo ?? null,
      home_recent_form: homeForm,
      away_recent_form: awayForm,
      head_to_head_rate: h2hTotal > 0 ? h2hHomeWinRate : null,
    };
  });

  // delete-then-insert (partial index 대신 idempotent 보장)
  const { error: dErr } = await db
    .from('predictions')
    .delete()
    .eq('league', 'mlb')
    .eq('mlb_game_date', date)
    .eq('scoring_rule', MLB_SCORING_RULE);

  if (dErr) {
    errors.push(`predictions delete: ${dErr.message}`);
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  const { error: pErr } = await db
    .from('predictions')
    .insert(predictionRows);

  if (pErr) {
    errors.push(`predictions insert: ${pErr.message}`);
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  return { gamesFound: gameList.length, rowsInserted: predictionRows.length, errors };
}

// ─────────────────────────────────────────────
// mlb_combined_notify — stub (apps/moneyball에서 처리)
// ─────────────────────────────────────────────
async function runCombinedNotify(_db: DB, _date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  // packages/kbo-data 는 apps/moneyball 의 MlbCombinedMessage 를 import 불가.
  // API route /api/mlb/pipeline 의 mlb_combined_notify 분기에서 직접 처리.
  // 여기선 stub — rows_inserted=0, errors=[].
  return { gamesFound: 0, rowsInserted: 0, errors: [] };
}

// ─────────────────────────────────────────────
// mlb_shadow_train
// ─────────────────────────────────────────────
async function runShadowTrain(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];

  // Load resolved MLB games from mlb_schedule
  const { data: games, error: gErr } = await db
    .from('mlb_schedule')
    .select('external_game_id, home_score, away_score')
    .eq('game_date', date)
    .eq('status', 'final');

  if (gErr) {
    errors.push(`mlb_schedule select: ${gErr.message}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const gameList = (games ?? []) as Array<{ external_game_id: string; home_score: number; away_score: number }>;
  if (gameList.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  // Load predictions for these games
  const gameIds = gameList.map((g) => g.external_game_id);
  const { data: preds, error: pErr } = await db
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('league', 'mlb')
    .eq('scoring_rule', MLB_SCORING_RULE)
    .in('external_game_id', gameIds);

  if (pErr) {
    errors.push(`predictions select: ${pErr.message}`);
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  const predMap = new Map(
    ((preds ?? []) as Array<{ external_game_id: string; home_win_prob: number }>).map((p) => [
      p.external_game_id,
      p.home_win_prob,
    ]),
  );

  const samples: TrainingSample[] = gameList
    .filter((g) => predMap.has(g.external_game_id))
    .map((g) => ({
      factors: { home_win_prob: predMap.get(g.external_game_id)! },
      homeWon: g.home_score > g.away_score ? 1 : 0,
    }));

  if (samples.length === 0) {
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  const trainResult = trainShadowWeights(samples);

  // Cumulative milestone check — cycle 2413 silent drift 발견: MILESTONE_TRIGGERS
  // ([27, 60, 150, 300, 1000, 2430], KBO v1.8→v2.0 n=150 임계 패턴 차용)는 "누적
  // 학습 표본 수"가 이 값들을 넘는 순간을 포착하려는 의도인데, 기존 코드는 이를
  // samples.length(하루치 경기 수, MLB 는 하루 최대 15경기)와 직접 비교해 어떤
  // threshold 도 절대 도달 불가능한 상태로 방치돼있었음(milestone_hit 영구 false).
  // 누적치 = 기존 mlb_shadow_train_log 전체 sample_count 합 + 이번 fire 표본 수.
  const { data: priorRows, error: cErr } = await db
    .from('mlb_shadow_train_log')
    .select('sample_count')
    .eq('league', 'mlb');

  if (cErr) {
    errors.push(`shadow_train cumulative select: ${cErr.message}`);
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  const priorCumulative = ((priorRows ?? []) as Array<{ sample_count: number }>).reduce(
    (sum, r) => sum + r.sample_count,
    0,
  );
  const newCumulative = priorCumulative + samples.length;
  const hitMilestone = MILESTONE_TRIGGERS.some((t) => priorCumulative < t && t <= newCumulative);

  // Insert shadow training result — cycle 2200대 silent drift audit 발견: 이 테이블이
  // 전체 migration 역사에 걸쳐 한번도 CREATE 된 적 없어(prod REST 실측: PGRST205
  // "Could not find the table") 매 fire 시 100% insert 실패 상태로 방치돼있었음.
  // migration 049 가 이 코드가 이미 쓰는 컬럼 shape 그대로 테이블 생성.
  const { error: sErr } = await db.from('mlb_shadow_train_log').insert({
    date,
    sample_count: samples.length,
    weights: trainResult.weights,
    brier: trainResult.brier,
    accuracy: trainResult.accuracy,
    milestone_hit: hitMilestone,
  });

  if (sErr) {
    errors.push(`shadow_train insert: ${sErr.message}`);
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  return { gamesFound: gameList.length, rowsInserted: 1, errors };
}

// ─────────────────────────────────────────────
// mlb_walk_forward_measure
// ─────────────────────────────────────────────
async function runWalkForwardMeasure(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];

  // MLB predictions 는 predictions.mlb_game_date + external_game_id 에 박제 (game_id=NULL).
  // 2-step: predictions select → mlb_schedule select via external_game_id IN.
  // games!inner 조인은 KBO 전용 (game_id FK) — MLB 에 부적합 (silent drift family fix, cycle 1168).
  const { data: preds, error: pErr } = await db
    .from('predictions')
    .select(MLB_MEMORY_PREDICTION_COLUMNS)
    .eq('league', 'mlb')
    .eq('scoring_rule', MLB_SCORING_RULE)
    .eq('mlb_game_date', date);

  if (pErr) {
    errors.push(`predictions select: ${pErr.message}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const predList = ((preds ?? []) as unknown as MlbPredictionRow[]);
  if (predList.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const externalIds = predList.map((p) => p.external_game_id);
  const { data: schedules, error: sErr } = await db
    .from('mlb_schedule')
    .select('external_game_id, home_team_code, away_team_code, home_score, away_score, status')
    .in('external_game_id', externalIds)
    .eq('status', 'final');

  if (sErr) {
    errors.push(`mlb_schedule select: ${sErr.message}`);
    return { gamesFound: predList.length, rowsInserted: 0, errors };
  }

  const scheduleMap = new Map(
    ((schedules ?? []) as unknown as MlbScheduleRow[]).map((s) => [s.external_game_id, s]),
  );

  const finalRows = predList
    .filter((p) => scheduleMap.has(p.external_game_id))
    .map((p) => ({ pred: p, schedule: scheduleMap.get(p.external_game_id)! }));

  if (finalRows.length === 0) {
    return { gamesFound: predList.length, rowsInserted: 0, errors };
  }

  const brierInputs: BrierInput[] = finalRows.map((r) => ({
    predicted: r.pred.home_win_prob!,
    actual: r.schedule.home_score! > r.schedule.away_score! ? 1 : 0,
  }));

  const brier = computeBrier(brierInputs);

  // cycle 2200대 silent drift audit fix — 기존 'walk_forward_brier' 테이블(036
  // migration)은 month/cohort_size/brier_base/brier_shadow/delta 컬럼(월간
  // base-vs-shadow 비교 전용 설계, walkForwardExpanding() 소비 대상)이라 여기서
  // insert 하려던 date/scoring_rule/brier_score/sample_count 와 전량 컬럼 불일치 —
  // 매 fire 시 100% insert 실패 상태로 방치돼있었음(PostgREST "column not found").
  // 코드가 실제 쓰는 일별 로그 shape 에 맞는 전용 테이블 mlb_walk_forward_log 로
  // 분리 (migration 049).
  const { error: bErr } = await db.from('mlb_walk_forward_log').insert({
    date,
    league: 'mlb',
    scoring_rule: MLB_SCORING_RULE,
    brier_score: brier,
    sample_count: finalRows.length,
  });

  if (bErr) {
    errors.push(`mlb_walk_forward_log insert: ${bErr.message}`);
    return { gamesFound: finalRows.length, rowsInserted: 0, errors };
  }

  // agent_memories 학습 — Brier 측정과 동일 final-game 조인 결과 재사용 (신규 cron mode
  // 없이 배선, cycle 2169). 실패해도 walk-forward 핵심 지표(Brier) 는 이미 기록 완료.
  try {
    await generateMlbAgentMemories(db, date, finalRows);
  } catch (e) {
    errors.push(`generateMlbAgentMemories: ${errMsg(e)}`);
  }

  return { gamesFound: finalRows.length, rowsInserted: 1, errors };
}

// ─────────────────────────────────────────────
// mlb_elo_update (plan #25 Phase 2, cycle 2082)
// ─────────────────────────────────────────────
async function runEloUpdate(db: DB, _date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];

  // 매 fire 시 mlb_schedule final 전체를 재생 (증분 갱신 X) — mlb_team_elo 에
  // "이 경기 이미 반영" 을 나타내는 처리 로그가 없어 증분 방식은 재실행 시 이중
  // 반영 위험. computeMlbEloRatings 가 backfill 스크립트와 동일 로직 재사용
  // (scripts/backfill-mlb-elo.ts, cycle 2080/2082).
  const { data: games, error: gErr } = await db
    .from('mlb_schedule')
    .select('game_date, home_team_code, away_team_code, home_score, away_score')
    .eq('status', 'final')
    .order('game_datetime_utc', { ascending: true });

  if (gErr) {
    errors.push(`mlb_schedule select: ${gErr.message}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const gameList = (games ?? []) as Array<{
    game_date: string;
    home_team_code: string;
    away_team_code: string;
    home_score: number | null;
    away_score: number | null;
  }>;

  if (gameList.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const states = computeMlbEloRatings(gameList);
  const now = new Date().toISOString();
  const upsertRows = Array.from(states.entries()).map(([team_code, s]) => ({
    team_code,
    season: s.season,
    elo_rating: s.eloRating,
    games_played: s.gamesPlayed,
    updated_at: now,
  }));

  const { error: uErr } = await db
    .from('mlb_team_elo')
    .upsert(upsertRows, { onConflict: DB_CONSTRAINTS.mlbTeamElo });

  if (uErr) {
    errors.push(`mlb_team_elo upsert: ${uErr.message}`);
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  // plan #25 Phase 2b step 1 (cycle 2083) — mlb_team_elo 와 같은 재생 결과에서
  // 경기별 사후 rating 시계열도 함께 upsert (matchup Elo 추이 차트 소비용).
  // 시즌 진행에 따라 row 수가 커져(팀 30 × 경기 최대 ~162) 500건씩 chunk.
  const historyRows = computeMlbEloHistory(gameList);
  const ELO_HISTORY_CHUNK = 500;
  for (let i = 0; i < historyRows.length; i += ELO_HISTORY_CHUNK) {
    const chunk = historyRows.slice(i, i + ELO_HISTORY_CHUNK);
    const { error: hErr } = await db
      .from('mlb_team_elo_history')
      .upsert(chunk, { onConflict: DB_CONSTRAINTS.mlbTeamEloHistory });

    if (hErr) {
      errors.push(`mlb_team_elo_history upsert: ${hErr.message}`);
      // rowsInserted 는 mlb_team_elo(팀 수, 이미 성공) 기준이라 history 실패와 무관하게
      // >0 유지 — 아래 pipeline_runs.status 계산(hasErrors && rowsInserted===0 시만
      // 'error')과 captureSilentDriftAlert(predictionsGenerated===0 시만 발화) 양쪽이
      // 이 실패를 구조적으로 못 잡음(둘 다 rowsInserted/predictionsGenerated 만 봄).
      // 실측: cycle 2083 발견 더블헤더 dedupe 버그처럼 향후 유사 실패가 status='success'
      // 로 완전 silent 될 위험 — 여기서 직접 Sentry 발화로 재발 차단.
      Sentry.captureException(new Error(`mlb_team_elo_history upsert error: ${hErr.message}`), {
        tags: { silent_drift_family: 'wave_178', component: 'pipeline-mlb', op: 'mlb_team_elo_history_upsert' },
      });
      break;
    }
  }

  return { gamesFound: gameList.length, rowsInserted: upsertRows.length, errors };
}

// ─────────────────────────────────────────────
// main orchestrator
// ─────────────────────────────────────────────
export async function runMlbPipeline(
  mode: MlbPipelineMode,
  date: string,
  triggeredBy: string,
): Promise<MlbPipelineResult> {
  if (!MLB_MODES.has(mode)) {
    throw new Error(`unknown mode: ${mode}`);
  }

  const startedAt = Date.now();
  const db = createAdminClient();

  let gamesFound = 0;
  let rowsInserted = 0;
  let errors: string[] = [];

  switch (mode) {
    case 'mlb_statsapi_scrape': {
      const r = await runStatsApiScrape(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_fancy_scrape': {
      const r = await runFancyScrape(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_savant_scrape': {
      const r = await runSavantScrape(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_predict_final': {
      const r = await runPredictFinal(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_combined_notify': {
      const r = await runCombinedNotify(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_shadow_train': {
      const r = await runShadowTrain(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_walk_forward_measure': {
      const r = await runWalkForwardMeasure(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_elo_update': {
      const r = await runEloUpdate(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
  }

  // pipeline_runs 기록 — MLB 실행 추적
  const hasErrors = errors.length > 0;
  const runStatus = hasErrors && rowsInserted === 0 ? 'error' : 'success';
  await db.from('pipeline_runs').insert({
    run_date: date,
    league: 'mlb',
    mode,
    status: runStatus,
    games_found: gamesFound,
    predictions: rowsInserted,
    errors: hasErrors ? errors : [],
    triggered_by: triggeredBy,
    duration_ms: Date.now() - startedAt,
  }).then(({ error: e }) => {
    if (e) {
      console.error(`[MLB] pipeline_runs insert failed: ${e.message}`);
      // KBO daily.ts 사례 3 (VARCHAR overflow silent) 와 동일 실패 경로 — throw 안 하고
      // .error 리턴이라 Sentry 없인 console.error 만 남고 silent (cycle 2078 발견,
      // triggered_by VARCHAR(20) 초과 값으로 재현: 25자 값 insert 시 이 branch 로 옴).
      Sentry.captureException(new Error(`pipeline_runs insert error: ${e.message}`), {
        tags: { silent_drift_family: 'wave_177', component: 'pipeline-mlb', op: 'pipeline_runs_insert' },
      });
    }
  });

  // Silent drift alert — MLB modes 매핑
  await captureSilentDriftAlert({
    mode,
    date,
    gamesFound,
    predictionsGenerated: rowsInserted,
    errors,
  });

  return {
    mode,
    date,
    games_found: gamesFound,
    rows_inserted: rowsInserted,
    errors,
    triggered_by: triggeredBy,
  };
}
