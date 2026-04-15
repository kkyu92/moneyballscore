import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { KBO_TEAMS, toKSTDateString, type TeamCode } from '@moneyball/shared';
import { selectBigMatch, type BigMatchCandidate } from '@moneyball/kbo-data';

// v4-4 Task 4: /analysis 인덱스 + 시즌 AI 리더보드

export const revalidate = 3600; // 1시간 ISR

async function getTodayBigMatch() {
  const supabase = await createClient();
  const today = toKSTDateString();

  const { data: games } = await supabase
    .from('games')
    .select(`
      id,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        confidence, home_elo, away_elo, home_recent_form, away_recent_form,
        prediction_type
      )
    `)
    .eq('game_date', today)
    .eq('predictions.prediction_type', 'pre_game');

  if (!games) return { bigMatchId: null, candidates: 0 };

  const candidates: BigMatchCandidate[] = [];
  for (const g of games) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const game = g as any;
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
  return { bigMatchId: result.bigMatchGameId, mode: result.mode, candidates: candidates.length };
}

async function getSeasonStats() {
  const supabase = await createClient();

  // v2-persona4 (v4-2 이후 토론 기반) 누적 적중률
  const { data: debatePreds } = await supabase
    .from('predictions')
    .select('is_correct, confidence')
    .eq('prediction_type', 'pre_game')
    .eq('debate_version', 'v2-persona4')
    .not('is_correct', 'is', null);

  const total = debatePreds?.length ?? 0;
  const correct = debatePreds?.filter((p) => p.is_correct).length ?? 0;
  const rate = total > 0 ? correct / total : 0;

  // factor 오답률 top 3 (migration 010 view)
  const { data: factorErrors } = await supabase
    .from('factor_error_summary')
    .select('factor, error_count, avg_bias')
    .order('error_count', { ascending: false })
    .limit(3);

  return {
    total,
    correct,
    rate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topFactorErrors: (factorErrors ?? []) as Array<{ factor: string; error_count: number; avg_bias: number }>,
  };
}

export default async function AnalysisIndexPage() {
  const [bigMatch, stats] = await Promise.all([
    getTodayBigMatch(),
    getSeasonStats(),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold mb-2">AI 분석 센터</h1>
        <p className="text-gray-600">
          KBO 승부예측 AI의 오늘 빅매치와 시즌 누적 성과
        </p>
      </header>

      {/* 오늘의 빅매치 */}
      <section aria-labelledby="big-match-title">
        <h2 id="big-match-title" className="text-xl font-bold mb-4">
          ⭐ 오늘의 빅매치
        </h2>
        {bigMatch.bigMatchId ? (
          <Link
            href={`/analysis/game/${bigMatch.bigMatchId}`}
            className="block bg-gradient-to-br from-[var(--color-bg-hero-start)] to-[var(--color-bg-hero-end)] text-white rounded-2xl p-8 hover:shadow-xl transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <p className="text-sm text-brand-200 mb-2">
              AI 에이전트 토론 대상 경기
            </p>
            <p className="text-2xl font-bold">상세 분석 보기 →</p>
          </Link>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
            {bigMatch.mode === 'no-games' ? (
              <>
                <p className="text-4xl mb-2">😴</p>
                <p className="text-lg font-medium">오늘은 KBO 휴식일</p>
                <div className="mt-4 flex gap-3 justify-center text-sm">
                  <Link
                    href="/reviews"
                    className="text-brand-600 hover:underline"
                  >
                    어제 결과 보기 →
                  </Link>
                  <Link
                    href="/predictions"
                    className="text-brand-600 hover:underline"
                  >
                    내일 미리보기 →
                  </Link>
                </div>
              </>
            ) : (
              <p>오늘 빅매치 후보가 접전 기준을 충족하지 않습니다</p>
            )}
          </div>
        )}
      </section>

      {/* 시즌 AI 리더보드 */}
      <section aria-labelledby="leaderboard-title">
        <h2 id="leaderboard-title" className="text-xl font-bold mb-4">
          📊 시즌 AI 리더보드
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {/* 누적 적중률 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm text-gray-500 mb-2">
              토론 기반 예측 누적 적중률 (v2-persona4)
            </h3>
            {stats.total >= 10 ? (
              <>
                <p className="text-4xl font-bold text-brand-600 mb-1">
                  {Math.round(stats.rate * 100)}%
                </p>
                <p className="text-xs text-gray-500">
                  {stats.correct} / {stats.total} 경기
                </p>
              </>
            ) : (
              <p className="text-gray-500 italic">
                시즌 시작 전 — 데이터 부족 ({stats.total} 경기)
              </p>
            )}
          </div>

          {/* Factor 오답률 top 3 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm text-gray-500 mb-3">
              가장 자주 틀린 Factor Top 3
            </h3>
            {stats.topFactorErrors.length > 0 ? (
              <ul className="space-y-2">
                {stats.topFactorErrors.map((f, i) => (
                  <li
                    key={f.factor}
                    className="flex justify-between text-sm font-mono"
                  >
                    <span>
                      <span className="text-gray-400 mr-2">{i + 1}.</span>
                      {f.factor}
                    </span>
                    <span className="text-gray-500">
                      {f.error_count}회
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">
                집계 부족 — 사후 분석 경기가 쌓이면 표시됩니다
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
