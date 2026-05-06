import { describe, expect, it } from 'vitest';
import {
  computePredictionHistory,
  type PredictionHistoryRow,
} from '../pipeline/prediction-history';

function row(
  predictedWinnerId: number,
  isCorrect: boolean | null,
  homeTeamId: number,
  awayTeamId: number,
): PredictionHistoryRow {
  return {
    predicted_winner: predictedWinnerId,
    is_correct: isCorrect,
    game: { home_team_id: homeTeamId, away_team_id: awayTeamId },
  };
}

describe('computePredictionHistory', () => {
  it('빈 배열 → 모든 필드 zero/null', () => {
    const result = computePredictionHistory([]);
    expect(result).toEqual({
      totalPredictions: 0,
      correctPredictions: 0,
      recentResults: [],
      homeTeamAccuracy: null,
      awayTeamAccuracy: null,
      teamAccuracy: {},
    });
  });

  it('총 적중률은 is_correct=true 비율로 계산', () => {
    const rows = [
      row(1, true, 1, 2),
      row(1, false, 1, 2),
      row(2, true, 1, 2),
    ];
    const result = computePredictionHistory(rows);
    expect(result.totalPredictions).toBe(3);
    expect(result.correctPredictions).toBe(2);
  });

  it('홈팀 예측 10건 미만 → homeTeamAccuracy null', () => {
    const rows = Array.from({ length: 9 }, () => row(1, true, 1, 2));
    const result = computePredictionHistory(rows);
    expect(result.homeTeamAccuracy).toBeNull();
  });

  it('홈팀 예측 ≥10건 → 조건부 적중률 = correct/total (predicted=home)', () => {
    const rows = [
      ...Array.from({ length: 7 }, () => row(1, true, 1, 2)),
      ...Array.from({ length: 3 }, () => row(1, false, 1, 2)),
    ];
    const result = computePredictionHistory(rows);
    expect(result.homeTeamAccuracy).toBeCloseTo(0.7, 5);
  });

  it('원정팀 예측 ≥10건 → awayTeamAccuracy 별도 산출', () => {
    const rows = [
      ...Array.from({ length: 4 }, () => row(2, true, 1, 2)),
      ...Array.from({ length: 6 }, () => row(2, false, 1, 2)),
    ];
    const result = computePredictionHistory(rows);
    expect(result.awayTeamAccuracy).toBeCloseTo(0.4, 5);
    expect(result.homeTeamAccuracy).toBeNull();
  });

  it('홈/원정 예측 양쪽 ≥10건 시 둘 다 산출 + 전체 분리', () => {
    const homeRows = [
      ...Array.from({ length: 8 }, () => row(1, true, 1, 2)),
      ...Array.from({ length: 2 }, () => row(1, false, 1, 2)),
    ];
    const awayRows = [
      ...Array.from({ length: 5 }, () => row(2, true, 1, 2)),
      ...Array.from({ length: 5 }, () => row(2, false, 1, 2)),
    ];
    const result = computePredictionHistory([...homeRows, ...awayRows]);
    expect(result.totalPredictions).toBe(20);
    expect(result.correctPredictions).toBe(13);
    expect(result.homeTeamAccuracy).toBeCloseTo(0.8, 5);
    expect(result.awayTeamAccuracy).toBeCloseTo(0.5, 5);
  });

  it('회귀 가드 (cycle 133 silent drift): 홈팀 예측만 100% 적중 + 원정팀 0% 적중 시 homeTeamAccuracy ≠ 전체 적중률', () => {
    const rows = [
      ...Array.from({ length: 10 }, () => row(1, true, 1, 2)),
      ...Array.from({ length: 10 }, () => row(2, false, 1, 2)),
    ];
    const result = computePredictionHistory(rows);
    expect(result.totalPredictions).toBe(20);
    expect(result.correctPredictions).toBe(10);
    expect(result.homeTeamAccuracy).toBeCloseTo(1.0, 5);
    expect(result.awayTeamAccuracy).toBeCloseTo(0.0, 5);
    const overallAccuracy = result.correctPredictions / result.totalPredictions;
    expect(result.homeTeamAccuracy).not.toBeCloseTo(overallAccuracy, 5);
  });

  it('game 정보 누락 row → 전체 카운트엔 포함되나 home/away 분류엔 미반영', () => {
    const rows: PredictionHistoryRow[] = [
      ...Array.from({ length: 10 }, () => row(1, true, 1, 2)),
      { predicted_winner: 1, is_correct: true, game: null },
      { predicted_winner: 1, is_correct: false, game: undefined },
    ];
    const result = computePredictionHistory(rows);
    expect(result.totalPredictions).toBe(12);
    expect(result.correctPredictions).toBe(11);
    expect(result.homeTeamAccuracy).toBeCloseTo(1.0, 5);
  });

  it('predicted_winner 가 home/away 어느쪽도 아닌 경우 (스킵)', () => {
    const rows = [
      ...Array.from({ length: 10 }, () => row(1, true, 1, 2)),
      row(99, true, 1, 2),
    ];
    const result = computePredictionHistory(rows);
    expect(result.totalPredictions).toBe(11);
    expect(result.correctPredictions).toBe(11);
    expect(result.homeTeamAccuracy).toBeCloseTo(1.0, 5);
    expect(result.awayTeamAccuracy).toBeNull();
  });

  it('Supabase 가 game 을 배열로 리턴해도 첫 원소 사용', () => {
    const rows: PredictionHistoryRow[] = Array.from({ length: 10 }, () => ({
      predicted_winner: 1,
      is_correct: true,
      game: [{ home_team_id: 1, away_team_id: 2 }],
    }));
    const result = computePredictionHistory(rows);
    expect(result.homeTeamAccuracy).toBeCloseTo(1.0, 5);
  });
});
