import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import {
  ELO_NEUTRAL_WIN_PCT,
  KBO_FACTOR_COUNT,
  KBO_TEAMS,
  KBO_OFFICIAL_URL,
  assertSelectOk,
  shortTeamName,
  SITE_URL,
  type TeamCode,
  type SelectResult,
  FACTOR_PICK_MIN_FACTORS,
  FACTOR_PICK_STRONG,
  FACTOR_PICK_COMPLETE,
  COMPOSITE_DUEL_MIN_VALID,
  COMPOSITE_DUEL_FACTOR_LABEL_LIMIT,
  DEFAULT_WEIGHTS,
  FACTOR_PICK_WEIGHT_TOTAL,
  CONVERGENCE_BADGE_WEIGHT_STRONG_PCT,
  KBO_DEFAULT_GAME_TIME,
} from '@moneyball/shared';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';
import { getRecentConvergencePickRecord, computeWinRatePct } from '@/lib/analysis/convergenceRecord';
import { JudgeVerdictPanel } from '@/components/analysis/JudgeVerdictPanel';
import { AgentArgumentBox } from '@/components/analysis/AgentArgumentBox';
import { PostviewPanel } from '@/components/analysis/PostviewPanel';
import { DetailedFactorAnalysis } from '@/components/analysis/DetailedFactorAnalysis';
import { FactorWaterfallChart } from '@/components/predictions/FactorWaterfallChart';
import { DebateTimeline } from '@/components/insights/DebateTimeline';
import type { DebateTimelineData } from '@/lib/insights/loader';
import { RivalryMemorySurface } from '@/components/predictions/RivalryMemorySurface';
import { HistoricalAnalogMatchup } from '@/components/predictions/HistoricalAnalogMatchup';
import { GameOverview } from '@/components/analysis/GameOverview';
import { ShareButtons } from '@/components/share/ShareButtons';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { RelatedLinks, type RelatedLink } from '@/components/shared/RelatedLinks';
import { canonicalPair } from '@/lib/matchup/canonicalPair';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';
import type { FactorRawDetails } from '@/lib/analysis/factor-explanations';
import { presentJudgeReasoningWithFallback } from '@/lib/predictions/judgeReasoning';
import { GameAnalysisProse } from '@/components/analysis/GameAnalysisProse';
import { FACTOR_LABELS_SHORT, FACTOR_GLOSSARY_ANCHORS } from '@/lib/predictions/factorLabels';

export const revalidate = 600; // ANALYSIS_GAME_ISR_SECONDS (Next.js 16 Turbopack: literal required)

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
  reasoning: { debate?: { verdict?: DebateVerdict; homeArgument?: DebateArgument; awayArgument?: DebateArgument; calibration?: DebateCalibration; quantitativeProb?: number } } | null;
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
  home_team_id: number | null;
  away_team_id: number | null;
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
  const description = `${game.game_date} ${away} vs ${home} 세이버메트릭스 기반 AI 승부예측 분석. FIP, wOBA, Elo 등 ${KBO_FACTOR_COUNT}팩터 정량 모델 + 에이전트 토론.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/analysis/game/${gameId}`,
      type: 'article',
      locale: 'ko_KR',
      siteName: 'MoneyBall Score',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/analysis/game/${gameId}`,
    },
  };
}

async function getGameAnalysis(gameId: number): Promise<GameAnalysisRow | null> {
  const supabase = await createClient();

  // assertSelectOk — DB 오류 시 game=null silent fallback 차단. nested FK
  // (home_team / away_team / winner / predictions) PostgrestResponseSuccess
  // 추론 (FK relation array 추론) 우회 위해 SelectResult cast.
  const result = (await supabase
    .from('games')
    .select(`
      id, game_date, game_time, stadium, status, home_score, away_score,
      home_team_id, away_team_id,
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

  const homeWinProbForOverview = verdict?.homeWinProb ?? ELO_NEUTRAL_WIN_PCT;
  const verdictPresented = verdict
    ? presentJudgeReasoningWithFallback(verdict.reasoning)
    : undefined;
  const isQuantOnlyFallback = verdictPresented?.isFallback ?? false;

  const overview = buildGameOverview({
    homeWinProb: homeWinProbForOverview,
    homeSPFip: preGame.home_sp_fip,
    awaySPFip: preGame.away_sp_fip,
    homeWoba: preGame.home_lineup_woba,
    awayWoba: preGame.away_lineup_woba,
    homeBullpenFip: preGame.home_bullpen_fip,
    awayBullpenFip: preGame.away_bullpen_fip,
    homeWar: preGame.home_war_total,
    awayWar: preGame.away_war_total,
    homeRecentForm: preGame.home_recent_form,
    awayRecentForm: preGame.away_recent_form,
    homeElo: preGame.home_elo,
    awayElo: preGame.away_elo,
    h2hRate: preGame.head_to_head_rate,
    homeTeamName: homeName,
    awayTeamName: awayName,
  });

  // wave-452: 팩터 수렴 픽 배지 계산
  const convergenceDuel = computeCompositeDuel({
    homeCode: homeTeam,
    homeLineupWoba: preGame.home_lineup_woba,
    awayLineupWoba: preGame.away_lineup_woba,
    homeSfr: preGame.home_sfr,
    awaySfr: preGame.away_sfr,
    homeBullpenFip: preGame.home_bullpen_fip,
    awayBullpenFip: preGame.away_bullpen_fip,
    homeSPFip: preGame.home_sp_fip,
    awaySPFip: preGame.away_sp_fip,
    homeSPXfip: preGame.home_sp_xfip,
    awaySPXfip: preGame.away_sp_xfip,
    homeWar: preGame.home_war_total,
    awayWar: preGame.away_war_total,
    homeElo: preGame.home_elo ?? undefined,
    awayElo: preGame.away_elo ?? undefined,
    homeRecentForm: preGame.home_recent_form ?? undefined,
    awayRecentForm: preGame.away_recent_form ?? undefined,
  });
  const isConvergencePick =
    convergenceDuel.validCount >= COMPOSITE_DUEL_MIN_VALID &&
    Math.abs(convergenceDuel.netScore) >= FACTOR_PICK_MIN_FACTORS;

  // wave-461: 수렴 픽 성적 라인 — 게임 상세 배지에 최근 N경기 적중 현황 표시
  const convergenceRecord = isConvergencePick
    ? await getRecentConvergencePickRecord()
    : { wins: 0, losses: 0, total: 0 };

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
    mainEntityOfPage: `${SITE_URL}/analysis/game/${gameId}`,
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
  const startDateIso = `${gameDate}T${(game.game_time || KBO_DEFAULT_GAME_TIME).slice(0, 5)}:00+09:00`;
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
    url: `${SITE_URL}/analysis/game/${gameId}`,
    organizer: {
      "@type": "SportsOrganization",
      name: "Korea Baseball Organization",
      url: KBO_OFFICIAL_URL,
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
            <span className="text-xs bg-gray-100 dark:bg-[var(--color-surface-card)] text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">
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

      {/* wave-452: 팩터 수렴 픽 배지 — |netScore| >= FACTOR_PICK_MIN_FACTORS 시 표시 · wave-456: 상대 팀 우세 팩터 칩 + 모델-합치 칩 · wave-461: 합치 칩 3-tier 색상 + 성적 라인 · wave-463: 수렴 단계 레이블 칩 (완전수렴/강수렴) */}
      {isConvergencePick && (() => {
        const favoredHome = convergenceDuel.netScore > 0;
        const hw = convergenceDuel.homeWins;
        const aw = convergenceDuel.awayWins;
        const favoredName = shortTeamName(favoredHome ? homeTeam : awayTeam);
        const ratio = favoredHome ? `${hw}:${aw}` : `${aw}:${hw}`;
        const convStrength = Math.abs(convergenceDuel.netScore);
        const favoredSlugs = favoredHome
          ? convergenceDuel.homeFavoredSlugs
          : convergenceDuel.awayFavoredSlugs;
        const favoredWeight = favoredSlugs.reduce(
          (sum, slug) => sum + (DEFAULT_WEIGHTS[slug as keyof typeof DEFAULT_WEIGHTS] ?? 0),
          0,
        );
        const favoredWeightPct = Math.round((favoredWeight / FACTOR_PICK_WEIGHT_TOTAL) * 100);
        const isWeightStrong = favoredWeightPct >= CONVERGENCE_BADGE_WEIGHT_STRONG_PCT;
        const isComplete = convStrength >= FACTOR_PICK_COMPLETE;
        // wave-463: 수렴 단계 — isStrong = !isComplete && convStrength ≥ FACTOR_PICK_STRONG(8)
        const isStrong = !isComplete && convStrength >= FACTOR_PICK_STRONG;
        const badgeClass = isComplete
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-300'
          : isWeightStrong
            ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800/50 text-brand-700 dark:text-brand-300'
            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-400';
        // wave-456: 상대 팀 우세 팩터 + 모델-합치
        const opponentSlugs = favoredHome
          ? convergenceDuel.awayFavoredSlugs
          : convergenceDuel.homeFavoredSlugs;
        const favoredTeam = favoredHome ? homeTeam : awayTeam;
        const modelAgrees = verdict?.predictedWinner === favoredTeam;
        return (
          <div className={`rounded-lg border px-4 py-2.5 text-sm ${badgeClass}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs uppercase tracking-wide opacity-70">팩터 수렴 픽</span>
              {/* wave-463: 수렴 단계 레이블 — 완전수렴(amber) / 강수렴(brand) */}
              {isComplete && (
                <span className="inline-block text-xs px-1.5 py-0 rounded font-semibold bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300">
                  완전수렴
                </span>
              )}
              {isStrong && (
                <span className="inline-block text-xs px-1.5 py-0 rounded font-semibold bg-brand-100 dark:bg-brand-800/40 text-brand-700 dark:text-brand-300">
                  강수렴
                </span>
              )}
              <span className="font-semibold">{favoredName} 우세</span>
              <span className="font-mono text-xs">{ratio}</span>
              <span className="font-mono text-xs opacity-60" title="우세 팩터 가중치 합 / 전체 팩터 가중치">가중{favoredWeightPct}%</span>
              {/* wave-456: 모델-합치 칩 — 모델 예측과 팩터 수렴 방향 일치 시 · wave-461: 3-tier 색상 (isComplete=amber / else brand) */}
              {modelAgrees && verdict && (
                <span className={`inline-block text-xs px-1 py-0 rounded font-medium ${isComplete ? 'bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300' : 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'}`}>
                  ✓ 합치
                </span>
              )}
              {/* wave-454: 우세 팩터 칩 — 수렴 팩터 slug → 단축 레이블 + 용어집 링크 */}
              {favoredSlugs.map((slug) => {
                const chipLabel = FACTOR_LABELS_SHORT[slug];
                if (!chipLabel) return null;
                const anchor = FACTOR_GLOSSARY_ANCHORS[slug];
                const chipClass = isComplete
                  ? 'bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-700/50'
                  : isWeightStrong
                    ? 'bg-brand-100 dark:bg-brand-800/40 text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-700/50'
                    : 'bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/40';
                return anchor ? (
                  <Link
                    key={slug}
                    href={`/glossary#${anchor}`}
                    className={`inline-block text-xs px-1.5 py-0.5 rounded transition-colors ${chipClass}`}
                  >
                    {chipLabel}
                  </Link>
                ) : (
                  <span
                    key={slug}
                    className="inline-block text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-400"
                  >
                    {chipLabel}
                  </span>
                );
              })}
            </div>
            {/* wave-456: 상대 팀 우세 팩터 칩 — 비수렴 팩터 (완전수렴 시 미표시) */}
            {!isComplete && opponentSlugs.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {opponentSlugs.map((slug) => {
                  const chipLabel = FACTOR_LABELS_SHORT[slug];
                  if (!chipLabel) return null;
                  const anchor = FACTOR_GLOSSARY_ANCHORS[slug];
                  return anchor ? (
                    <Link
                      key={slug}
                      href={`/glossary#${anchor}`}
                      className="inline-block text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/60 transition-colors"
                    >
                      {chipLabel}
                    </Link>
                  ) : (
                    <span
                      key={slug}
                      className="inline-block text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400"
                    >
                      {chipLabel}
                    </span>
                  );
                })}
              </div>
            )}
            {/* wave-461: 수렴 픽 성적 라인 — 최근 N경기 적중 현황 */}
            {convergenceRecord.total > 0 && (
              <p
                className="mt-1.5 text-[11px] tabular-nums opacity-60"
                title={`최근 ${convergenceRecord.total}경기 팩터 수렴 픽 적중 현황`}
              >
                최근 {convergenceRecord.total}경기 {convergenceRecord.wins}승{convergenceRecord.losses}패{' '}
                ({computeWinRatePct(convergenceRecord.wins, convergenceRecord.total)}%)
              </p>
            )}
          </div>
        );
      })()}

      {/* wave-478: 비수렴 경기에도 팩터 N:M 균형 배지 표시 — wave-473이 analysis LIST에 한 것을 game DETAIL에 적용 */}
      {/* wave-480: 우세 팩터 단축 레이블 인라인 표시 — wave-430(LIST 수렴) 패턴을 DETAIL 비수렴에 적용 */}
      {!isConvergencePick && convergenceDuel.validCount >= COMPOSITE_DUEL_MIN_VALID && (() => {
        const favoredHome = convergenceDuel.netScore > 0;
        const isTied = convergenceDuel.netScore === 0;
        const hw = convergenceDuel.homeWins;
        const aw = convergenceDuel.awayWins;
        const favoredName = isTied ? null : shortTeamName(favoredHome ? homeTeam : awayTeam);
        const ratio = favoredHome ? `${hw}:${aw}` : `${aw}:${hw}`;
        const favoredSlugs = isTied
          ? []
          : (favoredHome ? convergenceDuel.homeFavoredSlugs : convergenceDuel.awayFavoredSlugs)
              .slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT);
        const factorInline = favoredSlugs.map((s) => FACTOR_LABELS_SHORT[s] ?? s).join('·');
        return (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs uppercase tracking-wide opacity-70">팩터 균형</span>
              {favoredName ? (
                <span className="font-semibold text-gray-700 dark:text-gray-300">{favoredName} 우세</span>
              ) : (
                <span className="font-semibold text-gray-700 dark:text-gray-300">균형</span>
              )}
              <span className="font-mono text-xs">팩터 {ratio}</span>
              {factorInline && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">({factorInline})</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* 0a. AI 종합 분석 요약 — factor 서술형 prose (AdSense content quality) */}
      {preGame.factors && (
        <GameAnalysisProse
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeWinProb={homeWinProbForOverview}
          factors={preGame.factors as Record<string, number>}
          details={factorDetails}
        />
      )}

      {/* 1. 심판 판정 (최상단, Design 리뷰 Pass 1) */}
      {verdict ? (
        <JudgeVerdictPanel
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          predictedWinner={verdict.predictedWinner}
          homeWinProb={verdict.homeWinProb}
          confidence={verdict.confidence}
          reasoning={verdictPresented?.text ?? ''}
          calibrationApplied={verdict.calibrationApplied}
          isQuantOnlyFallback={isQuantOnlyFallback}
        />
      ) : (
        <div className="bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-xl p-6 text-center text-gray-500 dark:text-gray-400">
          심판 판정 데이터가 아직 없습니다.
        </div>
      )}

      {/* 2a. AI 토론 timeline 5 step 시각화 — 정량 baseline → 홈/원정 옹호 → 보정 → 심판 */}
      {debate && verdict && !isQuantOnlyFallback && (() => {
        const timelineData: DebateTimelineData = {
          quantHomeProb: debate.quantitativeProb ?? null,
          homeArgument: debate.homeArgument
            ? {
                keyFactor: debate.homeArgument.keyFactor ?? null,
                strengths: debate.homeArgument.strengths ?? [],
                opponentWeaknesses: debate.homeArgument.opponentWeaknesses ?? [],
                confidence: debate.homeArgument.confidence ?? null,
                reasoning: debate.homeArgument.reasoning ?? null,
              }
            : null,
          awayArgument: debate.awayArgument
            ? {
                keyFactor: debate.awayArgument.keyFactor ?? null,
                strengths: debate.awayArgument.strengths ?? [],
                opponentWeaknesses: debate.awayArgument.opponentWeaknesses ?? [],
                confidence: debate.awayArgument.confidence ?? null,
                reasoning: debate.awayArgument.reasoning ?? null,
              }
            : null,
          calibration: debate.calibration
            ? {
                recentBias: debate.calibration.recentBias ?? null,
                teamSpecific: debate.calibration.teamSpecific ?? null,
                modelWeakness: debate.calibration.modelWeakness ?? null,
                adjustmentSuggestion: debate.calibration.adjustmentSuggestion ?? null,
              }
            : null,
          verdictHomeProb: verdict.homeWinProb,
          verdictConfidence: verdict.confidence,
          verdictReasoning: verdict.reasoning,
          predictedWinner: verdict.predictedWinner,
          calibrationApplied: verdict.calibrationApplied,
        };
        return (
          <DebateTimeline
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            debate={timelineData}
          />
        );
      })()}

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
              isQuantOnlyFallback={isQuantOnlyFallback}
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
              isQuantOnlyFallback={isQuantOnlyFallback}
            />
          </div>
        </section>
      )}

      {/* 3. 팩터별 정량 해설 — 가중치 순 KBO_FACTOR_COUNT 팩터 × 1-2줄 한국어 서술 */}
      {preGame.factors && (
        <DetailedFactorAnalysis
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          factors={preGame.factors as Record<string, number>}
          details={factorDetails}
        />
      )}

      {/* 3.5 팩터 누적 영향 waterfall chart — 모델 prob 도출 path 시각화 */}
      {preGame.factors && (
        <FactorWaterfallChart
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          factors={preGame.factors as Record<string, number>}
        />
      )}

      {/* 3a. 라이벌리 메모리 — AI 에이전트가 학습한 매치업 패턴 (max 3, 없으면 hide) */}
      <RivalryMemorySurface
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        asOfDate={gameDate}
      />

      {/* 3b. 최근 같은 대결 — 우리 모델 과거 예측 vs 실제 결과 */}
      {game.home_team_id != null && game.away_team_id != null && (
        <HistoricalAnalogMatchup
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeTeamId={game.home_team_id}
          awayTeamId={game.away_team_id}
          gameId={gameId}
          asOfDate={gameDate}
        />
      )}

      {/* 3c. 모델 메타 (접기) */}
      {preGame.factors && (
        <details className="bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-lg px-4 py-2 text-xs">
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
          url={`${SITE_URL}/analysis/game/${gameId}`}
          title={`${awayName} vs ${homeName} AI 승부예측 분석`}
          text={`${gameDate} ${awayName} vs ${homeName} 세이버메트릭스 기반 AI 분석`}
        />
      </footer>

      {(() => {
        const pair = canonicalPair(homeTeam, awayTeam);
        const items: RelatedLink[] = [
          { href: `/teams/${homeTeam}`, label: `${homeName} 팀 프로필`, hint: '시즌 통계 + 적중률' },
          { href: `/teams/${awayTeam}`, label: `${awayName} 팀 프로필`, hint: '시즌 통계 + 적중률' },
          ...(pair ? [{ href: pair.path, label: `${shortTeamName(awayTeam)} vs ${shortTeamName(homeTeam)} 매치업`, hint: '상대전적 + 예측 성과' }] : []),
          { href: `/predictions/${gameDate}`, label: `${gameDate} 전체 예측`, hint: '같은 날짜 다른 경기' },
          ...(isPast ? [{ href: `/insights/${gameDate}`, label: `${gameDate} AI 인사이트`, hint: 'AI 심판 에이전트 reasoning 아카이브' }] : []),
        ];
        return <RelatedLinks title="관련 페이지" items={items} />;
      })()}
    </article>
  );
}
