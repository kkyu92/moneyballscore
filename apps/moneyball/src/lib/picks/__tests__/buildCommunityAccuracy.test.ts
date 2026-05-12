import { describe, it, expect } from 'vitest';
import { computeCommunityVsAI, MIN_POLL_TOTAL } from '../buildCommunityAccuracy';

function makePoll(gameId: number, home: number, away: number) {
  const rows = [];
  for (let i = 0; i < home; i++) rows.push({ game_id: gameId, pick: 'home' });
  for (let i = 0; i < away; i++) rows.push({ game_id: gameId, pick: 'away' });
  return rows;
}

describe('computeCommunityVsAI', () => {
  it('returns zeros with null accuracy for empty inputs', () => {
    const result = computeCommunityVsAI([], [], []);
    expect(result.communityGames).toBe(0);
    expect(result.communityCorrect).toBe(0);
    expect(result.communityAccuracy).toBeNull();
    expect(result.aiGamesWithPoll).toBe(0);
    expect(result.aiAccuracyWithPoll).toBeNull();
  });

  it('skips games with poll total below MIN_POLL_TOTAL', () => {
    const poll = makePoll(1, MIN_POLL_TOTAL - 1, 0);
    const games = [{ id: 1, home_score: 5, away_score: 2 }];
    const result = computeCommunityVsAI(poll, games, []);
    expect(result.communityGames).toBe(0);
  });

  it('counts community correct when majority matches actual winner (home)', () => {
    const poll = makePoll(1, 4, 1);
    const games = [{ id: 1, home_score: 5, away_score: 2 }];
    const result = computeCommunityVsAI(poll, games, []);
    expect(result.communityGames).toBe(1);
    expect(result.communityCorrect).toBe(1);
    expect(result.communityAccuracy).toBe(1.0);
  });

  it('counts community incorrect when majority loses', () => {
    const poll = makePoll(1, 4, 1);
    const games = [{ id: 1, home_score: 2, away_score: 5 }];
    const result = computeCommunityVsAI(poll, games, []);
    expect(result.communityGames).toBe(1);
    expect(result.communityCorrect).toBe(0);
    expect(result.communityAccuracy).toBe(0);
  });

  it('skips tied games (home_score === away_score)', () => {
    const poll = makePoll(1, 4, 1);
    const games = [{ id: 1, home_score: 3, away_score: 3 }];
    const result = computeCommunityVsAI(poll, games, []);
    expect(result.communityGames).toBe(0);
  });

  it('skips games with null scores', () => {
    const poll = makePoll(1, 4, 1);
    const games = [{ id: 1, home_score: null, away_score: null }];
    const result = computeCommunityVsAI(poll, games, []);
    expect(result.communityGames).toBe(0);
  });

  it('computes AI accuracy on the same poll game set', () => {
    const poll = [...makePoll(1, 4, 1), ...makePoll(2, 2, 4)];
    const games = [
      { id: 1, home_score: 5, away_score: 2 },
      { id: 2, home_score: 1, away_score: 4 },
    ];
    const preds = [
      { game_id: 1, is_correct: true },
      { game_id: 2, is_correct: false },
    ];
    const result = computeCommunityVsAI(poll, games, preds);
    expect(result.communityGames).toBe(2);
    expect(result.communityCorrect).toBe(2);
    expect(result.communityAccuracy).toBe(1.0);
    expect(result.aiGamesWithPoll).toBe(2);
    expect(result.aiCorrectWithPoll).toBe(1);
    expect(result.aiAccuracyWithPoll).toBe(0.5);
  });

  it('handles game in poll but no AI prediction', () => {
    const poll = makePoll(1, 4, 1);
    const games = [{ id: 1, home_score: 5, away_score: 2 }];
    const result = computeCommunityVsAI(poll, games, []);
    expect(result.communityGames).toBe(1);
    expect(result.aiGamesWithPoll).toBe(0);
    expect(result.aiAccuracyWithPoll).toBeNull();
  });

  it('uses home majority when votes are equal', () => {
    // equal votes → majority = 'home'
    const poll = makePoll(1, 3, 3);
    const games = [{ id: 1, home_score: 5, away_score: 2 }];
    const result = computeCommunityVsAI(poll, games, []);
    expect(result.communityCorrect).toBe(1);
  });

  it('handles multiple games with mixed outcomes', () => {
    // game 1: community correct (home majority, home wins), AI correct
    // game 2: community wrong (home majority, away wins), AI wrong
    // game 3: community correct (away majority, away wins), no AI
    const poll = [
      ...makePoll(1, 5, 2),
      ...makePoll(2, 4, 2),
      ...makePoll(3, 1, 4),
    ];
    const games = [
      { id: 1, home_score: 5, away_score: 2 },
      { id: 2, home_score: 1, away_score: 4 },
      { id: 3, home_score: 2, away_score: 5 },
    ];
    const preds = [
      { game_id: 1, is_correct: true },
      { game_id: 2, is_correct: false },
    ];
    const result = computeCommunityVsAI(poll, games, preds);
    expect(result.communityGames).toBe(3);
    expect(result.communityCorrect).toBe(2);
    expect(result.communityAccuracy).toBeCloseTo(2 / 3);
    expect(result.aiGamesWithPoll).toBe(2);
    expect(result.aiCorrectWithPoll).toBe(1);
    expect(result.aiAccuracyWithPoll).toBe(0.5);
  });
});
