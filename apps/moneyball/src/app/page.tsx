import { PredictionCard } from "@/components/predictions/PredictionCard";
import { AccuracySummary } from "@/components/dashboard/AccuracySummary";
import { toKSTDateString, toKSTDisplayString, KBO_TEAMS, type TeamCode } from "@moneyball/shared";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 300; // 5분 ISR

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
        predicted_winner, confidence, prediction_type,
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

export default async function HomePage() {
  const today = toKSTDisplayString();
  const [games, accuracy] = await Promise.all([
    getTodayPredictions(),
    getSeasonAccuracy(),
  ]);

  return (
    <div className="space-y-8">
      {/* 히어로 섹션 */}
      <section>
        <h1 className="text-3xl font-bold mb-2">오늘의 승부예측</h1>
        <p className="text-gray-500">
          {today} KBO 경기 세이버메트릭스 기반 분석
        </p>
      </section>

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
            className="text-sm text-blue-600 hover:underline"
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
                <Link
                  key={game.id}
                  href={`/predictions/${game.game_date}?game=${game.id}`}
                >
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
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            <p className="text-lg">오늘 예측 데이터가 아직 없습니다.</p>
            <p className="text-sm mt-2">
              매일 KST 15:00에 선발 확정 후 예측이 생성됩니다.
            </p>
          </div>
        )}
      </section>

      {/* 방법론 소개 v1.5 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold mb-3">분석 방법론 v1.5</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {[
            { label: "선발 FIP", weight: "15%", desc: "투수 실력" },
            { label: "타선 wOBA", weight: "15%", desc: "타격 생산성" },
            { label: "불펜 FIP", weight: "10%", desc: "중계/마무리" },
            { label: "최근 폼", weight: "10%", desc: "최근 10경기" },
            { label: "Elo + WAR", weight: "16%", desc: "종합 전력" },
          ].map((item) => (
            <div key={item.label} className="p-3">
              <p className="text-2xl font-bold text-blue-600">{item.weight}</p>
              <p className="text-sm font-medium mt-1">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">
          + 선발xFIP 5% / 상대전적 5% / 수비SFR 5% / 구장보정 4% / 홈어드밴티지 3%
        </p>
      </section>
    </div>
  );
}
