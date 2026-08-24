import { createClient } from '@/lib/supabase/server';
import { assertSelectOk, MLB_PRODUCTION_COHORT_RULES } from '@moneyball/shared';
import { computeMlbCommunityVsAI, type CommunityVsAIResult } from '@/lib/picks/buildCommunityAccuracy';

interface PollRow {
  external_game_id: string;
  pick: string;
}

interface ScheduleFinalRow {
  external_game_id: string;
  home_score: number | null;
  away_score: number | null;
}

interface PredMiniRow {
  external_game_id: string | null;
  home_win_prob: number | null;
}

const EMPTY: CommunityVsAIResult = {
  communityGames: 0,
  communityCorrect: 0,
  communityAccuracy: null,
  aiGamesWithPoll: 0,
  aiCorrectWithPoll: 0,
  aiAccuracyWithPoll: null,
};

// /mlb/accuracy · /en/mlb/accuracy 의 "커뮤니티 vs AI 대결" 섹션 데이터 소스 (explore-idea
// heavy, cycle 2544 — KBO /accuracy 에는 있었지만 MLB 쪽 parity 부재였던 gap).
export async function buildMlbCommunityVsAI(): Promise<CommunityVsAIResult> {
  const supabase = await createClient();

  const pollResult = await supabase.from('mlb_pick_poll_events').select('external_game_id, pick');
  const { data: pollData } = assertSelectOk(pollResult, 'buildMlbCommunityVsAI mlb_pick_poll_events');
  const pollRows = (pollData ?? []) as PollRow[];
  if (pollRows.length === 0) return EMPTY;

  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_score, away_score')
    .eq('status', 'final')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null);
  const { data: scheduleData } = assertSelectOk(scheduleResult, 'buildMlbCommunityVsAI mlb_schedule');
  const scheduleRows = (scheduleData ?? []) as ScheduleFinalRow[];
  if (scheduleRows.length === 0) return EMPTY;

  const predResult = await supabase
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id));
  const { data: predData } = assertSelectOk(predResult, 'buildMlbCommunityVsAI predictions');
  const predRows = (predData ?? []) as PredMiniRow[];

  return computeMlbCommunityVsAI(pollRows, scheduleRows, predRows);
}
