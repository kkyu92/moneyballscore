export const MIN_POLL_TOTAL = 3;

export interface CommunityVsAIResult {
  communityGames: number;
  communityCorrect: number;
  communityAccuracy: number | null;
  aiGamesWithPoll: number;
  aiCorrectWithPoll: number;
  aiAccuracyWithPoll: number | null;
}

export function computeCommunityVsAI(
  pollRows: Array<{ game_id: number; pick: string }>,
  gameRows: Array<{ id: number; home_score: number | null; away_score: number | null }>,
  predRows: Array<{ game_id: number; is_correct: boolean | null }>,
): CommunityVsAIResult {
  const pollByGame = new Map<number, { home: number; away: number }>();
  for (const row of pollRows) {
    const entry = pollByGame.get(row.game_id) ?? { home: 0, away: 0 };
    if (row.pick === 'home') entry.home++;
    else if (row.pick === 'away') entry.away++;
    pollByGame.set(row.game_id, entry);
  }

  const gameResults = new Map<number, 'home' | 'away'>();
  for (const g of gameRows) {
    if (g.home_score == null || g.away_score == null || g.home_score === g.away_score) continue;
    gameResults.set(g.id, g.home_score > g.away_score ? 'home' : 'away');
  }

  const aiPreds = new Map<number, boolean>();
  for (const p of predRows) {
    if (p.is_correct != null) aiPreds.set(p.game_id, p.is_correct);
  }

  let communityGames = 0;
  let communityCorrect = 0;
  let aiGamesWithPoll = 0;
  let aiCorrectWithPoll = 0;

  for (const [gameId, poll] of pollByGame) {
    const total = poll.home + poll.away;
    if (total < MIN_POLL_TOTAL) continue;

    const actual = gameResults.get(gameId);
    if (!actual) continue;

    const majority: 'home' | 'away' = poll.home >= poll.away ? 'home' : 'away';
    communityGames++;
    if (majority === actual) communityCorrect++;

    const aiCorrect = aiPreds.get(gameId);
    if (aiCorrect != null) {
      aiGamesWithPoll++;
      if (aiCorrect) aiCorrectWithPoll++;
    }
  }

  return {
    communityGames,
    communityCorrect,
    communityAccuracy: communityGames > 0 ? communityCorrect / communityGames : null,
    aiGamesWithPoll,
    aiCorrectWithPoll,
    aiAccuracyWithPoll: aiGamesWithPoll > 0 ? aiCorrectWithPoll / aiGamesWithPoll : null,
  };
}
