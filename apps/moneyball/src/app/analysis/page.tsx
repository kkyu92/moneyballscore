import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  shortTeamName,
  toKSTDateString,
  winnerProbOf,
  type TeamCode,
} from '@moneyball/shared';
import { selectBigMatch, type BigMatchCandidate } from '@moneyball/kbo-data';
import { getYesterdayKSTDateString } from '@/lib/predictions/yesterdayDate';

// v4-4 Phase 1-1: /analysis 는 '오늘 빅매치' 전용. 시즌 누적 성과는 /dashboard 에 통합.
// develop-cycle 1 (2026-04-30, site): "어제 경기" 진입점 보강 — 빅매치 외 경기 분석 retention.

export const metadata: Metadata = {
  title: 'AI 분석 — 오늘 빅매치 + 어제 경기',
  description: '오늘 KBO 빅매치 + 어제 경기 AI 분석. 심판 판정 · 팀 논거 · 팩터 해석까지.',
  alternates: { canonical: 'https://moneyballscore.vercel.app/analysis' },
};

export const revalidate = 3600; // 1시간 ISR

async function getTodayBigMatch() {
  const supabase = await createClient();
  const today = toKSTDateString();

  const { data: games } = await supabase
    .from('games')
    .select(`
      id,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        confidence, home_elo, away_elo, home_recent_form, away_recent_form,
        prediction_type
      )
    `)
    .eq('game_date', today)
    .eq('predictions.prediction_type', 'pre_game');

  if (!games) return { bigMatchId: null, candidates: 0 };

  interface BigMatchRow {
    id: number;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
    predictions: Array<{
      confidence: number;
      home_elo: number | null;
      away_elo: number | null;
      home_recent_form: number | null;
      away_recent_form: number | null;
      prediction_type: string;
    }>;
  }

  const rows = games as unknown as BigMatchRow[];
  const candidates: BigMatchCandidate[] = [];
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
  }

  const result = selectBigMatch(candidates);
  return { bigMatchId: result.bigMatchGameId, mode: result.mode, candidates: candidates.length };
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

async function getYesterdayGames(): Promise<YesterdayGameCard[]> {
  const supabase = await createClient();
  const yesterday = getYesterdayKSTDateString();

  const { data } = await supabase
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
    .order('game_time', { ascending: true });

  if (!data) return [];

  interface Row {
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

  const rows = data as unknown as Row[];
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

export default async function AnalysisIndexPage() {
  const [bigMatch, yesterdayGames] = await Promise.all([
    getTodayBigMatch(),
    getYesterdayGames(),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <header className="border-b border-gray-200 dark:border-[var(--color-border)] pb-4">
        <h1 className="text-3xl font-bold mb-2">AI 분석 센터</h1>
        <p className="text-gray-600 dark:text-gray-300">
          오늘의 빅매치 AI 에이전트 토론과 어제 경기 분석을 한 곳에서.
        </p>
      </header>

      {/* 오늘의 빅매치 */}
      <section aria-labelledby="big-match-title">
        <h2 id="big-match-title" className="text-xl font-bold mb-4">
          ⭐ 오늘의 빅매치
        </h2>
        {bigMatch.bigMatchId ? (
          <Link
            href={`/analysis/game/${bigMatch.bigMatchId}`}
            className="block bg-gradient-to-br from-[var(--color-bg-hero-start)] to-[var(--color-bg-hero-end)] text-white rounded-2xl p-8 hover:shadow-xl transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <p className="text-sm text-brand-200 mb-2">
              AI 에이전트 토론 대상 경기
            </p>
            <p className="text-2xl font-bold">상세 분석 보기 →</p>
          </Link>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
            {bigMatch.mode === 'no-games' ? (
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
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
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
