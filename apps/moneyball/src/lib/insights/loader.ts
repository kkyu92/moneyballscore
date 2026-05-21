import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { assertSelectOk, type TeamCode } from "@moneyball/shared";
import { presentJudgeReasoningWithFallback } from "@/lib/predictions/judgeReasoning";

const DATE_REGEX = /^20[2-9]\d-\d{2}-\d{2}$/;

export function isValidInsightsDate(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const utc = new Date(Date.UTC(y, m - 1, d));
  return (
    utc.getUTCFullYear() === y &&
    utc.getUTCMonth() + 1 === m &&
    utc.getUTCDate() === d
  );
}

function createInsightsClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

interface Verdict {
  reasoning?: string;
  homeWinProb?: number;
  predictedWinner?: string;
  homeArgSummary?: string;
  awayArgSummary?: string;
}

interface ReasoningShape {
  debate?: { verdict?: Verdict };
}

export interface InsightEntry {
  gameId: number;
  date: string;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  status: string;
  isCorrect: boolean | null;
  reasoningText: string;
  isFallback: boolean;
  homeArgSummary: string | null;
  awayArgSummary: string | null;
  homeWinProb: number | null;
}

export async function listInsightsDates(daysBack = 90): Promise<string[]> {
  const supabase = createInsightsClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - daysBack);
  const sinceStr = since.toISOString().slice(0, 10);

  const result = await supabase
    .from("predictions")
    .select("games!inner(game_date)")
    .eq("prediction_type", "pre_game")
    .gte("games.game_date", sinceStr)
    .order("created_at", { ascending: false })
    .limit(daysBack * 6);
  const { data } = assertSelectOk(result, "insights.listInsightsDates");
  if (!data) return [];

  const dates = new Set<string>();
  for (const row of data) {
    const gamesField = row.games as unknown as
      | { game_date: string }
      | { game_date: string }[]
      | null;
    const game = Array.isArray(gamesField) ? gamesField[0] : gamesField;
    if (game?.game_date && isValidInsightsDate(game.game_date)) {
      dates.add(game.game_date);
    }
  }
  return [...dates].sort().reverse();
}

export async function getInsightsForDate(date: string): Promise<InsightEntry[]> {
  if (!isValidInsightsDate(date)) return [];
  const supabase = createInsightsClient();
  const result = await supabase
    .from("predictions")
    .select(
      "is_correct, reasoning, prediction_type, created_at, games!inner(id, game_date, home_team_code, away_team_code, status)",
    )
    .eq("prediction_type", "pre_game")
    .eq("games.game_date", date)
    .order("created_at", { ascending: false });
  const { data } = assertSelectOk(result, "insights.getInsightsForDate");
  if (!data) return [];

  const seen = new Set<number>();
  const out: InsightEntry[] = [];
  for (const row of data) {
    const r = row.reasoning as ReasoningShape | null;
    const verdict = r?.debate?.verdict;
    const presented = presentJudgeReasoningWithFallback(verdict?.reasoning);
    if (!presented) continue;
    const gamesField = row.games as unknown as
      | {
          id: number;
          game_date: string;
          home_team_code: string;
          away_team_code: string;
          status: string;
        }
      | {
          id: number;
          game_date: string;
          home_team_code: string;
          away_team_code: string;
          status: string;
        }[]
      | null;
    const game = Array.isArray(gamesField) ? gamesField[0] : gamesField;
    if (!game || seen.has(game.id)) continue;
    seen.add(game.id);
    out.push({
      gameId: game.id,
      date: game.game_date,
      homeTeam: game.home_team_code as TeamCode,
      awayTeam: game.away_team_code as TeamCode,
      status: game.status,
      isCorrect: row.is_correct,
      reasoningText: presented.text,
      isFallback: presented.isFallback,
      homeArgSummary: verdict?.homeArgSummary ?? null,
      awayArgSummary: verdict?.awayArgSummary ?? null,
      homeWinProb: verdict?.homeWinProb ?? null,
    });
  }
  return out;
}
