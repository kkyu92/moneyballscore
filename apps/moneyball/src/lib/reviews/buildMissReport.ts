import { createClient } from "@/lib/supabase/server";
import { CURRENT_MODEL_FILTER } from "@/config/model";
import { KBO_TEAMS, type TeamCode, shortTeamName } from '@moneyball/shared';

export interface FactorErrorItem {
  factor: string;
  predictedBias: number;
  diagnosis: string | null;
}

export interface MissReportItem {
  gameId: number;
  gameDate: string;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: TeamCode | null;
  actualWinnerCode: TeamCode | null;
  confidence: number;
  preGameReasoning: string | null;
  judgePostview: string | null;
  factorErrors: FactorErrorItem[];
  missedBy: {
    home: string | null;
    away: string | null;
  };
}

interface PreGameRow {
  game_id: number;
  confidence: number | null;
  is_correct: boolean | null;
  predicted_winner: number | null;
  reasoning: unknown;
  predicted_winner_team: { code: string | null } | null;
  game: {
    id: number;
    game_date: string;
    status: string | null;
    home_score: number | null;
    away_score: number | null;
    winner_team_id: number | null;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
    winner: { code: string | null } | null;
  } | null;
}

interface PostGameRow {
  game_id: number;
  reasoning: unknown;
}

interface ReasoningPreShape {
  debate?: { verdict?: { reasoning?: string } };
  [key: string]: unknown;
}

interface ReasoningPostShape {
  judgeReasoning?: string;
  factorErrors?: Array<{
    factor?: string;
    predictedBias?: number | string;
    diagnosis?: string;
  }>;
  homePostview?: { missedBy?: string };
  awayPostview?: { missedBy?: string };
}

const MIN_CONFIDENCE = 0.55;

function extractPreGameReasoning(r: unknown): string | null {
  if (!r || typeof r !== "object") return null;
  const shape = r as ReasoningPreShape;
  const reasoning = shape.debate?.verdict?.reasoning;
  return typeof reasoning === "string" ? reasoning : null;
}

/**
 * 고확신(confidence >= 0.55) 예측 중 틀린 것 Top N.
 * 각 항목에 pre_game reasoning + post_game judge reasoning + factor error 통합.
 */
export async function buildMissReport(options: {
  limit?: number;
} = {}): Promise<MissReportItem[]> {
  const limit = options.limit ?? 10;
  const supabase = await createClient();

  const { data: preData } = await supabase
    .from("predictions")
    .select(
      `
        game_id, confidence, is_correct, predicted_winner, reasoning,
        predicted_winner_team:teams!predictions_predicted_winner_fkey(code),
        game:games!predictions_game_id_fkey(
          id, game_date, status, home_score, away_score, winner_team_id,
          home_team:teams!games_home_team_id_fkey(code),
          away_team:teams!games_away_team_id_fkey(code),
          winner:teams!games_winner_team_id_fkey(code)
        )
      `,
    )
    .eq("prediction_type", "pre_game")
    .match(CURRENT_MODEL_FILTER)
    .eq("is_correct", false)
    .gte("confidence", MIN_CONFIDENCE)
    .order("confidence", { ascending: false })
    .limit(limit);

  const rows = (preData ?? []) as unknown as PreGameRow[];
  if (rows.length === 0) return [];

  const gameIds = rows.map((r) => r.game_id).filter((id): id is number => id != null);

  const { data: postData } = await supabase
    .from("predictions")
    .select("game_id, reasoning")
    .eq("prediction_type", "post_game")
    .in("game_id", gameIds);

  const postByGame = new Map<number, ReasoningPostShape>();
  for (const p of (postData ?? []) as unknown as PostGameRow[]) {
    if (p.reasoning && typeof p.reasoning === "object") {
      postByGame.set(p.game_id, p.reasoning as ReasoningPostShape);
    }
  }

  const items: MissReportItem[] = [];
  for (const r of rows) {
    const g = r.game;
    if (!g) continue;
    if (g.status !== "final") continue;

    const homeCode = g.home_team?.code as TeamCode | undefined;
    const awayCode = g.away_team?.code as TeamCode | undefined;
    if (!homeCode || !awayCode) continue;

    const post = postByGame.get(r.game_id);
    const factorErrors: FactorErrorItem[] = (post?.factorErrors ?? [])
      .map((f) => ({
        factor: String(f.factor ?? ""),
        predictedBias:
          typeof f.predictedBias === "number"
            ? f.predictedBias
            : Number(f.predictedBias ?? 0),
        diagnosis: f.diagnosis ?? null,
      }))
      .filter((f) => f.factor.length > 0);

    items.push({
      gameId: g.id,
      gameDate: g.game_date,
      homeCode,
      awayCode,
      homeName: shortTeamName(homeCode),
      awayName: shortTeamName(awayCode),
      homeScore: g.home_score,
      awayScore: g.away_score,
      predictedWinnerCode:
        (r.predicted_winner_team?.code as TeamCode | null) ?? null,
      actualWinnerCode: (g.winner?.code as TeamCode | null) ?? null,
      confidence: r.confidence ?? 0,
      preGameReasoning: extractPreGameReasoning(r.reasoning),
      judgePostview: post?.judgeReasoning ?? null,
      factorErrors: factorErrors.slice(0, 5),
      missedBy: {
        home: post?.homePostview?.missedBy ?? null,
        away: post?.awayPostview?.missedBy ?? null,
      },
    });
  }

  return items;
}
