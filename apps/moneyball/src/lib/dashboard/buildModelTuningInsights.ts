import { createClient } from "@/lib/supabase/server";
import { CURRENT_MODEL_FILTER } from "@/config/model";
import {
  analyzeFactorAccuracy,
  type FactorAccuracyReport,
  type FactorSample,
} from "./factor-accuracy";

interface TuningRow {
  factors: Record<string, number> | null;
  predicted_winner: number | null;
  game: {
    home_team_id: number | null;
    winner_team_id: number | null;
    status: string | null;
  } | null;
}

/**
 * /dashboard 모델 튜닝 섹션 데이터.
 * verified predictions × games 조인 → FactorSample[] 구성 → analyzeFactorAccuracy 호출.
 * 샘플 부족 시에도 report 자체는 반환 (프론트에서 "수집 중" 표시).
 */
export async function buildModelTuningInsights(): Promise<FactorAccuracyReport> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select(
      `
        factors,
        game:games!predictions_game_id_fkey(home_team_id, winner_team_id, status)
      `,
    )
    .eq("prediction_type", "pre_game")
    .match(CURRENT_MODEL_FILTER)
    .not("is_correct", "is", null);

  const rows = (data ?? []) as unknown as TuningRow[];

  const samples: FactorSample[] = [];
  for (const r of rows) {
    if (!r.factors || !r.game) continue;
    if (r.game.status !== "final") continue;
    if (r.game.home_team_id == null || r.game.winner_team_id == null) continue;
    const actualHomeWin: 0 | 1 =
      r.game.winner_team_id === r.game.home_team_id ? 1 : 0;
    samples.push({ factors: r.factors, actualHomeWin });
  }

  return analyzeFactorAccuracy(samples, { minSamples: 30 });
}
