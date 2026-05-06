import { describe, expect, it } from 'vitest';
import { buildAccuracyUpdates } from '../pipeline/accuracy-update';

describe('buildAccuracyUpdates — cycle 141 silent drift 가드', () => {
  it('predicted_winner === winner_team_id 시 is_correct=true', () => {
    const finalGames = [{ id: 10, winner_team_id: 1 }];
    const predByGameId = new Map([[10, { id: 100, predicted_winner: 1 }]]);
    const updates = buildAccuracyUpdates(finalGames, predByGameId, '2026-05-06T00:00:00Z');
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({
      predId: 100,
      payload: { is_correct: true, actual_winner: 1, verified_at: '2026-05-06T00:00:00Z' },
    });
  });

  it('predicted_winner !== winner_team_id 시 is_correct=false 박제 (오답 기록)', () => {
    const finalGames = [{ id: 11, winner_team_id: 2 }];
    const predByGameId = new Map([[11, { id: 101, predicted_winner: 1 }]]);
    const updates = buildAccuracyUpdates(finalGames, predByGameId, '2026-05-06T00:00:00Z');
    expect(updates[0].payload.is_correct).toBe(false);
    expect(updates[0].payload.actual_winner).toBe(2);
  });

  it('pre_game prediction 없는 final 경기 silent skip — payload 0건', () => {
    const finalGames = [{ id: 12, winner_team_id: 1 }];
    const predByGameId = new Map<number, { id: number; predicted_winner: number }>();
    const updates = buildAccuracyUpdates(finalGames, predByGameId, '2026-05-06T00:00:00Z');
    expect(updates).toHaveLength(0);
  });

  it('finalGames 0건 시 빈 배열 (Promise.all 단락 OK)', () => {
    const updates = buildAccuracyUpdates([], new Map(), '2026-05-06T00:00:00Z');
    expect(updates).toEqual([]);
  });

  it('5경기 → 5 update payload 일관 매핑 (동일 verifiedAt 박제)', () => {
    const verifiedAt = '2026-05-06T14:00:00Z';
    const finalGames = [
      { id: 1, winner_team_id: 10 },
      { id: 2, winner_team_id: 20 },
      { id: 3, winner_team_id: 10 },
      { id: 4, winner_team_id: 20 },
      { id: 5, winner_team_id: 30 },
    ];
    const predByGameId = new Map([
      [1, { id: 101, predicted_winner: 10 }],
      [2, { id: 102, predicted_winner: 10 }],
      [3, { id: 103, predicted_winner: 10 }],
      [4, { id: 104, predicted_winner: 20 }],
      [5, { id: 105, predicted_winner: 30 }],
    ]);
    const updates = buildAccuracyUpdates(finalGames, predByGameId, verifiedAt);
    expect(updates).toHaveLength(5);
    expect(updates.map((u) => u.payload.is_correct)).toEqual([true, false, true, true, true]);
    expect(updates.every((u) => u.payload.verified_at === verifiedAt)).toBe(true);
  });

  it('pred 일부 누락 시 그 경기만 skip — 나머지 정상 박제', () => {
    const finalGames = [
      { id: 1, winner_team_id: 10 },
      { id: 2, winner_team_id: 20 },
      { id: 3, winner_team_id: 30 },
    ];
    const predByGameId = new Map([
      [1, { id: 101, predicted_winner: 10 }],
      [3, { id: 103, predicted_winner: 30 }],
    ]);
    const updates = buildAccuracyUpdates(finalGames, predByGameId, '2026-05-06T00:00:00Z');
    expect(updates.map((u) => u.predId)).toEqual([101, 103]);
  });
});
