import type { Metadata } from "next";
import Link from "next/link";
import { KBO_TEAMS, shortTeamName } from '@moneyball/shared';
import { buildMissReport } from "@/lib/reviews/buildMissReport";
import { ShareButtons } from "@/components/share/ShareButtons";

export const metadata: Metadata = {
  title: "회고: 크게 빗나간 예측",
  description:
    "MoneyBall Score가 고확신으로 틀렸던 예측들의 사후 분석. 어떤 팩터가 과대 평가됐는지, 사후 에이전트가 무엇을 지적했는지 공개.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://moneyballscore.vercel.app/reviews/misses" },
};

export const revalidate = 1800;

const SITE_URL = "https://moneyballscore.vercel.app";

const FACTOR_LABELS: Record<string, string> = {
  sp_fip: "선발 FIP",
  sp_xfip: "선발 xFIP",
  lineup_woba: "타선 wOBA",
  bullpen_fip: "불펜 FIP",
  recent_form: "최근 10경기 폼",
  war: "WAR 누적",
  head_to_head: "상대전적",
  park_factor: "구장 보정",
  elo: "Elo 레이팅",
  sfr: "수비 SFR",
  home_sp_fip: "홈 선발 FIP",
  away_sp_fip: "원정 선발 FIP",
  home_bullpen_fip: "홈 불펜 FIP",
  away_bullpen_fip: "원정 불펜 FIP",
  home_lineup_woba: "홈 타선 wOBA",
  away_lineup_woba: "원정 타선 wOBA",
};

function factorLabel(key: string): string {
  return FACTOR_LABELS[key] ?? key;
}

function fmtSignedBias(v: number): string {
  const pp = Math.round(v * 100);
  if (pp === 0) return "0%p";
  return pp > 0 ? `+${pp}%p` : `${pp}%p`;
}

export default async function MissesReviewPage() {
  const items = await buildMissReport({ limit: 10 });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "회고: 크게 빗나간 예측 Top 10",
    description:
      "MoneyBall Score가 고확신으로 틀렸던 예측들의 사후 분석 모음",
    datePublished: new Date().toISOString(),
    publisher: { "@type": "Organization", name: "MoneyBall Score" },
    mainEntityOfPage: `${SITE_URL}/reviews/misses`,
  };

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="space-y-3 border-b border-gray-200 dark:border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/reviews" className="hover:text-brand-500">
            리뷰
          </Link>
          <span aria-hidden>/</span>
          <span>회고</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          회고: 크게 빗나간 예측
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          예측 시스템의 신뢰는 틀렸을 때 어떻게 설명하느냐에서 결정됩니다. 이
          페이지는 MoneyBall Score가 55% 이상 확신으로 틀렸던 예측을 숨기지 않고
          사후 분석과 함께 공개합니다. 사후 에이전트가 지목한 편향 팩터와 양팀
          관점에서 &ldquo;pre_game이 놓친 것&rdquo;도 함께 기록됩니다.
        </p>
      </header>

      {items.length === 0 ? (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <span className="text-5xl block mb-4">🧭</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            고확신으로 빗나간 예측이 아직 없습니다
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            시즌이 진행되면 자연스럽게 쌓입니다.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          {items.map((item) => {
            const predName = item.predictedWinnerCode
              ? shortTeamName(item.predictedWinnerCode)
              : null;
            const actualName = item.actualWinnerCode
              ? shortTeamName(item.actualWinnerCode)
              : null;
            const confPct = Math.round(item.winnerProb * 100);

            return (
              <Link
                href={`/analysis/game/${item.gameId}`}
                key={item.gameId}
                className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:border-brand-500/50 hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {item.gameDate}
                    </p>
                    <p className="text-lg font-bold mt-1">
                      {item.awayName}
                      <span className="font-mono mx-2 text-gray-500 dark:text-gray-400">
                        {item.awayScore ?? "-"} : {item.homeScore ?? "-"}
                      </span>
                      {item.homeName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      예측 <strong>{predName ?? ""}</strong> ({confPct}%) →
                      실제 <strong>{actualName ?? ""}</strong> 승리
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 shrink-0">
                    고확신 실패
                  </span>
                </div>

                {item.judgePostview && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      사후 심판 분석
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                      {item.judgePostview}
                    </p>
                  </div>
                )}

                {item.factorErrors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      편향 지목 팩터
                    </p>
                    <ul className="space-y-1">
                      {item.factorErrors.map((fe, idx) => (
                        <li
                          key={`${item.gameId}-${fe.factor}-${idx}`}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 shrink-0">
                            {fmtSignedBias(fe.predictedBias)}
                          </span>
                          <span className="text-gray-700 dark:text-gray-200">
                            <strong>{factorLabel(fe.factor)}</strong>
                            {fe.diagnosis && (
                              <>
                                <span className="text-gray-400 dark:text-gray-500 mx-1">
                                  ·
                                </span>
                                <span className="text-gray-600 dark:text-gray-300">
                                  {fe.diagnosis}
                                </span>
                              </>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(item.missedBy.home || item.missedBy.away) && (
                  <div className="grid sm:grid-cols-2 gap-3 pt-1">
                    {item.missedBy.away && (
                      <div className="text-xs">
                        <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          {item.awayName} 관점 · 놓친 것
                        </p>
                        <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                          {item.missedBy.away}
                        </p>
                      </div>
                    )}
                    {item.missedBy.home && (
                      <div className="text-xs">
                        <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          {item.homeName} 관점 · 놓친 것
                        </p>
                        <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                          {item.missedBy.home}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-brand-500 pt-1">
                  → 경기 전체 분석 보기
                </p>
              </Link>
            );
          })}
        </div>
      )}

      <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <ShareButtons
          url={`${SITE_URL}/reviews/misses`}
          title="회고: 크게 빗나간 예측 Top 10"
          text="MoneyBall Score가 고확신으로 틀렸던 예측들의 사후 분석"
        />
      </footer>
    </article>
  );
}
