import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PredictionCard } from "@/components/predictions/PredictionCard";
import { FactorBreakdown } from "@/components/predictions/FactorBreakdown";
import { JudgeReasoningCard } from "@/components/predictions/JudgeReasoningCard";
import { AnalysisLink } from "@/components/shared/AnalysisLink";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";

interface Props {
  params: Promise<{ date: string }>;
}

const SITE_URL = "https://moneyballscore.vercel.app";

interface Verdict {
  reasoning?: string;
  homeWinProb?: number;
  predictedWinner?: string;
  homeArgSummary?: string;
  awayArgSummary?: string;
}

type ReasoningShape = {
  debate?: { verdict?: Verdict };
  homeWinProb?: number;
};

function getVerdict(reasoning: unknown): Verdict | null {
  if (!reasoning || typeof reasoning !== "object") return null;
  const r = reasoning as ReasoningShape;
  return r.debate?.verdict ?? null;
}

function getHomeWinProb(reasoning: unknown): number | undefined {
  if (!reasoning || typeof reasoning !== "object") return undefined;
  const r = reasoning as ReasoningShape;
  return r.debate?.verdict?.homeWinProb ?? r.homeWinProb ?? undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const url = `${SITE_URL}/predictions/${date}`;
  return {
    title: `${date} KBO 승부예측`,
    description: `${date} KBO 경기 세이버메트릭스 + AI 에이전트 토론 기반 승부예측. 팩터별 분석과 심판 에이전트의 reasoning을 경기별로 제공합니다.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${date} KBO 승부예측`,
      description: `${date} KBO 경기 AI 승부예측과 팩터 분석`,
      url,
      type: "article",
      publishedTime: `${date}T00:00:00+09:00`,
      authors: ["MoneyBall AI"],
      locale: "ko_KR",
      siteName: "MoneyBall Score",
    },
    twitter: {
      card: "summary_large_image",
      title: `${date} KBO 승부예측`,
      description: `${date} KBO 경기 AI 승부예측과 팩터 분석`,
    },
  };
}

interface DatePrediction {
  predicted_winner: number | null;
  confidence: number;
  prediction_type: string;
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
  is_correct: boolean | null;
  actual_winner: number | null;
  factors: Record<string, number> | null;
  model_version: string | null;
  reasoning: { debate?: { verdict?: Verdict } } | null;
  winner: { code: string | null } | null;
}

interface DateGame {
  id: number;
  game_date: string;
  game_time: string | null;
  stadium: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: string | null; name_ko: string | null } | null;
  away_team: { code: string | null; name_ko: string | null } | null;
  home_sp: { name_ko: string | null } | null;
  away_sp: { name_ko: string | null } | null;
  predictions: DatePrediction[];
}

async function getGamePredictions(date: string): Promise<DateGame[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("games")
    .select(
      `
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
    `,
    )
    .eq("game_date", date)
    .eq("predictions.prediction_type", "pre_game")
    .order("game_time");

  return (data ?? []) as unknown as DateGame[];
}

export const revalidate = 300;

function formatTeamName(code: TeamCode | undefined): string {
  if (!code) return "";
  return KBO_TEAMS[code]?.name.split(" ")[0] ?? code;
}

/**
 * 페이지 상단에 노출되는 AI 자동 생성 intro 한 줄.
 * 검증 완료 vs 예정 상태를 구분해서 적절한 프레이밍 제공.
 */
function buildIntro(
  date: string,
  games: DateGame[],
  predicted: DateGame[],
  verified: DateGame[],
  correct: DateGame[],
): string {
  const n = games.length;
  if (n === 0) return `${date} KBO 예측 데이터가 없습니다.`;

  // 경기는 있는데 예측이 아직 없음 (보통 경기 시작 3시간 이전 시점)
  if (predicted.length === 0) {
    return `${date} KBO ${n}경기 예정. 각 경기 시작 3시간 전 승부예측이 자동 생성되어 이 페이지에 공개됩니다.`;
  }

  const allVerified = verified.length === predicted.length && predicted.length > 0;
  const rate = verified.length > 0 ? Math.round((correct.length / verified.length) * 100) : null;

  // 예측 있는 경기 중 가장 박빙
  const tightest = [...predicted].sort((a, b) => {
    const ca = a.predictions?.[0]?.confidence ?? 1;
    const cb = b.predictions?.[0]?.confidence ?? 1;
    return ca - cb;
  })[0];

  const tHome = formatTeamName(tightest?.home_team?.code as TeamCode);
  const tAway = formatTeamName(tightest?.away_team?.code as TeamCode);
  const tConf = tightest?.predictions?.[0]?.confidence;
  const tConfPct =
    typeof tConf === "number" ? Math.round((0.5 + tConf / 2) * 100) : null;
  const tightestPhrase = tAway && tHome ? `${tAway} vs ${tHome}` : "";

  if (allVerified && rate !== null) {
    return `${date} KBO ${predicted.length}경기 최종 결과 — AI 적중률 ${rate}% (${correct.length}/${verified.length})${tightestPhrase ? `. 가장 박빙이었던 경기: ${tightestPhrase}` : ""}.`;
  }

  if (verified.length > 0 && rate !== null) {
    return `${date} KBO ${predicted.length}경기 승부예측 — 현재까지 ${verified.length}경기 검증 완료, 적중 ${correct.length}${tightestPhrase ? `. 가장 박빙 매치업: ${tightestPhrase}${tConfPct ? ` (${tConfPct}% 확신)` : ""}` : ""}.`;
  }

  return `${date} KBO ${predicted.length}경기 승부예측${tightestPhrase ? `. AI가 꼽은 가장 박빙 매치업은 ${tightestPhrase}${tConfPct ? ` (${tConfPct}% 확신)` : ""}` : ""}. 각 경기마다 10개 팩터 분석과 심판 에이전트 reasoning을 제공합니다.`;
}

function buildArticleJsonLd(
  date: string,
  games: DateGame[],
  predicted: DateGame[],
  verified: DateGame[],
  correct: DateGame[],
) {
  const url = `${SITE_URL}/predictions/${date}`;
  const rate = verified.length > 0 ? Math.round((correct.length / verified.length) * 100) : null;
  const n = games.length;
  const predN = predicted.length;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${date} KBO ${n}경기 승부예측 — AI 분석`,
    description:
      rate !== null
        ? `${date} KBO ${predN}경기 승부예측. 현재 적중률 ${rate}% (${correct.length}/${verified.length}). 세이버메트릭스 기반 AI 분석.`
        : `${date} KBO ${n}경기 승부예측과 팩터별 분석.`,
    datePublished: `${date}T09:00:00+09:00`,
    dateModified: new Date().toISOString(),
    author: {
      "@type": "Organization",
      name: "MoneyBall AI",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "MoneyBall Score",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    articleSection: "KBO",
    inLanguage: "ko",
  };
}

function buildSportsEventJsonLd(game: DateGame, date: string) {
  const homeTeam = formatTeamName(game.home_team?.code as TeamCode);
  const awayTeam = formatTeamName(game.away_team?.code as TeamCode);
  const gameTime = game.game_time ?? "18:30";
  const startDate = `${date}T${gameTime}+09:00`;
  const isFinal = game.status === "final";

  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${awayTeam} vs ${homeTeam}`,
    description: `KBO 리그 ${date} ${awayTeam} 대 ${homeTeam} 경기`,
    startDate,
    eventStatus: isFinal
      ? "https://schema.org/EventCompleted"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: "Baseball",
    homeTeam: { "@type": "SportsTeam", name: homeTeam },
    awayTeam: { "@type": "SportsTeam", name: awayTeam },
    location: game.stadium
      ? {
          "@type": "Place",
          name: game.stadium,
          address: { "@type": "PostalAddress", addressCountry: "KR" },
        }
      : undefined,
    url: `${SITE_URL}/analysis/game/${game.id}`,
  };
}

export default async function PredictionDatePage({ params }: Props) {
  const { date } = await params;
  const games = await getGamePredictions(date);

  // predictions 배열이 비어 있으면 is_correct 값이 undefined → !== null 로는 걸러지지 않음.
  // pred 존재 + is_correct 값이 명시적으로 true/false 인 경우만 verified.
  const predicted = games.filter((g) => !!g.predictions?.[0]);
  const verified = predicted.filter((g) => g.predictions[0].is_correct != null);
  const correct = verified.filter((g) => g.predictions[0].is_correct === true);

  const intro = buildIntro(date, games, predicted, verified, correct);
  const articleJsonLd = buildArticleJsonLd(date, games, predicted, verified, correct);

  return (
    <article className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: '/predictions', label: '예측 기록' },
          { label: date },
        ]}
      />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{date} 승부예측</h1>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold text-[10px]">
            AI
          </span>
          <span>MoneyBall AI</span>
          <span aria-hidden>·</span>
          <time dateTime={`${date}T09:00:00+09:00`}>
            {date} 09:00 KST
          </time>
          {verified.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="text-gray-700 dark:text-gray-300">
                적중률 {Math.round((correct.length / verified.length) * 100)}% ({correct.length}/
                {verified.length})
              </span>
            </>
          )}
        </div>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 pt-2">{intro}</p>
      </header>

      {games.length > 0 ? (
        <div className="space-y-6">
          {games.map((game) => {
            const pred = game.predictions?.[0];
            if (!pred) return null;
            const homeCode = game.home_team?.code as TeamCode;
            const awayCode = game.away_team?.code as TeamCode;
            const sportsEventJsonLd = buildSportsEventJsonLd(game, date);
            const verdict = getVerdict(pred.reasoning);
            const homeWinProbRaw = getHomeWinProb(pred.reasoning);
            const winProb =
              typeof homeWinProbRaw === "number"
                ? pred.winner?.code === homeCode
                  ? homeWinProbRaw
                  : 1 - homeWinProbRaw
                : undefined;

            return (
              <div key={game.id} className="space-y-3">
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventJsonLd) }}
                />

                <PredictionCard
                  homeTeam={homeCode}
                  awayTeam={awayCode}
                  confidence={pred.confidence}
                  predictedWinner={pred.winner?.code as TeamCode}
                  homeSPName={game.home_sp?.name_ko ?? undefined}
                  awaySPName={game.away_sp?.name_ko ?? undefined}
                  homeSPFip={pred.home_sp_fip ?? undefined}
                  awaySPFip={pred.away_sp_fip ?? undefined}
                  homeWoba={pred.home_lineup_woba ?? undefined}
                  awayWoba={pred.away_lineup_woba ?? undefined}
                  gameTime={game.game_time?.slice(0, 5)}
                  isCorrect={pred.is_correct}
                  homeScore={game.home_score}
                  awayScore={game.away_score}
                  winProb={winProb}
                  gameId={game.id}
                />

                {verdict?.reasoning && (
                  <JudgeReasoningCard
                    homeTeam={homeCode}
                    awayTeam={awayCode}
                    judgeReasoning={verdict.reasoning}
                    homeArgSummary={verdict.homeArgSummary ?? null}
                    awayArgSummary={verdict.awayArgSummary ?? null}
                  />
                )}

                {pred.factors && (
                  <FactorBreakdown
                    factors={pred.factors}
                    homeTeam={homeCode}
                    awayTeam={awayCode}
                    details={{
                      homeSPFip: pred.home_sp_fip ?? undefined,
                      awaySPFip: pred.away_sp_fip ?? undefined,
                      homeSPxFip: pred.home_sp_xfip ?? undefined,
                      awaySPxFip: pred.away_sp_xfip ?? undefined,
                      homeWoba: pred.home_lineup_woba ?? undefined,
                      awayWoba: pred.away_lineup_woba ?? undefined,
                      homeBullpenFip: pred.home_bullpen_fip ?? undefined,
                      awayBullpenFip: pred.away_bullpen_fip ?? undefined,
                      homeWar: pred.home_war_total ?? undefined,
                      awayWar: pred.away_war_total ?? undefined,
                      homeForm: pred.home_recent_form ?? undefined,
                      awayForm: pred.away_recent_form ?? undefined,
                      h2hRate: pred.head_to_head_rate ?? undefined,
                      parkFactor: pred.park_factor ?? undefined,
                      homeElo: pred.home_elo ?? undefined,
                      awayElo: pred.away_elo ?? undefined,
                      homeSfr: pred.home_sfr ?? undefined,
                      awaySfr: pred.away_sfr ?? undefined,
                    }}
                  />
                )}

                <div className="flex items-center justify-end pt-1">
                  <AnalysisLink
                    gameId={game.id}
                    label="팩터별 심층 해설 · 에이전트 토론 전문 보기"
                    variant="primary"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-8 text-center text-gray-400 dark:text-gray-500">
          <p className="text-lg">{date}의 예측 데이터가 없습니다.</p>
        </div>
      )}

      {predicted.length > 0 && (
        <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
          <ShareButtons
            url={`${SITE_URL}/predictions/${date}`}
            title={`${date} KBO 승부예측`}
            text={`${date} ${predicted.length}경기 AI 예측 — 적중률 ${verified.length > 0 ? Math.round((correct.length / verified.length) * 100) : "집계중"}${verified.length > 0 ? "%" : ""}`}
          />
        </footer>
      )}
    </article>
  );
}
