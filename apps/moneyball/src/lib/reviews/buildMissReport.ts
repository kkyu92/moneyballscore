import { createClient } from "@/lib/supabase/server";
import { CURRENT_MODEL_FILTER } from "@/config/model";
import {
  assertSelectOk,
  classifyWinnerProb,
  shortTeamName,
  winnerProbOf,
  type SelectResult,
  type TeamCode,
} from '@moneyball/shared';

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
  // 예측 승자 적중 확률 — confident/lean 티어만 MissReport 대상.
  winnerProb: number;
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
  debate?: { verdict?: { reasoning?: string; homeWinProb?: number | null } };
  homeWinProb?: number | null;
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

function extractPreGameReasoning(r: unknown): string | null {
  if (!r || typeof r !== "object") return null;
  const shape = r as ReasoningPreShape;
  const reasoning = shape.debate?.verdict?.reasoning;
  return typeof reasoning === "string" ? reasoning : null;
}

function extractHomeWinProb(r: unknown): number {
  if (!r || typeof r !== "object") return 0.5;
  const shape = r as ReasoningPreShape;
  const hwp = shape.debate?.verdict?.homeWinProb ?? shape.homeWinProb;
  if (typeof hwp !== "number" || Number.isNaN(hwp)) return 0.5;
  return hwp;
}

/**
 * 강한 예측 / 유력 예측 (winnerProb ≥ 0.55, confident+lean 티어) 중 틀린 것 Top N.
 * 각 항목에 pre_game reasoning + post_game judge reasoning + factor error 통합.
 */
export async function buildMissReport(options: {
  limit?: number;
} = {}): Promise<MissReportItem[]> {
  const limit = options.limit ?? 10;
  const supabase = await createClient();

  // reasoning.homeWinProb 는 JSONB 필드라 서버 필터링 대신 is_correct=false
  // 전부 가져와 클라이언트에서 winnerProb tier 로 필터. limit 여유분 fetch
  // 후 tier 통과 건만 N 개 pick.
  // assertSelectOk — cycle 173 silent drift family apps/moneyball lib sub-dir
  // 차원 (reviews) 첫 진입. error 시 fail-loud (기존엔 data=null silent fallback
  // → 빈 miss list → "틀린 예측 없음" 위장 = 사용자엔 모델이 완벽한 것처럼 보임).
  const preResult = (await supabase
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
    .order("game_id", { ascending: false })
    .limit(limit * 6)) as unknown as SelectResult<PreGameRow[]>;

  const { data: preData } = assertSelectOk(
    preResult,
    "buildMissReport pre_game",
  );
  const allRows = (preData ?? []) as PreGameRow[];
  // winnerProb 계산 + tossup 제외 + winnerProb 내림차순 정렬 + limit.
  const scored = allRows
    .map((r) => ({ row: r, wp: winnerProbOf(extractHomeWinProb(r.reasoning)) }))
    .filter(({ wp }) => classifyWinnerProb(wp) !== 'tossup')
    .sort((a, b) => b.wp - a.wp)
    .slice(0, limit);
  const rows = scored.map((s) => s.row);
  if (rows.length === 0) return [];

  const gameIds = rows.map((r) => r.game_id).filter((id): id is number => id != null);

  // assertSelectOk — post_game select error 시 fail-loud (기존엔 silent
  // 빈 postByGame → factorErrors / judgePostview / missedBy 모두 빈 채로 노출
  // → 사용자엔 "사후 분석 없음" 으로 위장).
  const postResult = (await supabase
    .from("predictions")
    .select("game_id, reasoning")
    .eq("prediction_type", "post_game")
    .in("game_id", gameIds)) as unknown as SelectResult<PostGameRow[]>;

  const { data: postData } = assertSelectOk(
    postResult,
    "buildMissReport post_game",
  );
  const postByGame = new Map<number, ReasoningPostShape>();
  for (const p of (postData ?? []) as PostGameRow[]) {
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
      winnerProb: winnerProbOf(extractHomeWinProb(r.reasoning)),
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
