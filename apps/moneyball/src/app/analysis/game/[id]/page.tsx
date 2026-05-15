import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import {
  KBO_TEAMS,
  assertSelectOk,
  shortTeamName,
  type TeamCode,
  type SelectResult,
} from '@moneyball/shared';
import { JudgeVerdictPanel } from '@/components/analysis/JudgeVerdictPanel';
import { AgentArgumentBox } from '@/components/analysis/AgentArgumentBox';
import { PostviewPanel } from '@/components/analysis/PostviewPanel';
import { DetailedFactorAnalysis } from '@/components/analysis/DetailedFactorAnalysis';
import { GameOverview } from '@/components/analysis/GameOverview';
import { ShareButtons } from '@/components/share/ShareButtons';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';
import type { FactorRawDetails } from '@/lib/analysis/factor-explanations';
import { presentJudgeReasoning } from '@/lib/predictions/judgeReasoning';

export const revalidate = 600;

interface PageProps {
  params: Promise<{ id: string }>;
}

interface DebateVerdict {
  homeWinProb: number;
  confidence: number;
  predictedWinner: TeamCode;
  reasoning: string;
  calibrationApplied: string | null;
}

interface DebateArgument {
  confidence: number;
  keyFactor: string;
  strengths?: string[];
  opponentWeaknesses?: string[];
  reasoning: string;
}

interface DebateCalibration {
  recentBias: string | null;
  teamSpecific: string | null;
  modelWeakness: string | null;
  adjustmentSuggestion: number;
}

interface PreGamePrediction {
  prediction_type: 'pre_game';
  predicted_winner: number | null;
  confidence: number;
  reasoning: { debate?: { verdict?: DebateVerdict; homeArgument?: DebateArgument; awayArgument?: DebateArgument; calibration?: DebateCalibration } } | null;
  factors: Record<string, number> | null;
  is_correct: boolean | null;
  model_version: string | null;
  debate_version: string | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_war_total: number | null;
  away_war_total: number | null;
  home_recent_form: number | null;
  away_recent_form: number | null;
  head_to_head_rate: number | null;
  park_factor: number | null;
  home_elo: number | null;
  away_elo: number | null;
  home_sfr: number | null;
  away_sfr: number | null;
}

interface PostGamePrediction {
  prediction_type: 'post_game';
  reasoning: {
    judgeReasoning?: string;
    factorErrors?: Array<{ factor: string; predictedBias: number; diagnosis?: string }>;
    homePostview?: { summary: string; keyFactor: string; missedBy: string };
    awayPostview?: { summary: string; keyFactor: string; missedBy: string };
  } | null;
}

type AnyPrediction = PreGamePrediction | PostGamePrediction;

interface GameAnalysisRow {
  id: number;
  game_date: string;
  game_time: string | null;
  stadium: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: string | null; name_ko: string | null } | null;
  away_team: { code: string | null; name_ko: string | null } | null;
  winner: { code: string | null } | null;
  predictions: AnyPrediction[] | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  if (!Number.isFinite(gameId)) return {};

  const game = await getGameAnalysis(gameId);
  if (!game) return {};

  const home = shortTeamName(game.home_team?.code as TeamCode);
  const away = shortTeamName(game.away_team?.code as TeamCode);
  const title = `${away} vs ${home} AI 분석 — ${game.game_date}`;
  const description = `${game.game_date} ${away} vs ${home} 세이버메트릭스 기반 AI 승부예측 분석. FIP, wOBA, Elo 등 10팩터 정량 모델 + 에이전트 토론.`;

  return {
    title,
    description,
    openGraph: { title, description },
    alternates: {
      canonical: `https://moneyballscore.vercel.app/analysis/game/${gameId}`,
    },
  };
}

async function getGameAnalysis(gameId: number): Promise<GameAnalysisRow | null> {
  const supabase = await createClient();

  // assertSelectOk — cycle 156 silent drift family detection. games maybeSingle
  // 가 .error 미체크 → DB 오류 시 game=null silent fallback → notFound() 호출
  // → 사용자에게 "경기를 찾을 수 없음" 가 노출 (실제로는 DB 오류, 정상 gameId
  // 도 마치 없는 경기처럼 위장). cycle 152~155 family 자연 후속. nested FK
  // (home_team / away_team / winner / predictions) 의 PostgrestResponseSuccess
  // 추론 (FK relation array 추론) 우회 위해 SelectResult cast.
  const result = (await supabase
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
    .maybeSingle()) as SelectResult<GameAnalysisRow>;
  const { data: game } = assertSelectOk(result, 'analysis-game.getGameAnalysis');

  return game ?? null;
}

export default async function GameAnalysisPage({ params }: PageProps) {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  if (!Number.isFinite(gameId) || gameId <= 0) {
    notFound();
  }

  const game = await getGameAnalysis(gameId);
  if (!game) {
    notFound();
  }

  const homeTeam = game.home_team?.code as TeamCode | undefined;
  const awayTeam = game.away_team?.code as TeamCode | undefined;
  if (!homeTeam || !awayTeam) {
    notFound();
  }

  const preGame = game.predictions?.find(
    (p): p is PreGamePrediction => p.prediction_type === 'pre_game',
  );
  const postGame = game.predictions?.find(
    (p): p is PostGamePrediction => p.prediction_type === 'post_game',
  );

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

  const debate = preGame.reasoning?.debate ?? null;
  const verdict = debate?.verdict;
  const homeArg = debate?.homeArgument;
  const awayArg = debate?.awayArgument;

  const isPast = game.status === 'final';
  const gameDate = game.game_date;

  const homeScore = game.home_score;
  const awayScore = game.away_score;

  const postReasoning = postGame?.reasoning ?? null;

  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

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

  // SportsEvent 스키마 — Google 이 "스포츠 경기" 리치 결과 후보로 노출 (팀·일정·구장).
  // Article 과 별도로 병기하여 크롤러가 선택.
  const homeFullName = KBO_TEAMS[homeTeam].name;
  const awayFullName = KBO_TEAMS[awayTeam].name;
  const stadiumName = game.stadium || KBO_TEAMS[homeTeam].stadium;
  const eventStatusIri = (() => {
    switch (game.status) {
      case 'postponed': return 'https://schema.org/EventPostponed';
      case 'final': return 'https://schema.org/EventCompleted';
      default: return 'https://schema.org/EventScheduled';
    }
  })();
  const startDateIso = `${gameDate}T${(game.game_time || '18:30').slice(0, 5)}:00+09:00`;
  const sportsEventLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${awayFullName} vs ${homeFullName}`,
    startDate: startDateIso,
    sport: "Baseball",
    eventStatus: eventStatusIri,
    location: { "@type": "Place", name: stadiumName },
    homeTeam: { "@type": "SportsTeam", name: homeFullName },
    awayTeam: { "@type": "SportsTeam", name: awayFullName },
    url: `https://moneyballscore.vercel.app/analysis/game/${gameId}`,
    organizer: {
      "@type": "SportsOrganization",
      name: "Korea Baseball Organization",
      url: "https://www.koreabaseball.com",
    },
  };

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventLd) }}
      />
      <Breadcrumb
        items={[
          { href: '/analysis', label: 'AI 분석' },
          { label: `${awayName} vs ${homeName} (${gameDate})` },
        ]}
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
            최종: {shortTeamName(awayTeam)} {awayScore} -{' '}
            {homeScore} {shortTeamName(homeTeam)}
            {game.winner?.code && ` · 승리 ${shortTeamName(game.winner.code as TeamCode)}`}
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
          reasoning={presentJudgeReasoning(verdict.reasoning) ?? ''}
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

      <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <ShareButtons
          url={`https://moneyballscore.vercel.app/analysis/game/${gameId}`}
          title={`${awayName} vs ${homeName} AI 승부예측 분석`}
          text={`${gameDate} ${awayName} vs ${homeName} 세이버메트릭스 기반 AI 분석`}
        />
      </footer>
    </article>
  );
}
