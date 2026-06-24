import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_TEAMS_PRE_RENDER,
  SMALL_SAMPLE_N,
  MLB_LIVE_ISR_SECONDS,
  type MlbTeamCode,
  mlbShortTeamName,
} from "@moneyball/shared";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { buildMlbTeamProfile } from "@/lib/mlb/buildMlbTeamProfile";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { EmptyState } from "@/components/shared/EmptyState";
import { RelatedLinks, type RelatedLink } from "@/components/shared/RelatedLinks";

export const revalidate = 1800;

interface PageProps {
  params: Promise<{ code: string }>;
}

const SITE_URL = "https://moneyballscore.vercel.app";

function isMlbTeamCode(v: string): v is MlbTeamCode {
  return v in MLB_TEAMS;
}

function fmtFip(v: number | null): string {
  return v != null ? v.toFixed(2) : "-";
}
function fmtWoba(v: number | null): string {
  return v != null ? v.toFixed(3) : "-";
}
function fmtPct(v: number | null): string {
  if (v == null) return "-";
  return `${Math.round(v * 100)}%`;
}
function fmtElo(v: number | null): string {
  return v != null ? v.toFixed(0) : "-";
}

export function generateStaticParams() {
  return MLB_TEAMS_PRE_RENDER.map((code) => ({ code }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  if (!isMlbTeamCode(code)) return {};
  const meta = MLB_TEAMS[code];
  const title = `${meta.name} — MLB Team Profile | MoneyBall Score`;
  const description = `${meta.name} (${meta.league} ${meta.division}) season prediction records · Home stadium ${meta.stadium} (park factor ${meta.parkPf}) · ${MLB_FACTOR_COUNTS.total}-factor model (KBO ${MLB_FACTOR_COUNTS.kbo} + Statcast ${MLB_FACTOR_COUNTS.statcast}) aggregates.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/en/mlb/team/${code}`,
      languages: {
        en: `${SITE_URL}/en/mlb/team/${code}`,
        ko: `${SITE_URL}/mlb/team/${code}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/en/mlb/team/${code}`,
      type: "profile",
      locale: "en_US",
      siteName: "MoneyBall Score",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MlbTeamPageEn({ params }: PageProps) {
  const { code } = await params;
  if (!isMlbTeamCode(code)) notFound();

  const profile = await buildMlbTeamProfile(code);
  if (!profile) notFound();

  const teamUrl = `${SITE_URL}/en/mlb/team/${code}`;
  const logoUrl = `${SITE_URL}/logos/mlb/${code}.png`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    "@id": teamUrl,
    url: teamUrl,
    inLanguage: "en-US",
    name: profile.name,
    sport: "Baseball",
    logo: logoUrl,
    description: `MLB ${profile.name} season predictions — avg SP FIP ${fmtFip(profile.factorAverages.spFip)}, accuracy ${fmtPct(profile.accuracyRate)}, home stadium ${profile.stadium} (park factor ${profile.parkPf}).`,
    location: { "@type": "Place", name: profile.stadium },
    memberOf: {
      "@type": "SportsOrganization",
      "@id": "https://www.mlb.com",
      url: "https://www.mlb.com",
      name: "Major League Baseball",
      alternateName: "MLB",
    },
    mainEntityOfPage: teamUrl,
  };

  const parkAdvantage =
    profile.parkPf >= 105 ? "Hitter-friendly" : profile.parkPf <= 95 ? "Pitcher-friendly" : "Neutral";

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: "/en/mlb", label: "MLB Analysis" },
          { href: "/en/mlb/team", label: "Teams" },
          { label: profile.name },
        ]}
        locale="en"
      />

      <header className="space-y-3 border-b border-gray-200 dark:border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-block w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: profile.color }}
            aria-hidden
          />
          <h1 className="text-3xl md:text-4xl font-bold">{profile.name}</h1>
          <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-[var(--color-surface-card)] text-gray-600 dark:text-gray-300 font-mono">
            {profile.league} {profile.division}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {profile.city}
          <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
          Home stadium <span className="font-medium">{profile.stadium}</span>
          <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
          Park factor {profile.parkPf} ({parkAdvantage})
        </p>
      </header>

      <section aria-labelledby="mlb-team-summary-title">
        <h2 id="mlb-team-summary-title" className="sr-only">
          Season Prediction Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Predicted Games</p>
            <p className="text-2xl font-bold mt-1">{profile.predictedGames}</p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Predicted Win Rate</p>
            <p className="text-2xl font-bold mt-1 font-mono">{fmtPct(profile.predictedWinRate)}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {profile.predictedWins}/{profile.predictedGames}
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Accuracy</p>
            <p
              className={`text-2xl font-bold mt-1 font-mono ${
                profile.verifiedN > 0 && profile.verifiedN < SMALL_SAMPLE_N
                  ? "text-gray-400 dark:text-gray-500"
                  : (profile.accuracyRate ?? 0) >= 0.6
                    ? "text-brand-600 dark:text-brand-400"
                    : (profile.accuracyRate ?? 0) >= 0.5
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
              }`}
              title={
                profile.verifiedN > 0 && profile.verifiedN < SMALL_SAMPLE_N
                  ? `Only ${profile.verifiedN} verified games — treat as reference (reliable at ${SMALL_SAMPLE_N}+)`
                  : undefined
              }
            >
              {fmtPct(profile.accuracyRate)}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {profile.verifiedN} verified games
              {profile.verifiedN > 0 && profile.verifiedN < SMALL_SAMPLE_N && (
                <span className="ml-1 text-gray-400 dark:text-gray-500">· small sample</span>
              )}
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg SP FIP</p>
            <p className="text-2xl font-bold mt-1 font-mono">
              {fmtFip(profile.factorAverages.spFip)}
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="mlb-team-factors-title"
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
      >
        <h2 id="mlb-team-factors-title" className="text-lg font-bold mb-3">
          Season Average Factor Values ({MLB_FACTOR_COUNTS.total} factors = KBO {MLB_FACTOR_COUNTS.kbo} + Statcast {MLB_FACTOR_COUNTS.statcast})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">SP FIP</p>
            <p className="font-mono font-semibold mt-1">{fmtFip(profile.factorAverages.spFip)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Lineup wOBA</p>
            <p className="font-mono font-semibold mt-1">
              {fmtWoba(profile.factorAverages.lineupWoba)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Bullpen FIP</p>
            <p className="font-mono font-semibold mt-1">
              {fmtFip(profile.factorAverages.bullpenFip)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Recent Form</p>
            <p className="font-mono font-semibold mt-1">
              {fmtPct(profile.factorAverages.recentForm)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Elo</p>
            <p className="font-mono font-semibold mt-1">{fmtElo(profile.factorAverages.elo)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Lineup xwOBA</p>
            <p className="font-mono font-semibold mt-1">
              {fmtWoba(profile.factorAverages.lineupXwoba)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Barrel%</p>
            <p className="font-mono font-semibold mt-1">
              {fmtPct(profile.factorAverages.lineupBarrelPct)}
            </p>
          </div>
        </div>
      </section>

      {profile.recentGames.length > 0 && (
        <section
          aria-labelledby="mlb-team-recent-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3"
        >
          <h2 id="mlb-team-recent-title" className="text-lg font-bold">
            Recent Prediction History
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[var(--color-border)] text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Opponent</th>
                  <th className="py-2 pr-3 font-medium text-right">Home/Away</th>
                  <th className="py-2 pr-3 font-medium text-right">Pick</th>
                  <th className="py-2 pr-3 font-medium text-right">Score</th>
                  <th className="py-2 font-medium text-right">Result</th>
                </tr>
              </thead>
              <tbody>
                {profile.recentGames.map((r) => {
                  const predictionLabel = r.predictedAsWinner ? "This team" : "Opponent";
                  const resultClass =
                    r.isCorrect == null
                      ? "text-gray-500 dark:text-gray-400"
                      : r.isCorrect
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-red-600 dark:text-red-400";
                  const resultLabel =
                    r.isCorrect == null ? "Pending" : r.isCorrect ? "Correct" : "Wrong";
                  const slugA = r.isHome ? code : (r.opponentCode ?? "?");
                  const slugB = r.isHome ? (r.opponentCode ?? "?") : code;
                  const detailHref = `/en/mlb/games/${r.gameDate}/${slugA}-vs-${slugB}`;
                  return (
                    <tr
                      key={r.gameId}
                      className="border-b border-gray-100 dark:border-[var(--color-border)]"
                    >
                      <td className="py-2 pr-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {r.gameDate}
                      </td>
                      <td className="py-2 pr-3">
                        <Link href={detailHref} className="hover:text-brand-500">
                          {r.opponentName ?? "-"}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-xs text-right text-gray-600 dark:text-gray-300">
                        {r.isHome ? "Home" : "Away"}
                      </td>
                      <td className="py-2 pr-3 text-right text-xs text-gray-700 dark:text-gray-200">
                        {predictionLabel}
                        {r.confidence != null && (
                          <span className="text-gray-400 dark:text-gray-500 ml-1">
                            ({Math.round((0.5 + r.confidence / 2) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {r.ourScore != null && r.opponentScore != null
                          ? `${r.ourScore}-${r.opponentScore}`
                          : "-"}
                      </td>
                      <td className={`py-2 text-right text-xs ${resultClass}`}>{resultLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {profile.predictedGames === 0 && (
        <EmptyState
          size="lg"
          icon="⚾"
          title={`No MLB prediction records yet for ${profile.shortName}`}
          description="Records will appear automatically as MLB 162-game season data accumulates."
        />
      )}

      {(() => {
        const others: RelatedLink[] = (Object.keys(MLB_TEAMS) as MlbTeamCode[])
          .filter((c) => c !== code)
          .slice(0, 9)
          .map((c) => ({
            href: `/en/mlb/team/${c}`,
            label: mlbShortTeamName(c),
            hint: MLB_TEAMS[c].stadium,
          }));
        return <RelatedLinks title="Other MLB Team Profiles" items={others} />;
      })()}
    </article>
  );
}
