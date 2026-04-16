import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PredictionCard } from "@/components/predictions/PredictionCard";
import { FactorBreakdown } from "@/components/predictions/FactorBreakdown";
import type { TeamCode } from "@moneyball/shared";

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `${date} 승부예측`,
    description: `${date} KBO 경기 세이버메트릭스 기반 승부예측 상세 분석`,
  };
}

async function getGamePredictions(date: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('games')
    .select(`
      id, game_date, game_time, stadium, status,
      home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code, name_ko),
      away_team:teams!games_away_team_id_fkey(code, name_ko),
      home_sp:players!games_home_sp_id_fkey(name_ko),
      away_sp:players!games_away_sp_id_fkey(name_ko),
      predictions(
        predicted_winner, confidence, prediction_type,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba,
        home_bullpen_fip, away_bullpen_fip,
        home_war_total, away_war_total,
        home_recent_form, away_recent_form,
        head_to_head_rate, park_factor,
        home_elo, away_elo, home_sfr, away_sfr,
        is_correct, actual_winner, factors, model_version, reasoning,
        winner:teams!predictions_predicted_winner_fkey(code)
      )
    `)
    .eq('game_date', date)
    .eq('predictions.prediction_type', 'pre_game')
    .order('game_time');

  return data || [];
}

export const revalidate = 300;

export default async function PredictionDatePage({ params }: Props) {
  const { date } = await params;
  const games = await getGamePredictions(date);

  const verified = games.filter((g: any) => g.predictions?.[0]?.is_correct !== null);
  const correct = verified.filter((g: any) => g.predictions?.[0]?.is_correct);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{date} 승부예측</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {games.length}경기
            {verified.length > 0 && (
              <span className="ml-2">
                — 적중률 {Math.round((correct.length / verified.length) * 100)}%
                ({correct.length}/{verified.length})
              </span>
            )}
          </p>
        </div>
      </div>

      {games.length > 0 ? (
        <div className="space-y-6">
          {games.map((game: any) => {
            const pred = game.predictions?.[0];
            if (!pred) return null;
            const homeCode = game.home_team?.code as TeamCode;
            const awayCode = game.away_team?.code as TeamCode;

            return (
              <div key={game.id} className="space-y-3">
                <PredictionCard
                  homeTeam={homeCode}
                  awayTeam={awayCode}
                  confidence={pred.confidence}
                  predictedWinner={pred.winner?.code as TeamCode}
                  homeSPName={game.home_sp?.name_ko}
                  awaySPName={game.away_sp?.name_ko}
                  homeSPFip={pred.home_sp_fip}
                  awaySPFip={pred.away_sp_fip}
                  homeWoba={pred.home_lineup_woba}
                  awayWoba={pred.away_lineup_woba}
                  gameTime={game.game_time?.slice(0, 5)}
                  isCorrect={pred.is_correct}
                  homeScore={game.home_score}
                  awayScore={game.away_score}
                  winProb={(pred.reasoning as any)?.homeWinProb != null
                    ? (pred.winner?.code === homeCode
                      ? (pred.reasoning as any).homeWinProb
                      : 1 - (pred.reasoning as any).homeWinProb)
                    : undefined}
                  gameId={game.id}
                />

                {/* 팩터 투명성 */}
                {pred.factors && (
                  <FactorBreakdown
                    factors={pred.factors}
                    homeTeam={homeCode}
                    awayTeam={awayCode}
                    details={{
                      homeSPFip: pred.home_sp_fip,
                      awaySPFip: pred.away_sp_fip,
                      homeSPxFip: pred.home_sp_xfip,
                      awaySPxFip: pred.away_sp_xfip,
                      homeWoba: pred.home_lineup_woba,
                      awayWoba: pred.away_lineup_woba,
                      homeBullpenFip: pred.home_bullpen_fip,
                      awayBullpenFip: pred.away_bullpen_fip,
                      homeWar: pred.home_war_total,
                      awayWar: pred.away_war_total,
                      homeForm: pred.home_recent_form,
                      awayForm: pred.away_recent_form,
                      h2hRate: pred.head_to_head_rate,
                      parkFactor: pred.park_factor,
                      homeElo: pred.home_elo,
                      awayElo: pred.away_elo,
                      homeSfr: pred.home_sfr,
                      awaySfr: pred.away_sfr,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-8 text-center text-gray-400 dark:text-gray-500">
          <p className="text-lg">{date}의 예측 데이터가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
