import type { Metadata } from "next";
import { PredictionCardLive } from "@/components/predictions/PredictionCardLive";
import { PlaceholderCardLive } from "@/components/predictions/PlaceholderCardLive";
import { MiniGameCard } from "@/components/shared/MiniGameCard";
import { fetchStadiumWeather } from "@/lib/weather";
import { KBO_STADIUM_COORDS, KBO_STADIUM_SHORT } from "@moneyball/shared";
import { AccuracySummary } from "@/components/dashboard/AccuracySummary";
import { BigMatchDebateCard } from "@/components/analysis/BigMatchDebateCard";
import { LiveScoreboard } from "@/components/live/LiveScoreboard";
import {
  assertSelectOk,
  classifyWinnerProb,
  shortTeamName,
  toKSTDateString,
  toKSTDisplayString,
  winnerProbOf,
  type TeamCode,
} from "@moneyball/shared";
import { isBigMatchEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { buildTierRates, emptyTierRates } from "@/lib/predictions/tierStats";
import type { TierRates } from "@/components/dashboard/AccuracySummary";
import { FavoriteTeamFilter } from "@/components/shared/FavoriteTeamFilter";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "https://moneyballscore.vercel.app" },
};

interface HomePrediction {
  predicted_winner: number | null;
  confidence: number;
  prediction_type: string;
  reasoning: { debate?: HomeDebate; homeWinProb?: number } | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_elo?: number | null;
  away_elo?: number | null;
  home_recent_form?: number | null;
  away_recent_form?: number | null;
  is_correct: boolean | null;
  actual_winner: number | null;
  factors: Record<string, number> | null;
  model_version: string | null;
  winner: { code: string | null } | null;
}

interface HomeDebate {
  verdict?: {
    homeWinProb?: number;
    predictedWinner?: string;
    reasoning?: string;
  };
  homeArgument?: { confidence?: number; keyFactor?: string };
  awayArgument?: { confidence?: number; keyFactor?: string };
}

interface HomeGame {
  id: number;
  game_date: string;
  game_time: string | null;
  stadium: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  external_game_id: string | null;
  home_team: { code: string | null; name_ko: string | null } | null;
  away_team: { code: string | null; name_ko: string | null } | null;
  home_sp: { name_ko: string | null } | null;
  away_sp: { name_ko: string | null } | null;
  predictions: HomePrediction[];
}

// v4-4: 10분 ISR (Eng 리뷰 P3)
export const revalidate = 600;

async function getTodayPredictions(): Promise<HomeGame[]> {
  const supabase = await createClient();
  const today = toKSTDateString();

  // assertSelectOk — cycle 157 silent drift family detection. games select 가
  // DB 오류 시 data=null silent → 홈 카드 0건 위장. fail-loud 로 차단.
  const gamesResult = await supabase
    .from('games')
    .select(`
      id, game_date, game_time, stadium, status,
      home_score, away_score, external_game_id,
      home_team:teams!games_home_team_id_fkey(code, name_ko),
      away_team:teams!games_away_team_id_fkey(code, name_ko),
      home_sp:players!games_home_sp_id_fkey(name_ko),
      away_sp:players!games_away_sp_id_fkey(name_ko),
      predictions(
        predicted_winner, confidence, prediction_type, reasoning,
        home_sp_fip, away_sp_fip, home_lineup_woba, away_lineup_woba,
        is_correct, actual_winner, factors, model_version,
        winner:teams!predictions_predicted_winner_fkey(code)
      )
    `)
    .eq('game_date', today)
    .eq('predictions.prediction_type', 'pre_game')
    .order('game_time');
  const { data: games } = assertSelectOk(gamesResult, 'home.getTodayPredictions');

  return (games ?? []) as unknown as HomeGame[];
}

interface NextGameRow {
  id: number;
  game_time: string | null;
  stadium: string | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
}

interface NextSchedule {
  date: string;
  games: Array<{
    id: number;
    gameTime: string;   // "HH:MM"
    stadium: string | null;
    homeTeam: TeamCode;
    awayTeam: TeamCode;
  }>;
}

interface WeekGameDay {
  date: string;
  games: Array<{
    id: number;
    gameTime: string;
    homeTeam: TeamCode;
    awayTeam: TeamCode;
  }>;
}

/** 내일부터 최대 5일간 편성 경기 목록 — "이번 주 일정" 섹션용. */
async function getWeekAheadSchedule(): Promise<WeekGameDay[]> {
  const supabase = await createClient();
  const today = toKSTDateString();

  const until = new Date(`${today}T12:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 7);
  const untilStr = until.toISOString().slice(0, 10);

  const result = await supabase
    .from('games')
    .select(`
      id, game_date, game_time,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code)
    `)
    .gt('game_date', today)
    .lte('game_date', untilStr)
    .eq('status', 'scheduled')
    .order('game_date', { ascending: true })
    .order('game_time', { ascending: true })
    .limit(60);
  const { data } = assertSelectOk(result, 'home.getWeekAheadSchedule');

  if (!data || data.length === 0) return [];

  type WeekRow = { id: number; game_date: string; game_time: string | null; home_team: { code: string } | null; away_team: { code: string } | null };
  const rows = data as unknown as WeekRow[];
  const byDate = new Map<string, WeekGameDay>();
  for (const r of rows) {
    if (!r.home_team?.code || !r.away_team?.code) continue;
    const date = r.game_date;
    if (!byDate.has(date)) byDate.set(date, { date, games: [] });
    byDate.get(date)!.games.push({
      id: r.id,
      gameTime: (r.game_time ?? '').slice(0, 5) || '18:30',
      homeTeam: r.home_team.code as TeamCode,
      awayTeam: r.away_team.code as TeamCode,
    });
  }

  return Array.from(byDate.values()).slice(0, 5);
}

/**
 * 오늘 이후 가장 빠른 편성 날짜 + 그 날의 경기 풀 리스트. 홈 empty-state 에서
 * 휴식/오프 구분 + 5경기 미니카드 + 구장 날씨 조회에 사용.
 */
async function getNextScheduledGames(): Promise<NextSchedule | null> {
  const supabase = await createClient();
  const today = toKSTDateString();

  // assertSelectOk — cycle 157 silent drift family detection. error 시 fail-loud
  // 차단. data=null silent → empty-state "다음 일정 미공개" 위장 회피.
  const gamesResult = await supabase
    .from('games')
    .select(`
      id, game_date, game_time, stadium,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code)
    `)
    .gt('game_date', today)
    .in('status', ['scheduled', 'live'])
    .order('game_date', { ascending: true })
    .order('game_time', { ascending: true })
    .limit(30);
  const { data } = assertSelectOk(gamesResult, 'home.getNextScheduledGames');

  if (!data || data.length === 0) return null;

  const firstDate = data[0].game_date as string;
  const sameDate = (data as unknown as Array<NextGameRow & { game_date: string }>)
    .filter((g) => g.game_date === firstDate);

  return {
    date: firstDate,
    games: sameDate
      .map((g) => ({
        id: g.id,
        gameTime: (g.game_time ?? '').slice(0, 5) || '18:30',
        stadium: g.stadium,
        homeTeam: g.home_team?.code as TeamCode,
        awayTeam: g.away_team?.code as TeamCode,
      }))
      .filter((g) => g.homeTeam && g.awayTeam),
  };
}

/**
 * 다음 경기 날짜 + 오늘 사이 gap 과 요일로 휴식일/시즌오프 구분.
 * - null (다음 경기 전혀 없음) → 시즌오프 또는 시즌 종료
 * - gap > 7일 → 시즌오프/포스트시즌 간격 (올스타 브레이크 포함)
 * - 월요일 + gap ≤ 2일 → 정기 월요일 휴식
 * - 그 외 → 비정기 경기 없음
 */
function classifyNoGameReason(
  today: string,
  next: NextSchedule | null,
): 'offseason' | 'monday_rest' | 'break' | 'unknown' {
  if (!next) return 'offseason';

  const todayAnchor = new Date(`${today}T12:00:00Z`);
  const nextAnchor = new Date(`${next.date}T12:00:00Z`);
  const daysGap = Math.round(
    (nextAnchor.getTime() - todayAnchor.getTime()) / (24 * 60 * 60 * 1000),
  );
  const dayOfWeek = todayAnchor.getUTCDay(); // 0=일, 1=월

  if (daysGap > 7) return 'break';
  if (dayOfWeek === 1 && daysGap <= 2) return 'monday_rest';
  return 'unknown';
}

function formatKoreanWeekday(dateStr: string): string {
  // 서버 timezone (Vercel UTC) 무관하게 날짜 문자열 그대로의 요일.
  // UTC 정오 앵커 + getUTCDay 로 하루 밀리지 않음.
  const d = new Date(`${dateStr}T12:00:00Z`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[d.getUTCDay()];
}

async function getSeasonAccuracy(): Promise<{
  total: number;
  correct: number;
  rate: number;
  tierRates: TierRates;
}> {
  const supabase = await createClient();

  // assertSelectOk — cycle 157 silent drift family detection. predictions select
  // 가 DB 오류 시 data=null silent → 적중률 0% 위장. fail-loud 로 차단.
  const predResult = await supabase
    .from('predictions')
    .select('is_correct, reasoning')
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null);
  const { data } = assertSelectOk(predResult, 'home.getSeasonAccuracy');

  if (!data || data.length === 0) {
    return { total: 0, correct: 0, rate: 0, tierRates: emptyTierRates() };
  }

  const total = data.length;
  const correct = data.filter((p) => p.is_correct).length;
  const tierRates = buildTierRates(
    data as Array<{
      is_correct: boolean | null;
      reasoning: { homeWinProb?: number | null } | null;
    }>,
  );

  return {
    total,
    correct,
    rate: total > 0 ? correct / total : 0,
    tierRates,
  };
}

/**
 * 오늘 경기 중 예측 승자 적중 확률이 가장 높은 경기를 Hero 로 노출.
 *
 * 선택 규칙 (winnerProb = max(hwp, 1-hwp) 기준):
 *   1. 🔥 적중 (winnerProb ≥ 0.65) 있으면 그 중 최고값
 *   2. 없으면 📈 유력 (winnerProb ≥ 0.55) 중 최고값
 *   3. 없으면 winnerProb 최고값 (🤔 반반 이어도 가장 높은 것)
 *   4. 예측 자체 없으면 null (hero 미노출)
 */
function selectBigMatchFromGames(games: HomeGame[]): {
  bigMatch: HomeGame | null;
  result: null;
} {
  if (!isBigMatchEnabled()) return { bigMatch: null, result: null };

  const scored = games
    .map((game) => {
      const pred = game.predictions?.[0];
      const hwp = pred?.reasoning?.debate?.verdict?.homeWinProb ?? pred?.reasoning?.homeWinProb;
      if (hwp == null) return null;
      return { game, wp: winnerProbOf(hwp), tier: classifyWinnerProb(hwp) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (scored.length === 0) return { bigMatch: null, result: null };

  for (const tier of ['confident', 'lean', 'tossup'] as const) {
    const bucket = scored.filter((s) => s.tier === tier);
    if (bucket.length === 0) continue;
    bucket.sort((a, b) => b.wp - a.wp);
    return { bigMatch: bucket[0].game, result: null };
  }

  return { bigMatch: null, result: null };
}

export default async function HomePage() {
  const today = toKSTDisplayString();
  const [games, accuracy, weekSchedule] = await Promise.all([
    getTodayPredictions(),
    getSeasonAccuracy(),
    getWeekAheadSchedule(),
  ]);

  // 오늘 편성 없을 때만 다음 일정·날씨 조회 (추가 쿼리 비용 최소화).
  const nextSchedule =
    games.length === 0 ? await getNextScheduledGames() : null;
  const todayKST = toKSTDateString();
  const noGameReason = classifyNoGameReason(todayKST, nextSchedule);

  // 다음 경기 각 구장 날씨 병렬 조회. 실패해도 null fallback.
  const nextWeather: Array<Awaited<ReturnType<typeof fetchStadiumWeather>>> =
    nextSchedule
      ? await Promise.all(
          nextSchedule.games.map((g) => {
            const coords = KBO_STADIUM_COORDS[g.homeTeam];
            if (!coords) return Promise.resolve(null);
            const [hStr] = g.gameTime.split(':');
            const hour = Number(hStr);
            return fetchStadiumWeather(coords.lat, coords.lng, nextSchedule.date, hour);
          }),
        )
      : [];

  // 오늘 경기 날씨 — predictions/placeholders 카드에 구장+날씨 노출용.
  // 게임 시작 시간 기준 hour 매칭. 실패 경기는 null fallback.
  const todayWeather: Map<number, Awaited<ReturnType<typeof fetchStadiumWeather>>> =
    new Map();
  if (games.length > 0) {
    const results = await Promise.all(
      games.map(async (g) => {
        const homeCode = g.home_team?.code as TeamCode | undefined;
        if (!homeCode) return [g.id, null] as const;
        const coords = KBO_STADIUM_COORDS[homeCode];
        if (!coords) return [g.id, null] as const;
        const hour = Number((g.game_time ?? '18:30').slice(0, 2));
        const w = await fetchStadiumWeather(
          coords.lat, coords.lng, todayKST, hour,
        );
        return [g.id, w] as const;
      }),
    );
    for (const [id, w] of results) todayWeather.set(id, w);
  }

  const { bigMatch } = selectBigMatchFromGames(games);
  const bigMatchPred = bigMatch?.predictions?.[0];
  const bigMatchDebate = bigMatchPred?.reasoning?.debate;
  const hasBigMatchHero = bigMatch && bigMatchDebate?.verdict;
  const bigMatchId = bigMatch?.id;

  return (
    <div className="space-y-8">
      {/* 실시간 스코어 */}
      <LiveScoreboard />

      {/* 고확신 예측 Hero — 오늘 가장 강한 확신 경기 1건 (flag enabled 시) */}
      {hasBigMatchHero ? (
        <BigMatchDebateCard
          gameId={bigMatch.id}
          homeTeam={bigMatch.home_team?.code as TeamCode}
          awayTeam={bigMatch.away_team?.code as TeamCode}
          homeWinProb={bigMatchDebate.verdict?.homeWinProb ?? 0.5}
          predictedWinner={bigMatchDebate.verdict?.predictedWinner as TeamCode}
          reasoning={bigMatchDebate.verdict?.reasoning ?? ''}
          homeConfidence={bigMatchDebate.homeArgument?.confidence}
          awayConfidence={bigMatchDebate.awayArgument?.confidence}
          homeKeyFactor={bigMatchDebate.homeArgument?.keyFactor}
          awayKeyFactor={bigMatchDebate.awayArgument?.keyFactor}
        />
      ) : (
        <section className="bg-gradient-to-r from-brand-800 to-brand-700 rounded-2xl p-6 md:p-8 text-white">
          <p className="text-brand-300 text-sm mb-1">{today}</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">오늘의 승부예측</h1>
          <p className="text-brand-200">
            KBO {games.length}경기 세이버메트릭스 기반 분석
          </p>
        </section>
      )}

      {/* 적중률 요약 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AccuracySummary
          total={accuracy.total}
          correct={accuracy.correct}
          rate={accuracy.rate}
          tierRates={accuracy.tierRates}
        />
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            오늘 경기 수
          </h3>
          <span className="text-4xl font-bold">{games.length}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">경기</span>
        </div>
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">모델 버전</h3>
          <span className="text-4xl font-bold">v1.6</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">10팩터 3소스 가중합산</p>
        </div>
      </section>

      {/* 예측 카드 목록 */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">경기별 예측</h2>
          <Link
            href="/predictions"
            className="text-sm text-brand-600 hover:text-brand-800 hover:underline"
          >
            전체 보기 →
          </Link>
        </div>

        {games.length > 0 && (
          <FavoriteTeamFilter
            games={games.map((g) => ({
              gameId: g.id,
              homeCode: (g.home_team?.code as TeamCode) ?? null,
              awayCode: (g.away_team?.code as TeamCode) ?? null,
            }))}
          />
        )}

        {games.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => {
              const pred = game.predictions?.[0];
              const homeCode = game.home_team?.code as TeamCode;
              const awayCode = game.away_team?.code as TeamCode;
              if (!pred) {
                return (
                  <div key={game.id} data-game-id={game.id}>
                    <PlaceholderCardLive
                      homeTeam={homeCode}
                      awayTeam={awayCode}
                      gameTime={game.game_time?.slice(0, 5)}
                      status={game.status}
                      homeSPName={game.home_sp?.name_ko ?? undefined}
                      awaySPName={game.away_sp?.name_ko ?? undefined}
                    />
                  </div>
                );
              }
              const homeWinProbRaw = pred.reasoning?.homeWinProb;
              const winProb =
                homeWinProbRaw != null
                  ? pred.winner?.code === homeCode
                    ? homeWinProbRaw
                    : 1 - homeWinProbRaw
                  : undefined;
              return (
                <div key={game.id} data-game-id={game.id}>
                  <PredictionCardLive
                    homeTeam={homeCode}
                    awayTeam={awayCode}
                    confidence={pred.confidence}
                    predictedWinner={pred.winner?.code as TeamCode}
                    homeSPName={game.home_sp?.name_ko ?? undefined}
                    awaySPName={game.away_sp?.name_ko ?? undefined}
                    homeSPFip={pred.home_sp_fip ?? undefined}
                    awaySPFip={pred.away_sp_fip ?? undefined}
                    homeWoba={pred.home_lineup_woba ?? undefined}
                    awayWoba={pred.away_lineup_woba ?? undefined}
                    gameTime={game.game_time?.slice(0, 5)}
                    isCorrect={pred.is_correct}
                    homeScore={game.home_score}
                    awayScore={game.away_score}
                    winProb={winProb}
                    gameId={game.id}
                    isBigMatch={game.id === bigMatchId}
                    stadium={game.stadium || KBO_STADIUM_SHORT[homeCode]}
                    weather={todayWeather.get(game.id)}
                    status={game.status}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-2xl border border-gray-200 dark:border-[var(--color-border)] p-6 md:p-8">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">⚾</span>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                {noGameReason === 'monday_rest'
                  ? '오늘은 KBO 휴식일입니다'
                  : noGameReason === 'break'
                    ? '시즌 브레이크 기간입니다'
                    : noGameReason === 'offseason'
                      ? '시즌 오프 기간입니다'
                      : '오늘은 편성된 경기가 없습니다'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {noGameReason === 'monday_rest'
                  ? 'KBO 리그는 매주 월요일 정기 휴식.'
                  : noGameReason === 'break'
                    ? '올스타 브레이크 또는 포스트시즌 간격일 수 있습니다.'
                    : noGameReason === 'offseason'
                      ? '정규시즌 개막 전이거나 시즌이 종료되었습니다.'
                      : '비정기 휴식일입니다.'}
              </p>
            </div>

            {nextSchedule ? (
              <div>
                <div className="flex items-baseline justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    다음 경기 일정
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {nextSchedule.date}
                    <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                      ({formatKoreanWeekday(nextSchedule.date)})
                    </span>
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      · {nextSchedule.games.length}경기
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {nextSchedule.games.map((g, i) => (
                    <MiniGameCard
                      key={g.id}
                      homeTeam={g.homeTeam}
                      awayTeam={g.awayTeam}
                      gameTime={g.gameTime}
                      stadium={g.stadium || KBO_STADIUM_SHORT[g.homeTeam]}
                      weather={nextWeather[i]}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center mt-4 text-xs text-gray-400 dark:text-gray-500">
                아직 다음 경기 일정이 공개되지 않았습니다.
              </p>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/predictions"
                className="inline-block text-sm text-brand-600 hover:underline"
              >
                지난 예측 보기 →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 이번 주 경기 일정 */}
      {weekSchedule.length > 0 && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-2xl border border-gray-200 dark:border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">이번 주 일정</h2>
            <Link href="/predictions" className="text-xs text-brand-600 hover:underline">
              예측 기록 →
            </Link>
          </div>
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="flex gap-3 min-w-max pb-1">
              {weekSchedule.map(({ date, games: dayGames }) => (
                <div key={date} className="w-48 shrink-0">
                  <Link
                    href={`/predictions/${date}`}
                    className="flex items-baseline gap-1.5 mb-2 group"
                  >
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-brand-600 transition-colors">
                      {formatKoreanWeekday(date)}요일
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {date.slice(5).replace('-', '/')}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                      {dayGames.length}경기
                    </span>
                  </Link>
                  <div className="space-y-1.5">
                    {dayGames.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between bg-gray-50 dark:bg-[var(--color-surface)] rounded-lg px-2.5 py-2 text-xs"
                      >
                        <span className="text-gray-600 dark:text-gray-300 w-12 truncate">
                          {shortTeamName(g.awayTeam)}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 text-[10px] mx-1">@</span>
                        <span className="font-medium text-gray-800 dark:text-gray-100 w-12 truncate text-right">
                          {shortTeamName(g.homeTeam)}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 text-[10px] ml-1.5 tabular-nums shrink-0">
                          {g.gameTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 방법론 소개 v1.6 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-2xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">분석 방법론</h2>
          <Link href="/about" className="text-xs text-brand-600 hover:underline">
            자세히 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "선발 FIP + xFIP", weight: "20%", icon: "🎯" },
            { label: "타선 wOBA", weight: "15%", icon: "💪" },
            { label: "불펜 + 수비", weight: "15%", icon: "🛡" },
            { label: "최근 폼 + 상대전적", weight: "15%", icon: "📈" },
            { label: "Elo + WAR", weight: "16%", icon: "⚡" },
            { label: "구장 + 홈어드밴티지", weight: "5.5%", icon: "🏟" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-[var(--color-surface)] rounded-lg border border-brand-100 dark:border-[var(--color-border)]">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-sm text-brand-600 dark:text-brand-400 font-bold">{item.weight}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
