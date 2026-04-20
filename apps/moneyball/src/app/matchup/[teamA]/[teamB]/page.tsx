import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { KBO_TEAMS, type TeamCode, shortTeamName } from '@moneyball/shared';
import {
  canonicalPair,
  pairsForTeam,
} from "@/lib/matchup/canonicalPair";
import { buildMatchupProfile } from "@/lib/matchup/buildMatchupProfile";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TeamLogo } from "@/components/shared/TeamLogo";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ teamA: string; teamB: string }>;
}

const SITE_URL = "https://moneyballscore.vercel.app";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { teamA, teamB } = await params;
  const pair = canonicalPair(teamA, teamB);
  if (!pair) return {};
  const a = shortTeamName(pair.codeA);
  const b = shortTeamName(pair.codeB);
  const title = `${a} vs ${b} — 상대전적 & 예측 성과`;
  const description = `${a}과 ${b}의 올 시즌 맞대결 기록 · AI 예측 적중률 · 경기 리스트. KBO 세이버메트릭스 기반 매치업 분석.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${pair.path}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${pair.path}`,
      type: "article",
      locale: "ko_KR",
      siteName: "MoneyBall Score",
    },
  };
}

export default async function MatchupPage({ params }: PageProps) {
  const { teamA, teamB } = await params;

  // 순서 정규화 — 비-canonical URL이면 canonical로 301 redirect
  const pair = canonicalPair(teamA, teamB);
  if (!pair) notFound();
  if (pair.codeA !== teamA || pair.codeB !== teamB) {
    redirect(pair.path);
  }

  const profile = await buildMatchupProfile(pair);
  const { teamA: tA, teamB: tB, sideStats, predictionAccuracy, games } = profile;

  const otherMatchupsA = pairsForTeam(tA.code).filter(
    (p) => p.path !== pair.path,
  );
  const otherMatchupsB = pairsForTeam(tB.code).filter(
    (p) => p.path !== pair.path,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${tA.shortName} vs ${tB.shortName} 상대전적`,
    description: profile.summary,
    mainEntityOfPage: `${SITE_URL}${pair.path}`,
    publisher: { "@type": "Organization", name: "MoneyBall Score" },
  };

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: '/matchup', label: '팀 간 매치업' },
          { label: `${tA.shortName} vs ${tB.shortName}` },
        ]}
      />

      <header className="space-y-3 border-b border-gray-200 dark:border-[var(--color-border)] pb-5">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 flex-wrap">
          <span style={{ color: tA.color }}>{tA.shortName}</span>
          <span className="text-gray-400 dark:text-gray-500">vs</span>
          <span style={{ color: tB.color }}>{tB.shortName}</span>
        </h1>
      </header>

      <section className="bg-gradient-to-r from-brand-500/5 to-accent/5 dark:from-brand-500/10 dark:to-accent/10 rounded-xl border border-brand-500/20 p-6">
        <p className="text-base leading-relaxed text-gray-800 dark:text-gray-100">
          {profile.summary}
        </p>
      </section>

      {profile.finalGames > 0 && (
        <section aria-labelledby="matchup-side-title" className="space-y-3">
          <h2 id="matchup-side-title" className="text-xl font-bold">
            팀별 성과
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[sideStats.a, sideStats.b].map((s) => (
              <div
                key={s.teamCode}
                className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl p-5 border border-gray-200 dark:border-[var(--color-border)]"
              >
                <div className="flex items-center gap-2">
                  <TeamLogo team={s.teamCode as TeamCode} size={24} />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {s.teamName}
                  </p>
                </div>
                <p className="text-3xl font-bold mt-1">
                  {s.wins}
                  <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">
                    승
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  홈 {s.homeWins}승 · 원정 {s.awayWins}승
                </p>
                {s.predictedToWin > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    AI가 {s.predictedToWin}회 승자로 지목 — 적중{" "}
                    {s.predictedToWinAndCorrect}/{s.predictedToWin}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {predictionAccuracy.verified > 0 && (
        <section
          aria-labelledby="matchup-pred-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
        >
          <h2 id="matchup-pred-title" className="text-lg font-bold mb-3">
            AI 예측 성과 (이 매치업 한정)
          </h2>
          <div className="flex items-baseline gap-3">
            <p
              className={`text-3xl font-bold font-mono ${
                (predictionAccuracy.rate ?? 0) >= 0.6
                  ? "text-green-600"
                  : (predictionAccuracy.rate ?? 0) >= 0.5
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {predictionAccuracy.rate != null
                ? `${Math.round(predictionAccuracy.rate * 100)}%`
                : "-"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {predictionAccuracy.correct} / {predictionAccuracy.verified}경기
            </p>
          </div>
        </section>
      )}

      {games.length > 0 ? (
        <section
          aria-labelledby="matchup-games-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
        >
          <h2 id="matchup-games-title" className="text-lg font-bold mb-3">
            경기 기록
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[var(--color-border)] text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-3 font-medium">일자</th>
                  <th className="py-2 pr-3 font-medium">매치</th>
                  <th className="py-2 pr-3 font-medium text-right">점수</th>
                  <th className="py-2 pr-3 font-medium text-right">예측</th>
                  <th className="py-2 font-medium text-right">결과</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => {
                  const homeName = shortTeamName(g.homeCode);
                  const awayName = shortTeamName(g.awayCode);
                  const predName = g.predictedWinnerCode
                    ? shortTeamName(g.predictedWinnerCode)
                    : null;
                  const resultLabel =
                    g.isCorrect == null
                      ? g.status === "final"
                        ? "-"
                        : "예정"
                      : g.isCorrect
                        ? "적중"
                        : "실패";
                  const resultClass =
                    g.isCorrect == null
                      ? "text-gray-500 dark:text-gray-400"
                      : g.isCorrect
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400";
                  return (
                    <tr
                      key={g.gameId}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-2 pr-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {g.gameDate}
                      </td>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/analysis/game/${g.gameId}`}
                          className="hover:text-brand-500"
                        >
                          {awayName} @ {homeName}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {g.homeScore != null && g.awayScore != null
                          ? `${g.awayScore}-${g.homeScore}`
                          : "-"}
                      </td>
                      <td className="py-2 pr-3 text-right text-xs text-gray-700 dark:text-gray-200">
                        {predName ?? "-"}
                        {g.confidence != null && (
                          <span className="text-gray-400 dark:text-gray-500 ml-1">
                            ({Math.round((0.5 + g.confidence / 2) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2 text-right text-xs ${resultClass}`}
                      >
                        {resultLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <span className="text-5xl block mb-4">⚾</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            올 시즌 맞대결 기록이 아직 없습니다
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            두 팀이 맞붙는 경기가 진행되면 여기에 축적됩니다.
          </p>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 dark:border-[var(--color-border)] pt-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            {tA.shortName}의 다른 매치업
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherMatchupsA.map((p) => (
              <Link
                key={p.path}
                href={p.path}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                vs{" "}
                {
                  shortTeamName((p.codeA === tA.code
                      ? p.codeB
                      : p.codeA) as TeamCode)
                }
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            {tB.shortName}의 다른 매치업
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherMatchupsB.map((p) => (
              <Link
                key={p.path}
                href={p.path}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                vs{" "}
                {
                  shortTeamName((p.codeA === tB.code
                      ? p.codeB
                      : p.codeA) as TeamCode)
                }
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <ShareButtons
          url={`${SITE_URL}${pair.path}`}
          title={`${tA.shortName} vs ${tB.shortName} 상대전적 & 예측 성과`}
          text={profile.summary}
        />
      </footer>
    </article>
  );
}
