import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  assertSelectOk,
  classifyWinnerProb,
  pickTierEmoji,
  shortTeamName,
  toKSTDateString,
  winnerProbOf,
  type SelectResult,
  type TeamCode,
} from '@moneyball/shared';
import { selectBigMatch, type BigMatchCandidate } from '@moneyball/kbo-data';
import { getYesterdayKSTDateString } from '@/lib/predictions/yesterdayDate';
import { getCurrentWeek } from '@/lib/reviews/computeWeekRange';
import { getCurrentMonth } from '@/lib/reviews/computeMonthRange';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export const metadata: Metadata = {
  title: 'AI 분석 — 오늘 전체 예측 + 빅매치 + 어제 경기',
  description: '오늘 KBO 전체 AI 예측 + 빅매치 에이전트 토론 + 어제 경기 분석. 확신 순으로 정렬.',
  alternates: { canonical: 'https://moneyballscore.vercel.app/analysis' },
};

export const revalidate = 3600;

interface TodayAllRow {
  id: number;
  game_time: string | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
    confidence: number;
    home_elo: number | null;
    away_elo: number | null;
    home_recent_form: number | null;
    away_recent_form: number | null;
    prediction_type: string;
    reasoning: { homeWinProb?: number | null } | null;
    predicted_winner_team: { code: string | null } | null;
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
      id, game_time,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        confidence, home_elo, away_elo, home_recent_form, away_recent_form,
        prediction_type, reasoning,
        predicted_winner_team:teams!predictions_predicted_winner_fkey(code)
      )
    `)
    .eq('game_date', today)
    .eq('predictions.prediction_type', 'pre_game')
    .order('game_time', { ascending: true })) as SelectResult<TodayAllRow[]>;

  const { data: rawGames } = assertSelectOk(gamesResult, 'analysis getTodayAnalysisData');

  if (!rawGames) {
    return { bigMatchId: null, bigMatchMode: 'no-games', bigMatchHomeCode: null, bigMatchAwayCode: null, games: [] };
  }

  const rows = rawGames as unknown as TodayAllRow[];
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
      homeElo: pred.home_elo ?? 1500,
      awayElo: pred.away_elo ?? 1500,
      homeRecentForm: pred.home_recent_form ?? 0.5,
      awayRecentForm: pred.away_recent_form ?? 0.5,
      confidence: pred.confidence ?? 0.5,
    });

    cards.push({
      gameId: game.id,
      gameTime: game.game_time,
      homeCode,
      awayCode,
      predictedWinnerCode: (pred.predicted_winner_team?.code as TeamCode | null) ?? null,
      homeWinProb: winnerProbOf(pred.reasoning?.homeWinProb),
      confidence: pred.confidence ?? 0.5,
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

  // assertSelectOk — cycle 148 silent drift family detection. error 시 fail-loud
  // (기존엔 `data ?? []` silent fallback → 어제 경기 0 silent 위장 → 사용자 가시
  // 빈 카드 영역). cycle 147 family 자연 후속.
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

interface MonthlyStats {
  total: number;
  correct: number;
}

async function getMonthlyStats(startDate: string, endDate: string): Promise<MonthlyStats> {
  const supabase = await createClient();
  const result = (await supabase
    .from('predictions')
    .select('is_correct, game:games!predictions_game_id_fkey(game_date)')
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null)
    .gte('game.game_date', startDate)
    .lte('game.game_date', endDate)) as SelectResult<Array<{ is_correct: boolean | null }>>;

  const { data } = assertSelectOk(result, 'analysis getMonthlyStats');
  const rows = (data ?? []) as Array<{ is_correct: boolean | null }>;
  const total = rows.length;
  const correct = rows.filter((r) => r.is_correct === true).length;
  return { total, correct };
}

export default async function AnalysisIndexPage() {
  const currentMonth = getCurrentMonth();
  const [todayData, yesterdayGames, monthlyStats] = await Promise.all([
    getTodayAnalysisData(),
    getYesterdayGames(),
    getMonthlyStats(currentMonth.startDate, currentMonth.endDate),
  ]);
  const currentWeek = getCurrentWeek();

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <Breadcrumb items={[{ label: 'AI 분석' }]} />
      <header className="border-b border-gray-200 dark:border-[var(--color-border)] pb-4">
        <h1 className="text-3xl font-bold mb-2">AI 분석 센터</h1>
        <p className="text-gray-600 dark:text-gray-300">
          오늘의 전체 AI 예측 · 빅매치 에이전트 토론 · 어제 경기 분석을 한 곳에서.
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
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
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
            {todayData.games.map((g) => {
              const homeName = shortTeamName(g.homeCode);
              const awayName = shortTeamName(g.awayCode);
              const winnerCode = g.predictedWinnerCode;
              const winnerName = winnerCode ? shortTeamName(winnerCode) : null;
              const winnerPct = winnerCode === g.homeCode
                ? Math.round(g.homeWinProb * 100)
                : Math.round((1 - g.homeWinProb) * 100);
              const tier = classifyWinnerProb(g.homeWinProb);
              const isBig = g.gameId === todayData.bigMatchId;
              return (
                <li key={g.gameId}>
                  <Link
                    href={`/analysis/game/${g.gameId}`}
                    className={`block rounded-xl border p-4 hover:shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      isBig
                        ? 'bg-white dark:bg-[var(--color-surface-card)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20'
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
                              ? 'text-green-600 dark:text-green-400'
                              : tier === 'lean'
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {pickTierEmoji(tier)} {winnerPct}%
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
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
              return (
                <li key={g.gameId}>
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
                              ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
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
                {currentWeek.label} 경기 결과·예측 성과 요약
              </p>
            </div>
          </div>
        </Link>
      </section>

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
    </div>
  );
}
