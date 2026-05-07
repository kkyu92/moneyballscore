import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  type TeamCode,
  shortTeamName,
  winnerProbOf,
  assertSelectOk,
} from '@moneyball/shared';
import Link from "next/link";
import { getRecentWeeks } from "@/lib/reviews/computeWeekRange";
import { getRecentMonths } from "@/lib/reviews/computeMonthRange";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const metadata: Metadata = {
  title: "예측 결과 리뷰",
  description: "승부예측 적중 vs 실패 결과 분석. 날짜별 성과 추적.",
  alternates: { canonical: "https://moneyballscore.vercel.app/reviews" },
};

export const revalidate = 600;

interface VerifiedPredictionRow {
  confidence: number;
  is_correct: boolean | null;
  prediction_type: string;
  reasoning: { homeWinProb?: number | null } | null;
  predicted_winner_team: { code: string | null; name_ko: string | null } | null;
  game: {
    id: number;
    game_date: string;
    game_time: string | null;
    home_score: number | null;
    away_score: number | null;
    status: string | null;
    home_team: { code: string | null; name_ko: string | null } | null;
    away_team: { code: string | null; name_ko: string | null } | null;
  } | null;
}

async function getVerifiedPredictions(): Promise<VerifiedPredictionRow[]> {
  const supabase = await createClient();

  // assertSelectOk — cycle 154 silent drift family detection. predictions select
  // 가 .error 미체크 → DB 오류 시 data=null silent fallback → 빈 배열 위장 →
  // "아직 검증된 예측이 없습니다" 가짜 노출 + 적중률 0% silent 0/0 (실제로는 DB
  // 오류). cycle 148/153 동일 family. assertSelectOk 로 fail-loud → error.tsx
  // boundary 처리.
  const result = await supabase
    .from('predictions')
    .select(`
      confidence, is_correct, prediction_type, reasoning,
      predicted_winner_team:teams!predictions_predicted_winner_fkey(code, name_ko),
      game:games!predictions_game_id_fkey(
        id, game_date, game_time, home_score, away_score, status,
        home_team:teams!games_home_team_id_fkey(code, name_ko),
        away_team:teams!games_away_team_id_fkey(code, name_ko)
      )
    `)
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  const { data } = assertSelectOk(result, "reviews getVerifiedPredictions");
  return (data ?? []) as unknown as VerifiedPredictionRow[];
}

export default async function ReviewsPage() {
  const predictions = await getVerifiedPredictions();
  const recentWeeks = getRecentWeeks(4);
  const recentMonths = getRecentMonths(3);

  const total = predictions.length;
  const correct = predictions.filter((p) => p.is_correct).length;
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: '예측 결과 리뷰' }]} />
      <div>
        <h1 className="text-3xl font-bold">예측 결과 리뷰</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          AI 예측의 적중과 실패를 경기별로 추적합니다.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-gradient-to-r from-brand-500/5 to-accent/5 dark:from-brand-500/10 dark:to-accent/10 rounded-xl border border-brand-500/20 p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                📅 주간 리뷰
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                매주 하이라이트 · 팀별 성과 · 팩터 인사이트
              </p>
            </div>
            <Link
              href={`/reviews/weekly/${recentWeeks[recentWeeks.length - 1].weekId}`}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              이번 주 →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentWeeks.map((w) => (
              <Link
                key={w.weekId}
                href={`/reviews/weekly/${w.weekId}`}
                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                {w.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent/5 to-brand-500/5 dark:from-accent/10 dark:to-brand-500/10 rounded-xl border border-accent/30 p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                📆 월간 리뷰
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                전월 대비 diff · 팀 순위 · 팩터 장기 트렌드
              </p>
            </div>
            <Link
              href={`/reviews/monthly/${recentMonths[recentMonths.length - 1].monthId}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              이번 달 →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentMonths.map((m) => (
              <Link
                key={m.monthId}
                href={`/reviews/monthly/${m.monthId}`}
                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-accent hover:text-accent transition-colors"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/reviews/misses"
          className="group bg-gradient-to-r from-red-500/5 to-orange-500/5 dark:from-red-500/10 dark:to-orange-500/10 rounded-xl border border-red-500/20 p-5 flex flex-col justify-between hover:border-red-500/50 transition-colors"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              🧭 회고 · 크게 빗나간 예측
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              고확신 실패 사례의 사후 분석. 편향 지목 팩터와 놓친 것 공개.
            </p>
          </div>
          <span className="text-sm font-medium text-red-600 dark:text-red-400 mt-3 group-hover:underline self-start">
            회고 보기 →
          </span>
        </Link>
      </section>

      {total > 0 ? (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">총 검증</p>
              <p className="text-3xl font-bold mt-1">{total}<span className="text-sm text-gray-400 dark:text-gray-500 ml-1">경기</span></p>
            </div>
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">적중</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{correct}<span className="text-sm text-gray-400 dark:text-gray-500 ml-1">경기</span></p>
            </div>
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">적중률</p>
              <p className={`text-3xl font-bold mt-1 ${rate >= 60 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {rate}%
              </p>
            </div>
          </div>

          {/* 경기 목록 */}
          <div className="space-y-3">
            {predictions.map((pred, i) => {
              const game = pred.game;
              if (!game) return null;
              const homeCode = game.home_team?.code as TeamCode;
              const awayCode = game.away_team?.code as TeamCode;
              const homeName = shortTeamName(homeCode);
              const awayName = shortTeamName(awayCode);
              const winnerCode = pred.predicted_winner_team?.code as TeamCode;
              const winnerName = shortTeamName(winnerCode);
              const pct = Math.round(winnerProbOf(pred.reasoning?.homeWinProb) * 100);

              return (
                <Link
                  key={`${game.id}-${i}`}
                  href={`/analysis/game/${game.id}`}
                  className="flex items-center justify-between bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      pred.is_correct
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {pred.is_correct ? '적중' : '실패'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {awayName} {game.away_score ?? ''} : {game.home_score ?? ''} {homeName}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{game.game_date}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {winnerName} {pct}% 예측
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-2xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <span className="text-5xl block mb-4">📊</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            아직 검증된 예측이 없습니다
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            매일 KST 23:00에 경기 결과가 반영되면 여기서 적중/실패를 확인할 수 있습니다.
          </p>
          <Link href="/" className="inline-block mt-4 text-sm text-brand-600 hover:underline">
            오늘의 예측 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
