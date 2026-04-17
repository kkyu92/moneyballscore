import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { KBO_TEAMS, toKSTDateString, type TeamCode } from '@moneyball/shared';
import { selectBigMatch, type BigMatchCandidate } from '@moneyball/kbo-data';

// v4-4 Phase 1-1: /analysis 는 '오늘 빅매치' 전용. 시즌 누적 성과는 /dashboard 에 통합.

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

  const candidates: BigMatchCandidate[] = [];
  for (const g of games) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const game = g as any;
    const pred = game.predictions?.[0];
    if (!pred) continue;
    candidates.push({
      gameId: game.id,
      homeTeam: game.home_team?.code,
      awayTeam: game.away_team?.code,
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

export default async function AnalysisIndexPage() {
  const bigMatch = await getTodayBigMatch();

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <header className="border-b border-gray-200 dark:border-[var(--color-border)] pb-4">
        <h1 className="text-3xl font-bold mb-2">AI 분석 센터</h1>
        <p className="text-gray-600 dark:text-gray-300">
          오늘의 빅매치 AI 에이전트 토론
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
