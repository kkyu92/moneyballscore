export interface DailyAccuracyInput {
  game_date: string;
  is_correct: boolean;
}

export interface DailyAccuracyPoint {
  date: string;
  accuracy: number;
  correct: number;
  total: number;
}

/**
 * 일자별(비누적) 적중률 집계.
 *
 * 비경기일은 skip — 출력 포인트 간 날짜 gap이 자연스럽게 X축 그대로 표현된다.
 * 같은 날짜의 복수 예측은 하나로 합쳐진다.
 * 날짜는 ISO string 오름차순 정렬된다.
 */
export function buildDailyAccuracy(
  predictions: DailyAccuracyInput[],
): DailyAccuracyPoint[] {
  if (predictions.length === 0) return [];

  const byDate = new Map<string, { correct: number; total: number }>();
  for (const pred of predictions) {
    const existing = byDate.get(pred.game_date) ?? { correct: 0, total: 0 };
    existing.total++;
    if (pred.is_correct) existing.correct++;
    byDate.set(pred.game_date, existing);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { correct, total }]) => ({
      date,
      correct,
      total,
      accuracy: Math.round((correct / total) * 1000) / 10,
    }));
}
