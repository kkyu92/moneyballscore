import { PredictionCard } from "@/components/predictions/PredictionCard";
import { PlaceholderCard } from "@/components/predictions/PlaceholderCard";
import { AccuracySummary } from "@/components/dashboard/AccuracySummary";
import { BigMatchDebateCard } from "@/components/analysis/BigMatchDebateCard";
import { LiveScoreboard } from "@/components/live/LiveScoreboard";
import { toKSTDateString, toKSTDisplayString, type TeamCode } from "@moneyball/shared";
import { selectBigMatch, type BigMatchCandidate } from "@moneyball/kbo-data";
import { isBigMatchEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { FavoriteTeamFilter } from "@/components/shared/FavoriteTeamFilter";
import Link from "next/link";

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

  const { data: games } = await supabase
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

  return (games ?? []) as unknown as HomeGame[];
}

/**
 * 오늘 이후 가장 빠른 편성 경기 날짜 + 개요. 홈 empty-state 에서 사용.
 * 오늘 경기가 없는 날 (KBO 월요일 휴식 / 시즌오프) 에 "다음 경기 일정" 노출.
 * status 가 scheduled/live 인 것만 — postponed/final 은 미래 일정이라도 제외.
 */
async function getNextScheduledDate(): Promise<{
  date: string;
  count: number;
  firstGameTime: string | null;
} | null> {
  const supabase = await createClient();
  const today = toKSTDateString();

  const { data } = await supabase
    .from('games')
    .select('game_date, game_time, status')
    .gt('game_date', today)
    .in('status', ['scheduled', 'live'])
    .order('game_date', { ascending: true })
    .order('game_time', { ascending: true })
    .limit(30);

  if (!data || data.length === 0) return null;

  const firstDate = data[0].game_date as string;
  const sameDate = data.filter((g) => g.game_date === firstDate);
  const firstGameTime = (sameDate[0].game_time as string | null)?.slice(0, 5) ?? null;

  return {
    date: firstDate,
    count: sameDate.length,
    firstGameTime,
  };
}

function formatKoreanWeekday(dateStr: string): string {
  // 서버 timezone (Vercel UTC) 무관하게 날짜 문자열 그대로의 요일.
  // UTC 정오 앵커 + getUTCDay 로 하루 밀리지 않음.
  const d = new Date(`${dateStr}T12:00:00Z`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[d.getUTCDay()];
}

async function getSeasonAccuracy() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('predictions')
    .select('is_correct, confidence')
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null);

  if (!data || data.length === 0) {
    return { total: 0, correct: 0, rate: 0, highConfRate: 0 };
  }

  const total = data.length;
  const correct = data.filter((p) => p.is_correct).length;
  const highConf = data.filter((p) => p.confidence >= 0.4); // 70%+ 승리확률
  const highConfCorrect = highConf.filter((p) => p.is_correct).length;

  return {
    total,
    correct,
    rate: total > 0 ? correct / total : 0,
    highConfRate: highConf.length > 0 ? highConfCorrect / highConf.length : 0,
  };
}

function selectBigMatchFromGames(games: HomeGame[]): {
  bigMatch: HomeGame | null;
  result: ReturnType<typeof selectBigMatch> | null;
} {
  if (!isBigMatchEnabled()) return { bigMatch: null, result: null };

  const candidates: BigMatchCandidate[] = [];
  for (const game of games) {
    const pred = game.predictions?.[0];
    if (!pred) continue;
    const homeCode = game.home_team?.code as TeamCode | undefined;
    const awayCode = game.away_team?.code as TeamCode | undefined;
    if (!homeCode || !awayCode) continue;
    candidates.push({
      gameId: game.id,
      homeTeam: homeCode,
      awayTeam: awayCode,
      homeElo: pred.home_elo ?? 1500,
      awayElo: pred.away_elo ?? 1500,
      homeRecentForm: pred.home_recent_form ?? 0.5,
      awayRecentForm: pred.away_recent_form ?? 0.5,
      confidence: pred.confidence ?? 0.5,
    });
  }

  const result = selectBigMatch(candidates);
  const bigMatch = result.bigMatchGameId
    ? (games.find((g) => g.id === result.bigMatchGameId) ?? null)
    : null;
  return { bigMatch, result };
}

export default async function HomePage() {
  const today = toKSTDisplayString();
  const [games, accuracy] = await Promise.all([
    getTodayPredictions(),
    getSeasonAccuracy(),
  ]);

  // 오늘 편성 없을 때만 다음 일정 조회 (추가 쿼리 비용 최소화).
  const nextSchedule =
    games.length === 0 ? await getNextScheduledDate() : null;

  const { bigMatch } = selectBigMatchFromGames(games);
  const bigMatchPred = bigMatch?.predictions?.[0];
  const bigMatchDebate = bigMatchPred?.reasoning?.debate;
  const hasBigMatchHero = bigMatch && bigMatchDebate?.verdict;
  const bigMatchId = bigMatch?.id;

  return (
    <div className="space-y-8">
      {/* 실시간 스코어 */}
      <LiveScoreboard />

      {/* v4-4 빅매치 Hero (flag enabled + 데이터 있을 때) */}
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
          highConfRate={accuracy.highConfRate}
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
          <span className="text-4xl font-bold">v1.5</span>
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
                    <PlaceholderCard
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
                  <PredictionCard
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
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-2xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
            <span className="text-5xl block mb-4">⚾</span>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
              오늘은 편성된 경기가 없습니다
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              KBO 리그 휴식일이거나 시즌 오프입니다.
            </p>

            {nextSchedule ? (
              <div className="mt-6 inline-block text-left bg-brand-50 dark:bg-[var(--color-surface-raised)] border border-brand-200 dark:border-[var(--color-border)] rounded-xl px-5 py-4">
                <p className="text-xs uppercase tracking-wider text-brand-700 dark:text-brand-300 font-semibold mb-1">
                  다음 경기 일정
                </p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {nextSchedule.date}
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-2">
                    ({formatKoreanWeekday(nextSchedule.date)})
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {nextSchedule.count}경기 편성
                  {nextSchedule.firstGameTime && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {' · '}첫 경기 {nextSchedule.firstGameTime}
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                아직 다음 경기 일정이 공개되지 않았습니다.
              </p>
            )}

            <div className="mt-6">
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

      {/* 방법론 소개 v1.5 */}
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
            { label: "구장 + 홈어드밴티지", weight: "7%", icon: "🏟" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-[var(--color-surface-card)] rounded-lg border border-brand-100 dark:border-[var(--color-border)]">
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
