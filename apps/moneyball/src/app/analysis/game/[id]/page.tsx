import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';
import { JudgeVerdictPanel } from '@/components/analysis/JudgeVerdictPanel';
import { AgentArgumentBox } from '@/components/analysis/AgentArgumentBox';
import { PostviewPanel } from '@/components/analysis/PostviewPanel';

// v4-4 Task 1: 경기 상세 분석 페이지
// Design 리뷰 Pass 1: 섹션 순서 — 심판 → 양팀 에이전트 → 정량 모델 → 사후분석

export const revalidate = 600; // 10분 ISR

interface PageProps {
  params: Promise<{ id: string }>;
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
        is_correct, model_version, debate_version
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

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-6">
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

      {/* 3. 정량 모델 (접기/기본 expanded) */}
      {preGame.factors && (
        <details className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5" open>
          <summary className="text-lg font-bold cursor-pointer">
            📊 정량 모델 v1.5 결과
          </summary>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              모델 버전: <span className="font-mono">{preGame.model_version}</span>
              {preGame.debate_version && (
                <>
                  {' · 토론 버전: '}
                  <span className="font-mono">{preGame.debate_version}</span>
                </>
              )}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(preGame.factors as Record<string, number>).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="bg-gray-50 dark:bg-gray-800 rounded p-2 font-mono flex justify-between"
                  >
                    <span className="text-gray-600 dark:text-gray-300">{key}</span>
                    <span className="text-gray-900">{value.toFixed(3)}</span>
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
