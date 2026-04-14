import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata: Metadata = {
  title: "예측 기록",
  description: "KBO 승부예측 기록. 날짜별 세이버메트릭스 기반 경기 분석.",
};

export const revalidate = 300;

async function getPredictionDates() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('games')
    .select('game_date, predictions!inner(id, is_correct, prediction_type)')
    .eq('predictions.prediction_type', 'pre_game')
    .order('game_date', { ascending: false })
    .limit(200);

  if (!data) return [];

  // 날짜별 그룹핑
  const dateMap = new Map<string, { total: number; correct: number; verified: number }>();
  for (const game of data) {
    const date = game.game_date;
    if (!dateMap.has(date)) {
      dateMap.set(date, { total: 0, correct: 0, verified: 0 });
    }
    const entry = dateMap.get(date)!;
    entry.total += game.predictions.length;
    for (const pred of game.predictions) {
      if (pred.is_correct !== null) {
        entry.verified++;
        if (pred.is_correct) entry.correct++;
      }
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
      <p className="text-gray-500">날짜별 승부예측 기록입니다.</p>

      {dates.length > 0 ? (
        <div className="space-y-2">
          {dates.map((d) => (
            <Link
              key={d.date}
              href={`/predictions/${d.date}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-lg">{d.date}</span>
                  <span className="text-sm text-gray-500 ml-3">
                    {d.total}경기 예측
                  </span>
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
                    <span className="text-sm text-gray-400">결과 대기</span>
                  )}
                  <span className="text-gray-400">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <p className="text-lg">예측 기록이 아직 없습니다.</p>
          <p className="text-sm mt-2">
            파이프라인이 실행되면 자동으로 데이터가 채워집니다.
          </p>
        </div>
      )}
    </div>
  );
}
