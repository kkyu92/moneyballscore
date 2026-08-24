import { MIN_POLL_TOTAL } from '@moneyball/shared';
import { deriveMlbOutcome } from '@/lib/mlb/deriveMlbOutcome';

export { MIN_POLL_TOTAL };

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

// MLB 분석 — /mlb/accuracy 에 "커뮤니티 vs AI 대결" 섹션이 KBO /accuracy 와 달리 부재
// (explore-idea heavy 발견, cycle 2544). mlb_pick_poll_events 는 game_id(INT) 가 아니라
// external_game_id(VARCHAR) 로 키잉되고, MLB predictions.is_correct 는 전량 NULL이라
// (deriveMlbOutcome.ts 주석 참조) home_win_prob + 실제 스코어로 직접 derive 필요 —
// 위 computeCommunityVsAI 를 그대로 재사용할 수 없어 별도 함수로 분리.
export function computeMlbCommunityVsAI(
  pollRows: Array<{ external_game_id: string; pick: string }>,
  scheduleRows: Array<{ external_game_id: string; home_score: number | null; away_score: number | null }>,
  predRows: Array<{ external_game_id: string | null; home_win_prob: number | null }>,
): CommunityVsAIResult {
  const pollByGame = new Map<string, { home: number; away: number }>();
  for (const row of pollRows) {
    const entry = pollByGame.get(row.external_game_id) ?? { home: 0, away: 0 };
    if (row.pick === 'home') entry.home++;
    else if (row.pick === 'away') entry.away++;
    pollByGame.set(row.external_game_id, entry);
  }

  const scheduleByGame = new Map<string, { home_score: number | null; away_score: number | null }>();
  for (const s of scheduleRows) scheduleByGame.set(s.external_game_id, s);

  const homeWinProbByGame = new Map<string, number | null>();
  for (const p of predRows) {
    if (p.external_game_id) homeWinProbByGame.set(p.external_game_id, p.home_win_prob);
  }

  let communityGames = 0;
  let communityCorrect = 0;
  let aiGamesWithPoll = 0;
  let aiCorrectWithPoll = 0;

  for (const [gameId, poll] of pollByGame) {
    const total = poll.home + poll.away;
    if (total < MIN_POLL_TOTAL) continue;

    const schedule = scheduleByGame.get(gameId);
    if (!schedule) continue;
    if (schedule.home_score == null || schedule.away_score == null) continue;
    if (schedule.home_score === schedule.away_score) continue; // 동점 스킵 (KBO 버전과 동일 처리)

    const { actualHomeWin, isCorrect } = deriveMlbOutcome({
      homeWinProb: homeWinProbByGame.get(gameId) ?? null,
      hasFinalScore: true,
      homeScore: schedule.home_score,
      awayScore: schedule.away_score,
    });
    if (actualHomeWin == null) continue;

    const actual: 'home' | 'away' = actualHomeWin ? 'home' : 'away';
    const majority: 'home' | 'away' = poll.home >= poll.away ? 'home' : 'away';
    communityGames++;
    if (majority === actual) communityCorrect++;

    if (isCorrect != null) {
      aiGamesWithPoll++;
      if (isCorrect) aiCorrectWithPoll++;
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
