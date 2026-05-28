import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { assertSelectOk, CURRENT_SCORING_RULE, type TeamCode } from "@moneyball/shared";
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
  calibrationApplied?: string | null;
  confidence?: number;
}

interface TeamArgumentShape {
  team?: string;
  strengths?: unknown;
  opponentWeaknesses?: unknown;
  keyFactor?: string;
  confidence?: number;
  reasoning?: string;
}

interface CalibrationShape {
  recentBias?: string | null;
  teamSpecific?: string | null;
  modelWeakness?: string | null;
  adjustmentSuggestion?: number;
}

interface ReasoningShape {
  debate?: {
    verdict?: Verdict;
    homeArgument?: TeamArgumentShape;
    awayArgument?: TeamArgumentShape;
    calibration?: CalibrationShape;
    quantitativeProb?: number;
  };
}

export interface DebateArgumentSummary {
  keyFactor: string | null;
  strengths: string[];
  opponentWeaknesses: string[];
  confidence: number | null;
  reasoning: string | null;
}

export interface DebateCalibrationSummary {
  recentBias: string | null;
  teamSpecific: string | null;
  modelWeakness: string | null;
  adjustmentSuggestion: number | null;
}

export interface DebateTimelineData {
  quantHomeProb: number | null;
  homeArgument: DebateArgumentSummary | null;
  awayArgument: DebateArgumentSummary | null;
  calibration: DebateCalibrationSummary | null;
  verdictHomeProb: number | null;
  verdictConfidence: number | null;
  verdictReasoning: string;
  predictedWinner: TeamCode | null;
  calibrationApplied: string | null;
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
  factors: Record<string, number> | null;
  debate: DebateTimelineData | null;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}

function normalizeArgument(
  arg: TeamArgumentShape | undefined,
): DebateArgumentSummary | null {
  if (!arg) return null;
  const keyFactor =
    typeof arg.keyFactor === "string" && arg.keyFactor.trim().length > 0
      ? arg.keyFactor
      : null;
  const confidence =
    typeof arg.confidence === "number" && Number.isFinite(arg.confidence)
      ? arg.confidence
      : null;
  const reasoning =
    typeof arg.reasoning === "string" && arg.reasoning.trim().length > 0
      ? arg.reasoning
      : null;
  const strengths = normalizeStringList(arg.strengths);
  const opponentWeaknesses = normalizeStringList(arg.opponentWeaknesses);
  if (
    !keyFactor &&
    confidence === null &&
    !reasoning &&
    strengths.length === 0 &&
    opponentWeaknesses.length === 0
  ) {
    return null;
  }
  return { keyFactor, confidence, reasoning, strengths, opponentWeaknesses };
}

function normalizeCalibration(
  c: CalibrationShape | undefined,
): DebateCalibrationSummary | null {
  if (!c) return null;
  const recentBias =
    typeof c.recentBias === "string" && c.recentBias.trim().length > 0
      ? c.recentBias
      : null;
  const teamSpecific =
    typeof c.teamSpecific === "string" && c.teamSpecific.trim().length > 0
      ? c.teamSpecific
      : null;
  const modelWeakness =
    typeof c.modelWeakness === "string" && c.modelWeakness.trim().length > 0
      ? c.modelWeakness
      : null;
  const adjustmentSuggestion =
    typeof c.adjustmentSuggestion === "number" &&
    Number.isFinite(c.adjustmentSuggestion)
      ? c.adjustmentSuggestion
      : null;
  if (
    !recentBias &&
    !teamSpecific &&
    !modelWeakness &&
    (adjustmentSuggestion === null || adjustmentSuggestion === 0)
  ) {
    return null;
  }
  return { recentBias, teamSpecific, modelWeakness, adjustmentSuggestion };
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
    .eq("scoring_rule", CURRENT_SCORING_RULE)
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

interface InsightsGameRow {
  id: number;
  game_date: string;
  status: string;
  home_team: { code: string } | { code: string }[] | null;
  away_team: { code: string } | { code: string }[] | null;
}

function extractTeamCode(field: InsightsGameRow["home_team"]): string | null {
  if (!field) return null;
  const obj = Array.isArray(field) ? field[0] : field;
  return obj?.code ?? null;
}

export async function getInsightsForDate(date: string): Promise<InsightEntry[]> {
  if (!isValidInsightsDate(date)) return [];
  const supabase = createInsightsClient();
  const result = await supabase
    .from("predictions")
    .select(
      "is_correct, reasoning, factors, prediction_type, created_at, games!inner(id, game_date, status, home_team:teams!games_home_team_id_fkey(code), away_team:teams!games_away_team_id_fkey(code))",
    )
    .eq("prediction_type", "pre_game")
    .eq("scoring_rule", CURRENT_SCORING_RULE)
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
      | InsightsGameRow
      | InsightsGameRow[]
      | null;
    const game = Array.isArray(gamesField) ? gamesField[0] : gamesField;
    if (!game || seen.has(game.id)) continue;
    const homeCode = extractTeamCode(game.home_team);
    const awayCode = extractTeamCode(game.away_team);
    if (!homeCode || !awayCode) continue;
    seen.add(game.id);
    const rawFactors = row.factors as Record<string, number> | null;
    const factors =
      rawFactors && typeof rawFactors === "object" && Object.keys(rawFactors).length > 0
        ? rawFactors
        : null;
    const debateRaw = r?.debate;
    const homeArgument = normalizeArgument(debateRaw?.homeArgument);
    const awayArgument = normalizeArgument(debateRaw?.awayArgument);
    const calibration = normalizeCalibration(debateRaw?.calibration);
    const quantHomeProb =
      typeof debateRaw?.quantitativeProb === "number" && Number.isFinite(debateRaw.quantitativeProb)
        ? debateRaw.quantitativeProb
        : null;
    const verdictHomeProb =
      typeof verdict?.homeWinProb === "number" && Number.isFinite(verdict.homeWinProb)
        ? verdict.homeWinProb
        : null;
    const verdictConfidence =
      typeof verdict?.confidence === "number" && Number.isFinite(verdict.confidence)
        ? verdict.confidence
        : null;
    const predictedWinnerCode =
      typeof verdict?.predictedWinner === "string" && verdict.predictedWinner.trim().length > 0
        ? (verdict.predictedWinner as TeamCode)
        : null;
    const calibrationApplied =
      typeof verdict?.calibrationApplied === "string" && verdict.calibrationApplied.trim().length > 0
        ? verdict.calibrationApplied
        : null;
    const debate: DebateTimelineData | null = presented.isFallback
      ? null
      : {
          quantHomeProb,
          homeArgument,
          awayArgument,
          calibration,
          verdictHomeProb,
          verdictConfidence,
          verdictReasoning: presented.text,
          predictedWinner: predictedWinnerCode,
          calibrationApplied,
        };
    out.push({
      gameId: game.id,
      date: game.game_date,
      homeTeam: homeCode as TeamCode,
      awayTeam: awayCode as TeamCode,
      status: game.status,
      isCorrect: row.is_correct,
      reasoningText: presented.text,
      isFallback: presented.isFallback,
      homeArgSummary: verdict?.homeArgSummary ?? null,
      awayArgSummary: verdict?.awayArgSummary ?? null,
      homeWinProb: verdict?.homeWinProb ?? null,
      factors,
      debate,
    });
  }
  return out;
}
