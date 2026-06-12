import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_TEAMS_PRE_RENDER,
  type MlbTeamCode,
  mlbShortTeamName,
} from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { RelatedLinks, type RelatedLink } from "@/components/shared/RelatedLinks";

export const revalidate = 21600;

interface PageProps {
  params: Promise<{ id: string }>;
}

const SITE_URL = "https://moneyballscore.vercel.app";

function isMlbTeamCode(v: string): v is MlbTeamCode {
  return v in MLB_TEAMS;
}

type StatcastMetric = {
  key: "xwoba" | "barrelPct" | "hardHitPct" | "launchAngle";
  label: string;
  shortLabel: string;
  unit: string;
  range: string;
  description: string;
  why: string;
};

const STATCAST_METRICS: readonly StatcastMetric[] = [
  {
    key: "xwoba",
    label: "Expected wOBA (xwOBA)",
    shortLabel: "xwOBA",
    unit: "value",
    range: "0.250 ~ 0.420",
    description:
      "Expected wOBA estimated from launch angle + exit velocity. Removes luck (defense / ballpark / weather) to measure true contact quality.",
    why: "Eliminates result noise from wOBA → more meaningful in small samples.",
  },
  {
    key: "barrelPct",
    label: "Barrel %",
    shortLabel: "Barrel%",
    unit: "%",
    range: "0% ~ 25%",
    description:
      "Barrel = minimum launch angle + exit velocity threshold met = avg .500+ AVG / 1.500+ SLG expected. Percentage per plate appearance.",
    why: "Hard contact frequency = raw signal for home run + extra-base production capacity.",
  },
  {
    key: "hardHitPct",
    label: "Hard Hit %",
    shortLabel: "Hard Hit%",
    unit: "%",
    range: "20% ~ 55%",
    description: "Share of batted balls at 95 mph+ exit velocity. Lower threshold than Barrel = larger sample, more stable signal.",
    why: "95+ mph exit velocity sharply increases hit probability. Primary input axis for xwOBA.",
  },
  {
    key: "launchAngle",
    label: "Launch Angle",
    shortLabel: "Launch Angle",
    unit: "°",
    range: "-30° ~ +50°",
    description:
      "Average batted ball launch angle. 10–25° = line drives / 25–35° = fly ball sweet spot.",
    why: "The angle axis of Barrel. Same exit velocity produces different outcomes based on angle.",
  },
];

export function generateStaticParams() {
  return MLB_TEAMS_PRE_RENDER.map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isMlbTeamCode(id)) return {};
  const team = MLB_TEAMS[id];
  const title = `${team.name} Statcast — xwOBA · Barrel% · Hard Hit% · Launch Angle | MoneyBall Score`;
  const description = `${team.name} (${team.league} ${team.division}) Statcast 4 factor deep-dive. xwOBA · Barrel% · Hard Hit% · Launch Angle team measurement progress + individual player layer ETA carry-over.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/en/mlb/players/${id}`,
      languages: {
        en: `${SITE_URL}/en/mlb/players/${id}`,
        ko: `${SITE_URL}/mlb/players/${id}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/en/mlb/players/${id}`,
      type: "profile",
      locale: "en_US",
      siteName: "MoneyBall Score",
    },
  };
}

export default async function MlbPlayersDetailPageEn({ params }: PageProps) {
  const { id } = await params;
  if (!isMlbTeamCode(id)) notFound();

  const team = MLB_TEAMS[id];
  const pageUrl = `${SITE_URL}/en/mlb/players/${id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    "@id": pageUrl,
    url: pageUrl,
    name: team.name,
    sport: "Baseball",
    description: `${team.name} Statcast 4 (xwOBA · Barrel% · Hard Hit% · Launch Angle) measurements + individual player layer ETA.`,
    location: { "@type": "Place", name: team.stadium },
    memberOf: {
      "@type": "SportsOrganization",
      "@id": "https://www.mlb.com",
      url: "https://www.mlb.com",
      name: "Major League Baseball",
      alternateName: "MLB",
    },
    mainEntityOfPage: pageUrl,
  };

  const otherTeams: RelatedLink[] = (Object.keys(MLB_TEAMS) as MlbTeamCode[])
    .filter((c) => c !== id)
    .slice(0, 9)
    .map((c) => ({
      href: `/en/mlb/players/${c}`,
      label: mlbShortTeamName(c),
      hint: MLB_TEAMS[c].stadium,
    }));

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb
        items={[
          { href: "/en/mlb", label: "MLB Analysis" },
          { href: "/en/mlb/players", label: "Statcast Players" },
          { label: team.name },
        ]}
      />

      <header className="space-y-3 border-b border-gray-200 dark:border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-block w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: team.color }}
            aria-hidden
          />
          <h1 className="text-3xl md:text-4xl font-bold">{team.name} Statcast</h1>
          <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-[var(--color-surface-card)] text-gray-600 dark:text-gray-300 font-mono">
            {team.league} {team.division}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {team.city}
          <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
          Home stadium <span className="font-medium">{team.stadium}</span>
          <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
          Park factor {team.parkPf}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          This page = Statcast 4 factor (xwOBA · Barrel% · Hard Hit% · Launch Angle) deep-dive layer. Season stat summary ={" "}
          <Link href={`/en/mlb/team/${id}`} className="underline">
            /en/mlb/team/{id}
          </Link>
          .
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="statcast-team-heading">
        <h2
          id="statcast-team-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Team Statcast 4 Factors (Measurement ETA)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Currently shown = factor definitions + ranges. Team season measurements (Baseball Savant aggregates) integration ETA carry-over. Measurement layer = `mlb-base.ts` factor pipeline + `baseball-savant.ts` scraper.
        </p>
        <ol className="grid md:grid-cols-2 gap-4">
          {STATCAST_METRICS.map((m, idx) => (
            <li
              key={m.key}
              className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 space-y-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-brand-700 dark:text-brand-100">
                  {idx + 1}. {m.label}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {m.range}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xl font-mono font-semibold text-gray-300 dark:text-gray-600">
                  —
                </p>
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-mono">
                  Measurement ETA
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200">{m.description}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Why it matters:</span> {m.why}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3" aria-labelledby="roster-heading">
        <h2
          id="roster-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Individual Player Statcast Deep-Dive (ETA late 2026 season)
        </h2>
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-[var(--color-border)] p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            Individual Statcast layer in progress
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Per-player statsapi.mlb / Baseball Savant roster + Statcast scrape not yet integrated. <br />
            ETA = after MLB full ingestion decision (user domain). Progress ={" "}
            <Link href="/en/mlb/factors" className="underline">
              /en/mlb/factors
            </Link>{" "}
            14-factor model layer reference.
          </p>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="cross-link-heading">
        <h2
          id="cross-link-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Related Layers
        </h2>
        <ul className="grid md:grid-cols-3 gap-3">
          <li>
            <Link
              href={`/en/mlb/team/${id}`}
              className="block rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md hover:border-brand-500/50 transition-all"
            >
              <p className="font-semibold text-brand-700 dark:text-brand-100">Team Profile →</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Season stats + prediction accuracy + 14-factor averages
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/en/mlb/factors"
              className="block rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md hover:border-brand-500/50 transition-all"
            >
              <p className="font-semibold text-brand-700 dark:text-brand-100">14-Factor Model →</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                KBO 10 + Statcast 4 weights + sources
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/en/mlb/players"
              className="block rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md hover:border-brand-500/50 transition-all"
            >
              <p className="font-semibold text-brand-700 dark:text-brand-100">30-Team Hub →</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Statcast 4 factor explainer + 30-team entries
              </p>
            </Link>
          </li>
        </ul>
      </section>

      <RelatedLinks title="Other MLB Team Statcast" items={otherTeams} />

      <footer className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-4 space-y-1">
        <p>
          ※ Statcast data source:{" "}
          <a
            href="https://baseballsavant.mlb.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Baseball Savant
          </a>{" "}
          (MLB Advanced Media). Scraper: <code>packages/kbo-data/src/scrapers/baseball-savant.ts</code>.
        </p>
        <p>
          ※ Live measurement integration = pending MLB full ingestion decision (cycle 1091 deferred — user domain).
        </p>
      </footer>
    </main>
  );
}
