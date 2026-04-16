import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";
import Link from "next/link";

export const metadata: Metadata = {
  title: "예측 결과 리뷰",
  description: "KBO 승부예측 적중 vs 실패 결과 분석. 날짜별 성과 추적.",
};

export const revalidate = 600;

async function getVerifiedPredictions() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('predictions')
    .select(`
      confidence, is_correct, prediction_type,
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

  return data ?? [];
}

export default async function ReviewsPage() {
  const predictions = await getVerifiedPredictions();

  const total = predictions.length;
  const correct = predictions.filter((p) => p.is_correct).length;
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">예측 결과 리뷰</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          AI 예측의 적중과 실패를 경기별로 추적합니다.
        </p>
      </div>

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
            {predictions.map((pred: any, i: number) => {
              const game = pred.game;
              if (!game) return null;
              const homeCode = game.home_team?.code as TeamCode;
              const awayCode = game.away_team?.code as TeamCode;
              const homeName = KBO_TEAMS[homeCode]?.name.split(' ')[0] ?? homeCode;
              const awayName = KBO_TEAMS[awayCode]?.name.split(' ')[0] ?? awayCode;
              const winnerCode = pred.predicted_winner_team?.code as TeamCode;
              const winnerName = KBO_TEAMS[winnerCode]?.name.split(' ')[0] ?? '';
              const pct = Math.round((0.5 + pred.confidence / 2) * 100);

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
