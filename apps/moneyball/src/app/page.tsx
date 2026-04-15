import { PredictionCard } from "@/components/predictions/PredictionCard";
import { AccuracySummary } from "@/components/dashboard/AccuracySummary";
import { BigMatchDebateCard } from "@/components/analysis/BigMatchDebateCard";
import { toKSTDateString, toKSTDisplayString, KBO_TEAMS, type TeamCode } from "@moneyball/shared";
import { selectBigMatch, type BigMatchCandidate } from "@moneyball/kbo-data";
import { isBigMatchEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

// v4-4: 10분 ISR (Eng 리뷰 P3)
export const revalidate = 600;

async function getTodayPredictions() {
  const supabase = await createClient();
  const today = toKSTDateString();

  // 오늘 경기 + 예측 조인
  const { data: games } = await supabase
    .from('games')
    .select(`
      id, game_date, game_time, stadium, status,
      home_score, away_score, external_game_id,
      home_team:teams!games_home_team_id_fkey(code, name_ko),
      away_team:teams!games_away_team_id_fkey(code, name_ko),
      home_sp:players!games_home_sp_id_fkey(name_ko),
      away_sp:players!games_away_sp_id_fkey(name_ko),
      predictions!inner(
        predicted_winner, confidence, prediction_type, reasoning,
        home_sp_fip, away_sp_fip, home_lineup_woba, away_lineup_woba,
        is_correct, actual_winner, factors, model_version,
        winner:teams!predictions_predicted_winner_fkey(code)
      )
    `)
    .eq('game_date', today)
    .eq('predictions.prediction_type', 'pre_game')
    .order('game_time');

  return games || [];
}

async function getSeasonAccuracy() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('predictions')
    .select('is_correct, confidence')
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null);

  if (!data || data.length === 0) {
    return { total: 0, correct: 0, rate: 0, highConfRate: 0 };
  }

  const total = data.length;
  const correct = data.filter((p) => p.is_correct).length;
  const highConf = data.filter((p) => p.confidence >= 0.4); // 70%+ 승리확률
  const highConfCorrect = highConf.filter((p) => p.is_correct).length;

  return {
    total,
    correct,
    rate: total > 0 ? correct / total : 0,
    highConfRate: highConf.length > 0 ? highConfCorrect / highConf.length : 0,
  };
}

// v4-4: 빅매치 선정 (flag enabled 시에만)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectBigMatchFromGames(games: any[]) {
  if (!isBigMatchEnabled()) return { bigMatch: null, result: null };

  const candidates: BigMatchCandidate[] = [];
  for (const game of games) {
    const pred = game.predictions?.[0];
    if (!pred) continue;
    candidates.push({
      gameId: game.id,
      homeTeam: game.home_team?.code,
      awayTeam: game.away_team?.code,
      homeElo: pred.home_elo ?? 1500,
      awayElo: pred.away_elo ?? 1500,
      homeRecentForm: pred.home_recent_form ?? 0.5,
      awayRecentForm: pred.away_recent_form ?? 0.5,
      confidence: pred.confidence ?? 0.5,
    });
  }

  const result = selectBigMatch(candidates);
  const bigMatch = result.bigMatchGameId
    ? games.find((g) => g.id === result.bigMatchGameId)
    : null;
  return { bigMatch, result };
}

export default async function HomePage() {
  const today = toKSTDisplayString();
  const [games, accuracy] = await Promise.all([
    getTodayPredictions(),
    getSeasonAccuracy(),
  ]);

  // v4-4: 빅매치 선정 (flag enabled 시)
  const { bigMatch } = selectBigMatchFromGames(games);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bigMatchPred = (bigMatch as any)?.predictions?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bigMatchDebate = (bigMatchPred?.reasoning as any)?.debate;
  const hasBigMatchHero = bigMatch && bigMatchDebate?.verdict;

  return (
    <div className="space-y-8">
      {/* v4-4 빅매치 Hero (flag enabled + 데이터 있을 때) */}
      {hasBigMatchHero ? (
        <BigMatchDebateCard
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          gameId={(bigMatch as any).id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          homeTeam={(bigMatch as any).home_team?.code as TeamCode}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          awayTeam={(bigMatch as any).away_team?.code as TeamCode}
          homeWinProb={bigMatchDebate.verdict.homeWinProb ?? 0.5}
          predictedWinner={bigMatchDebate.verdict.predictedWinner as TeamCode}
          reasoning={bigMatchDebate.verdict.reasoning ?? ''}
          homeConfidence={bigMatchDebate.homeArgument?.confidence}
          awayConfidence={bigMatchDebate.awayArgument?.confidence}
          homeKeyFactor={bigMatchDebate.homeArgument?.keyFactor}
          awayKeyFactor={bigMatchDebate.awayArgument?.keyFactor}
        />
      ) : (
        <section className="bg-gradient-to-r from-brand-800 to-brand-700 rounded-2xl p-6 md:p-8 text-white">
          <p className="text-brand-300 text-sm mb-1">{today}</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">오늘의 승부예측</h1>
          <p className="text-brand-200">
            KBO {games.length}경기 세이버메트릭스 기반 분석
          </p>
        </section>
      )}

      {/* 적중률 요약 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AccuracySummary
          total={accuracy.total}
          correct={accuracy.correct}
          rate={accuracy.rate}
          highConfRate={accuracy.highConfRate}
        />
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">
            오늘 경기 수
          </h3>
          <span className="text-4xl font-bold">{games.length}</span>
          <span className="text-sm text-gray-500 ml-1">경기</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">모델 버전</h3>
          <span className="text-4xl font-bold">v1.5</span>
          <p className="text-xs text-gray-500 mt-2">10팩터 3소스 가중합산</p>
        </div>
      </section>

      {/* 예측 카드 목록 */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">경기별 예측</h2>
          <Link
            href="/predictions"
            className="text-sm text-brand-600 hover:text-brand-800 hover:underline"
          >
            전체 보기 →
          </Link>
        </div>

        {games.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game: any) => {
              const pred = game.predictions?.[0];
              if (!pred) return null;
              const homeCode = game.home_team?.code as TeamCode;
              const awayCode = game.away_team?.code as TeamCode;
              return (
                <div key={game.id}>
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
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <span className="text-5xl block mb-4">⚾</span>
            <p className="text-lg font-medium text-gray-600">오늘 예측 데이터가 아직 없습니다</p>
            <p className="text-sm text-gray-400 mt-2">
              매일 KST 15:00에 선발 확정 후 예측이 생성됩니다
            </p>
            <Link href="/predictions" className="inline-block mt-4 text-sm text-brand-600 hover:underline">
              지난 예측 보기 →
            </Link>
          </div>
        )}
      </section>

      {/* 방법론 소개 v1.5 */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">분석 방법론</h2>
          <Link href="/about" className="text-xs text-brand-600 hover:underline">
            자세히 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "선발 FIP + xFIP", weight: "20%", icon: "🎯" },
            { label: "타선 wOBA", weight: "15%", icon: "💪" },
            { label: "불펜 + 수비", weight: "15%", icon: "🛡" },
            { label: "최근 폼 + 상대전적", weight: "15%", icon: "📈" },
            { label: "Elo + WAR", weight: "16%", icon: "⚡" },
            { label: "구장 + 홈어드밴티지", weight: "7%", icon: "🏟" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 bg-surface rounded-lg">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-brand-600 font-bold">{item.weight}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
