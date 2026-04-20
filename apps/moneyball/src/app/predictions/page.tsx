import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata: Metadata = {
  title: "예측 기록",
  description: "승부예측 기록. 날짜별 세이버메트릭스 기반 경기 분석.",
};

export const revalidate = 300;

async function getPredictionDates() {
  const supabase = await createClient();

  // LEFT JOIN: prediction 없는 편성 경기도 포함. pre_game 타입만 붙여서
  // post_game row 가 있어도 예측 카운트 이중집계 방지.
  const { data } = await supabase
    .from('games')
    .select('game_date, status, predictions(id, is_correct, prediction_type)')
    .eq('predictions.prediction_type', 'pre_game')
    .order('game_date', { ascending: false })
    .limit(200);

  if (!data) return [];

  // 날짜별 그룹핑. total = 편성 경기 (LEFT JOIN 총 game row).
  // predicted = prediction row 있는 경기. missing = total - predicted.
  // cancelled = postponed 경기. verified = is_correct 명시된 경기 (취소 제외).
  const dateMap = new Map<
    string,
    {
      total: number;
      predicted: number;
      missing: number;
      cancelled: number;
      verified: number;
      correct: number;
    }
  >();
  for (const game of data) {
    const date = game.game_date;
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        total: 0, predicted: 0, missing: 0,
        cancelled: 0, verified: 0, correct: 0,
      });
    }
    const entry = dateMap.get(date)!;
    entry.total += 1;
    if (game.status === 'postponed') entry.cancelled += 1;
    const pred = game.predictions?.[0];
    if (pred) {
      entry.predicted += 1;
      if (game.status !== 'postponed' && pred.is_correct !== null) {
        entry.verified += 1;
        if (pred.is_correct) entry.correct += 1;
      }
    } else {
      entry.missing += 1;
    }
  }

  return Array.from(dateMap.entries()).map(([date, stats]) => ({
    date,
    ...stats,
  }));
}

export default async function PredictionsPage() {
  const dates = await getPredictionDates();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">예측 기록</h1>
      <p className="text-gray-500 dark:text-gray-400">날짜별 승부예측 기록입니다.</p>

      {dates.length > 0 ? (
        <div className="space-y-2">
          {dates.map((d) => (
            <Link
              key={d.date}
              href={`/predictions/${d.date}`}
              className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div>
                    <span className="font-bold text-lg">{d.date}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-3">
                      {d.total}경기 편성
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-x-2">
                    <span>예측 {d.predicted}</span>
                    {d.cancelled > 0 && (
                      <span className="text-gray-400 dark:text-gray-500">
                        · 취소 {d.cancelled}
                      </span>
                    )}
                    {d.missing > 0 && (
                      <span className="text-gray-400 dark:text-gray-500">
                        · 기록 없음 {d.missing}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {d.verified > 0 ? (
                    <span
                      className={`text-sm font-bold ${
                        d.correct / d.verified >= 0.6
                          ? "text-green-600"
                          : d.correct / d.verified >= 0.5
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {d.correct}/{d.verified} 적중 (
                      {Math.round((d.correct / d.verified) * 100)}%)
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">결과 대기</span>
                  )}
                  <span className="text-gray-400 dark:text-gray-500">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-8 text-center text-gray-400 dark:text-gray-500">
          <p className="text-lg">예측 기록이 아직 없습니다.</p>
          <p className="text-sm mt-2">
            파이프라인이 실행되면 자동으로 데이터가 채워집니다.
          </p>
        </div>
      )}
    </div>
  );
}
