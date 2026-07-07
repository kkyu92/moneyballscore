import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { assertSelectOk, KBO_FACTOR_COUNT, shortTeamName, type TeamCode, CURRENT_SCORING_RULE, INSIGHTS_ISR_HOURS, INSIGHTS_LIMIT, SITE_URL } from "@moneyball/shared";
import { presentJudgeReasoningWithFallback } from "@/lib/predictions/judgeReasoning";
import { selectTopFactors } from "@/lib/insights/topFactors";
import { insightsStatusBadge } from "@/lib/insights/statusBadge";

const PAGE_URL = `${SITE_URL}/insights`;
const LIMIT = INSIGHTS_LIMIT;
const PREVIEW_LENGTH = 280;

export const metadata: Metadata = {
  title: "AI 인사이트",
  description:
    "KBO 경기 AI 심판 에이전트 reasoning 시계열 아카이브. 매 경기 정량 모델 + 양팀 에이전트 토론 결과를 심판이 종합한 300-500자 분석을 시간 역순으로 모아보세요.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "AI 인사이트 | MoneyBall Score",
    description: "KBO 경기 AI 심판 에이전트 reasoning 시계열 아카이브.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 인사이트 | MoneyBall Score",
    description: "KBO 경기 AI 심판 에이전트 reasoning 시계열 아카이브.",
  },
};

export const revalidate = 86400; // INSIGHTS_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface Verdict {
  reasoning?: string;
  homeWinProb?: number;
  predictedWinner?: string;
}

interface ReasoningShape {
  debate?: { verdict?: Verdict };
}

interface InsightRow {
  gameId: number;
  date: string;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  status: string;
  isCorrect: boolean | null;
  reasoningText: string;
  isFallback: boolean;
  homeWinProb: number | null;
  factors: Record<string, number> | null;
}

interface GameRow {
  id: number;
  game_date: string;
  home_team: { code: string } | { code: string }[] | null;
  away_team: { code: string } | { code: string }[] | null;
  status: string;
}

function extractTeamCode(field: GameRow["home_team"]): string | null {
  if (!field) return null;
  const obj = Array.isArray(field) ? field[0] : field;
  return obj?.code ?? null;
}

async function getRecentInsights(): Promise<InsightRow[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("predictions")
    .select(
      "confidence, is_correct, reasoning, factors, prediction_type, created_at, games!inner(id, game_date, status, home_team:teams!games_home_team_id_fkey(code), away_team:teams!games_away_team_id_fkey(code))",
    )
    .eq("prediction_type", "pre_game")
    .eq("scoring_rule", CURRENT_SCORING_RULE)
    .order("created_at", { ascending: false })
    .limit(LIMIT * 4);
  const { data } = assertSelectOk(result, "insights.getRecentInsights");
  if (!data) return [];

  const out: InsightRow[] = [];
  for (const row of data) {
    const r = row.reasoning as ReasoningShape | null;
    const verdict = r?.debate?.verdict;
    const raw = verdict?.reasoning;
    const presented = presentJudgeReasoningWithFallback(raw, { maxLength: PREVIEW_LENGTH });
    if (!presented) continue;
    const gamesField = row.games as unknown as GameRow | GameRow[] | null;
    const game = Array.isArray(gamesField) ? gamesField[0] : gamesField;
    if (!game) continue;
    const homeCode = extractTeamCode(game.home_team);
    const awayCode = extractTeamCode(game.away_team);
    if (!homeCode || !awayCode) continue;
    const rawFactors = row.factors as Record<string, number> | null;
    const factors =
      rawFactors && typeof rawFactors === "object" && Object.keys(rawFactors).length > 0
        ? rawFactors
        : null;
    out.push({
      gameId: game.id,
      date: game.game_date,
      homeTeam: homeCode as TeamCode,
      awayTeam: awayCode as TeamCode,
      status: game.status,
      isCorrect: row.is_correct,
      reasoningText: presented.text,
      isFallback: presented.isFallback,
      homeWinProb: verdict?.homeWinProb ?? null,
      factors,
    });
    if (out.length >= LIMIT) break;
  }
  return out;
}


export default async function InsightsHubPage() {
  const insights = await getRecentInsights();
  const latestDate = insights[0]?.date ?? null;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": PAGE_URL,
    headline: "MoneyBall Score AI 인사이트",
    description:
      "KBO 경기 AI 심판 에이전트 reasoning 시계열 아카이브. 정량 모델 + 양팀 에이전트 토론 + 심판 종합.",
    url: PAGE_URL,
    inLanguage: "ko-KR",
    datePublished: "2026-05-21",
    dateModified: latestDate ?? "2026-05-21",
    author: {
      "@type": "Organization",
      name: "MoneyBall Score",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "MoneyBall Score",
      url: SITE_URL,
    },
    mainEntityOfPage: PAGE_URL,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Breadcrumb items={[{ label: "AI 인사이트" }]} />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100">AI 인사이트</h1>
        <p className="text-gray-700 dark:text-brand-300 leading-relaxed">
          KBO 경기 AI 심판 에이전트가 매 경기 남긴 300-500자 reasoning 을 시간 역순으로 모아봤습니다.
          정량 세이버메트릭스 모델 ({KBO_FACTOR_COUNT}팩터) 위에 홈/원정 에이전트 토론 → 심판 종합의 결과입니다.
        </p>
        <p className="text-sm text-gray-500 dark:text-brand-300/70">
          최근 {insights.length}건. 일자 카드를 누르면 해당 일자 전체 예측으로 이동합니다.
        </p>
      </header>

      <nav aria-label="관련 자료" className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/methodology"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          예측 방법론 →
        </Link>
        <Link
          href="/accuracy"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          적중률 대시보드 →
        </Link>
        <Link
          href="/changelog"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          변경 로그 →
        </Link>
      </nav>

      {insights.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          아직 누적된 AI 인사이트가 없습니다. 다음 경기 예측이 발행되면 자동으로 표시됩니다.
        </div>
      ) : (
        <ol className="space-y-4">
          {insights.map((item) => {
            const badge = insightsStatusBadge(item.status, item.isCorrect);
            const homeName = shortTeamName(item.homeTeam);
            const awayName = shortTeamName(item.awayTeam);
            const topFactors = selectTopFactors(item.factors);
            return (
              <li
                key={`${item.gameId}-${item.date}`}
                className="rounded-xl border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    href={`/predictions/${item.date}`}
                    className="font-semibold text-brand-700 dark:text-brand-300 hover:underline"
                  >
                    {item.date}
                  </Link>
                  <span className="text-gray-700 dark:text-gray-200">
                    {awayName} vs {homeName}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                  {item.homeWinProb !== null && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      홈 승리확률 {Math.round(item.homeWinProb * 100)}%
                    </span>
                  )}
                  {item.isFallback && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-50 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                      정량 모델 단독
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {item.reasoningText}
                </p>
                {topFactors.length > 0 && (
                  <div
                    data-mini-factor-preview
                    className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5"
                  >
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      상위 팩터 {topFactors.length}
                    </p>
                    <ul className="space-y-1 text-xs">
                      {topFactors.map((f) => {
                        const favorLabel =
                          f.favorable === "home"
                            ? `${homeName} 우위`
                            : f.favorable === "away"
                              ? `${awayName} 우위`
                              : "비슷";
                        const favorColor =
                          f.favorable === "home"
                            ? "text-brand-600 dark:text-brand-300"
                            : f.favorable === "away"
                              ? "text-[var(--color-away)]"
                              : "text-gray-500 dark:text-gray-400";
                        return (
                          <li key={f.key} className="flex items-center gap-2">
                            <span className="w-20 shrink-0 text-gray-700 dark:text-gray-300">
                              {f.label}
                            </span>
                            <span className={`font-medium ${favorColor}`}>
                              {favorLabel}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">
                              ({f.pct}%)
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div className="text-xs flex flex-wrap gap-x-4 gap-y-1">
                  <Link
                    href={`/predictions/${item.date}`}
                    className="text-brand-600 dark:text-brand-300 hover:underline"
                  >
                    해당 일자 전체 예측 보기 →
                  </Link>
                  {topFactors.length > 0 && (
                    <Link
                      href={`/insights/${item.date}#factor-breakdown-${item.gameId}`}
                      className="text-brand-600 dark:text-brand-300 hover:underline"
                    >
                      전체 팩터 보기 →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="pt-6 border-t border-gray-200 dark:border-[var(--color-border)] text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <p>
          AI 인사이트는 매일 자동 갱신됩니다 ({INSIGHTS_ISR_HOURS}시간 ISR). 정량 모델 단독 표시는 에이전트 토론이 일시 중단되어
          정량 모델 결과만 노출된 경우입니다.
        </p>
      </footer>
    </div>
  );
}
