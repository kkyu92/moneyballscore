import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';
import { JudgeVerdictPanel } from '@/components/analysis/JudgeVerdictPanel';
import { AgentArgumentBox } from '@/components/analysis/AgentArgumentBox';
import { PostviewPanel } from '@/components/analysis/PostviewPanel';
import { DetailedFactorAnalysis } from '@/components/analysis/DetailedFactorAnalysis';
import { GameOverview } from '@/components/analysis/GameOverview';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';
import type { FactorRawDetails } from '@/lib/analysis/factor-explanations';

export const revalidate = 600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  if (!Number.isFinite(gameId)) return {};

  const game = await getGameAnalysis(gameId);
  if (!game) return {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = game as any;
  const home = KBO_TEAMS[g.home_team?.code as TeamCode]?.name.split(' ')[0] ?? '';
  const away = KBO_TEAMS[g.away_team?.code as TeamCode]?.name.split(' ')[0] ?? '';
  const title = `${away} vs ${home} AI 분석 — ${g.game_date}`;
  const description = `${g.game_date} ${away} vs ${home} 세이버메트릭스 기반 AI 승부예측 분석. FIP, wOBA, Elo 등 10팩터 정량 모델 + 에이전트 토론.`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

async function getGameAnalysis(gameId: number) {
  const supabase = await createClient();

  const { data: game } = await supabase
    .from('games')
    .select(`
      id, game_date, game_time, stadium, status, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code, name_ko),
      away_team:teams!games_away_team_id_fkey(code, name_ko),
      winner:teams!games_winner_team_id_fkey(code),
      predictions(
        prediction_type, predicted_winner, confidence, reasoning, factors,
        is_correct, model_version, debate_version,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba,
        home_bullpen_fip, away_bullpen_fip,
        home_war_total, away_war_total,
        home_recent_form, away_recent_form,
        head_to_head_rate, park_factor,
        home_elo, away_elo,
        home_sfr, away_sfr
      )
    `)
    .eq('id', gameId)
    .maybeSingle();

  return game;
}

// Shape of reasoning.debate JSONB (v4-2 이후 구조)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDebate(reasoning: any) {
  const debate = reasoning?.debate;
  if (!debate) return null;
  return {
    homeArgument: debate.homeArgument,
    awayArgument: debate.awayArgument,
    calibration: debate.calibration,
    verdict: debate.verdict,
  };
}

export default async function GameAnalysisPage({ params }: PageProps) {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  if (!Number.isFinite(gameId) || gameId <= 0) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const game = (await getGameAnalysis(gameId)) as any;
  if (!game) {
    notFound();
  }

  const homeTeam = game.home_team?.code as TeamCode | undefined;
  const awayTeam = game.away_team?.code as TeamCode | undefined;
  if (!homeTeam || !awayTeam) {
    notFound();
  }

  // pre_game / post_game 분리
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const preGame = game.predictions?.find((p: any) => p.prediction_type === 'pre_game');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postGame = game.predictions?.find((p: any) => p.prediction_type === 'post_game');

  if (!preGame) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">분석 데이터 없음</h1>
        <p className="text-gray-500 dark:text-gray-400">
          이 경기는 아직 AI 분석이 생성되지 않았습니다.
        </p>
      </div>
    );
  }

  const debate = parseDebate(preGame.reasoning);
  const verdict = debate?.verdict;
  const homeArg = debate?.homeArgument;
  const awayArg = debate?.awayArgument;

  const isPast = game.status === 'final';
  const gameDate = game.game_date;

  const homeScore = game.home_score;
  const awayScore = game.away_score;

  // Postview 데이터 파싱
  const postReasoning = postGame?.reasoning as
    | {
        judgeReasoning?: string;
        factorErrors?: Array<{ factor: string; predictedBias: number; diagnosis?: string }>;
        homePostview?: { summary: string; keyFactor: string; missedBy: string };
        awayPostview?: { summary: string; keyFactor: string; missedBy: string };
      }
    | null;

  const homeName = KBO_TEAMS[homeTeam].name.split(' ')[0];
  const awayName = KBO_TEAMS[awayTeam].name.split(' ')[0];

  // 정량 팩터 원본값 — DetailedFactorAnalysis에 주입
  const factorDetails: FactorRawDetails = {
    homeSPFip: preGame.home_sp_fip,
    awaySPFip: preGame.away_sp_fip,
    homeSPxFip: preGame.home_sp_xfip,
    awaySPxFip: preGame.away_sp_xfip,
    homeWoba: preGame.home_lineup_woba,
    awayWoba: preGame.away_lineup_woba,
    homeBullpenFip: preGame.home_bullpen_fip,
    awayBullpenFip: preGame.away_bullpen_fip,
    homeWar: preGame.home_war_total,
    awayWar: preGame.away_war_total,
    homeForm: preGame.home_recent_form,
    awayForm: preGame.away_recent_form,
    h2hRate: preGame.head_to_head_rate,
    parkFactor: preGame.park_factor,
    homeElo: preGame.home_elo,
    awayElo: preGame.away_elo,
    homeSfr: preGame.home_sfr,
    awaySfr: preGame.away_sfr,
  };

  const homeWinProbForOverview = verdict?.homeWinProb ?? 0.5;
  const overview = buildGameOverview({
    homeWinProb: homeWinProbForOverview,
    homeSPFip: preGame.home_sp_fip,
    awaySPFip: preGame.away_sp_fip,
    homeWoba: preGame.home_lineup_woba,
    awayWoba: preGame.away_lineup_woba,
    h2hRate: preGame.head_to_head_rate,
    homeTeamName: homeName,
    awayTeamName: awayName,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${awayName} vs ${homeName} AI 승부예측 분석`,
    datePublished: gameDate,
    description: `${gameDate} ${awayName} vs ${homeName} 세이버메트릭스 기반 AI 분석`,
    articleBody: [
      overview.summary,
      verdict?.reasoning,
      homeArg?.reasoning,
      awayArg?.reasoning,
    ]
      .filter(Boolean)
      .join(' '),
    publisher: { "@type": "Organization", name: "MoneyBall Score" },
    mainEntityOfPage: `https://moneyballscore.vercel.app/analysis/game/${gameId}`,
  };

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 헤더 */}
      <header className="border-b border-gray-200 dark:border-[var(--color-border)] pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {gameDate} · {game.stadium ?? '구장 미정'}
          </p>
          {isPast && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">
              과거 경기
            </span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {KBO_TEAMS[awayTeam].name} vs {KBO_TEAMS[homeTeam].name}
        </h1>
        {isPast && homeScore !== null && awayScore !== null && (
          <p className="text-lg font-mono mt-2 text-gray-700 dark:text-gray-200">
            최종: {KBO_TEAMS[awayTeam].name.split(' ')[0]} {awayScore} -{' '}
            {homeScore} {KBO_TEAMS[homeTeam].name.split(' ')[0]}
            {game.winner?.code && ` · 승리 ${KBO_TEAMS[game.winner.code as TeamCode].name.split(' ')[0]}`}
          </p>
        )}
      </header>

      {/* 0. 경기 개요 — 태그 + 1-2줄 요약 */}
      <GameOverview tags={overview.tags} summary={overview.summary} />

      {/* 1. 심판 판정 (최상단, Design 리뷰 Pass 1) */}
      {verdict ? (
        <JudgeVerdictPanel
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          predictedWinner={verdict.predictedWinner}
          homeWinProb={verdict.homeWinProb}
          confidence={verdict.confidence}
          reasoning={verdict.reasoning}
          calibrationApplied={verdict.calibrationApplied}
        />
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500 dark:text-gray-400">
          심판 판정 데이터가 아직 없습니다.
        </div>
      )}

      {/* 2. 양팀 에이전트 논거 — 관례: away 왼쪽 / home 오른쪽 */}
      {homeArg && awayArg && (
        <section aria-labelledby="agent-debate-title" className="space-y-3">
          <h2 id="agent-debate-title" className="text-lg font-bold">
            양팀 에이전트 논거
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <AgentArgumentBox
              team={awayTeam}
              role="away"
              confidence={awayArg.confidence}
              keyFactor={awayArg.keyFactor}
              strengths={awayArg.strengths ?? []}
              opponentWeaknesses={awayArg.opponentWeaknesses ?? []}
              reasoning={awayArg.reasoning}
              emphasized={awayArg.confidence > homeArg.confidence}
            />
            <AgentArgumentBox
              team={homeTeam}
              role="home"
              confidence={homeArg.confidence}
              keyFactor={homeArg.keyFactor}
              strengths={homeArg.strengths ?? []}
              opponentWeaknesses={homeArg.opponentWeaknesses ?? []}
              reasoning={homeArg.reasoning}
              emphasized={homeArg.confidence > awayArg.confidence}
            />
          </div>
        </section>
      )}

      {/* 3. 팩터별 정량 해설 — 가중치 순 10팩터 × 1-2줄 한국어 서술 */}
      {preGame.factors && (
        <DetailedFactorAnalysis
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          factors={preGame.factors as Record<string, number>}
          details={factorDetails}
        />
      )}

      {/* 3b. 모델 메타 (접기) */}
      {preGame.factors && (
        <details className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2 text-xs">
          <summary className="cursor-pointer text-gray-500 dark:text-gray-400">
            모델 메타 정보
          </summary>
          <div className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
            <p>
              정량 모델: <span className="font-mono">{preGame.model_version}</span>
              {preGame.debate_version && (
                <>
                  {' · 토론 버전 '}
                  <span className="font-mono">{preGame.debate_version}</span>
                </>
              )}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 font-mono">
              {Object.entries(preGame.factors as Record<string, number>).map(
                ([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key}</span>
                    <span>{value.toFixed(3)}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </details>
      )}

      {/* 4. 회고 보정 (접기) */}
      {debate?.calibration && (
        <details className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
          <summary className="text-lg font-bold cursor-pointer">
            🔄 회고 보정
          </summary>
          <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
            {debate.calibration.recentBias && (
              <p>
                <span className="font-medium">최근 편향:</span>{' '}
                {debate.calibration.recentBias}
              </p>
            )}
            {debate.calibration.teamSpecific && (
              <p>
                <span className="font-medium">팀별:</span>{' '}
                {debate.calibration.teamSpecific}
              </p>
            )}
            {debate.calibration.modelWeakness && (
              <p>
                <span className="font-medium">모델 약점:</span>{' '}
                {debate.calibration.modelWeakness}
              </p>
            )}
            <p>
              <span className="font-medium">보정:</span>{' '}
              {debate.calibration.adjustmentSuggestion > 0 ? '+' : ''}
              {Math.round(debate.calibration.adjustmentSuggestion * 100)}%
            </p>
          </div>
        </details>
      )}

      {/* 5. 사후 분석 (조건부) */}
      {postReasoning && (
        <PostviewPanel
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homePostview={postReasoning.homePostview}
          awayPostview={postReasoning.awayPostview}
          factorErrors={postReasoning.factorErrors ?? []}
          judgeReasoning={postReasoning.judgeReasoning ?? ''}
        />
      )}
    </article>
  );
}
