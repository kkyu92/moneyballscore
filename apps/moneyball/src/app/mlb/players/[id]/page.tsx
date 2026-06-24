import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_TEAMS_PRE_RENDER,
  MLB_TEAM_COUNT,
  MLB_ISR_SECONDS,
  type MlbTeamCode,
  mlbShortTeamName,
} from "@moneyball/shared";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
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
      "타구의 발사 각도 + 타구 속도로 추정한 기대 wOBA. 운 (수비 / 구장 / 날씨) 제거 후 진짜 컨택 품질.",
    why: "wOBA 의 결과 잡음 제거 → small sample 안 의미 ↑.",
  },
  {
    key: "barrelPct",
    label: "Barrel %",
    shortLabel: "Barrel%",
    unit: "%",
    range: "0% ~ 25%",
    description:
      "Barrel = 최소 발사 각도 + 타구 속도 임계 만족 = 평균 .500+ AVG / 1.500+ SLG 기대. 타석당 % 비율.",
    why: "강타 빈도 = 홈런 + 장타 production capacity 의 raw signal.",
  },
  {
    key: "hardHitPct",
    label: "Hard Hit %",
    shortLabel: "Hard Hit%",
    unit: "%",
    range: "20% ~ 55%",
    description: "타구 속도 95mph 이상 비율. Barrel 보다 임계 낮음 = 더 큰 sample, stable signal.",
    why: "타구 속도 95+ = 안타 확률 급증. xwOBA 의 핵심 input 1축.",
  },
  {
    key: "launchAngle",
    label: "Launch Angle",
    shortLabel: "Launch Angle",
    unit: "°",
    range: "-30° ~ +50°",
    description:
      "평균 타구 발사 각도. 10~25° = 라인 드라이브 / 25~35° = 플라이볼 sweet spot.",
    why: "barrel 의 angle 축. 같은 타구 속도라도 angle 따라 결과 다름.",
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
  const description = `${team.name} (${team.league} ${team.division}) Statcast ${MLB_FACTOR_COUNTS.statcast} 팩터 deep-dive. xwOBA · Barrel% · Hard Hit% · Launch Angle 팀별 측정 진척 + 선수별 layer ETA carry-over.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/mlb/players/${id}`,
      languages: {
        en: `${SITE_URL}/en/mlb/players/${id}`,
        ko: `${SITE_URL}/mlb/players/${id}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/mlb/players/${id}`,
      type: "profile",
      locale: "ko_KR",
      siteName: "MoneyBall Score",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MlbPlayersDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!isMlbTeamCode(id)) notFound();

  const team = MLB_TEAMS[id];
  const pageUrl = `${SITE_URL}/mlb/players/${id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    "@id": pageUrl,
    url: pageUrl,
    name: team.name,
    sport: "Baseball",
    description: `${team.name} Statcast ${MLB_FACTOR_COUNTS.statcast} (xwOBA · Barrel% · Hard Hit% · Launch Angle) 측정 + 선수별 layer ETA.`,
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
      href: `/mlb/players/${c}`,
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
          { href: "/mlb", label: "MLB 분석" },
          { href: "/mlb/players", label: "Statcast 선수" },
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
          홈구장 <span className="font-medium">{team.stadium}</span>
          <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
          파크팩터 {team.parkPf}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          본 페이지 = Statcast {MLB_FACTOR_COUNTS.statcast} 팩터 (xwOBA · Barrel% · Hard Hit% · Launch Angle) deep-dive layer. 시즌 stat 요약 ={" "}
          <Link href={`/mlb/team/${id}`} className="underline">
            /mlb/team/{id}
          </Link>
          .
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="statcast-team-heading">
        <h2
          id="statcast-team-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          팀 Statcast {MLB_FACTOR_COUNTS.statcast} 팩터 (측정 ETA)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          현재 표시 = 팩터 정의 + range. 팀별 시즌 실측 (Baseball Savant 집계) 연동 ETA carry-over. 측정 layer = `mlb-base.ts` factor pipeline + `baseball-savant.ts` scraper.
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
                  측정 ETA
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200">{m.description}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold">왜 중요한가:</span> {m.why}
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
          선수별 Statcast deep-dive (ETA 2026 시즌 후반)
        </h2>
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-[var(--color-border)] p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            📌 선수별 individual Statcast layer 박제 중
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            현재 statsapi.mlb / Baseball Savant roster + per-player Statcast scrape 미박제. <br />
            ETA = MLB 풀 인제스트 결정 후 (사용자 영역). 진행 상태 ={" "}
            <Link href="/mlb/factors" className="underline">
              /mlb/factors
            </Link>{" "}
            {MLB_FACTOR_COUNTS.total}팩터 본선 layer 참조.
          </p>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="cross-link-heading">
        <h2
          id="cross-link-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          관련 layer
        </h2>
        <ul className="grid md:grid-cols-3 gap-3">
          <li>
            <Link
              href={`/mlb/team/${id}`}
              className="block rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md hover:border-brand-500/50 transition-all"
            >
              <p className="font-semibold text-brand-700 dark:text-brand-100">팀 프로필 →</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                시즌 stat + 예측 적중률 + {MLB_FACTOR_COUNTS.total}팩터 평균
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/mlb/factors"
              className="block rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md hover:border-brand-500/50 transition-all"
            >
              <p className="font-semibold text-brand-700 dark:text-brand-100">{MLB_FACTOR_COUNTS.total}팩터 본선 →</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                KBO {MLB_FACTOR_COUNTS.kbo} + Statcast {MLB_FACTOR_COUNTS.statcast} 가중치 + 출처
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/mlb/players"
              className="block rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md hover:border-brand-500/50 transition-all"
            >
              <p className="font-semibold text-brand-700 dark:text-brand-100">{MLB_TEAM_COUNT}팀 hub →</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Statcast {MLB_FACTOR_COUNTS.statcast} 팩터 explainer + {MLB_TEAM_COUNT}팀 진입
              </p>
            </Link>
          </li>
        </ul>
      </section>

      <RelatedLinks title="다른 MLB 팀 Statcast" items={otherTeams} />

      <footer className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-4 space-y-1">
        <p>
          ※ Statcast 데이터 출처:{" "}
          <a
            href="https://baseballsavant.mlb.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Baseball Savant
          </a>{" "}
          (MLB Advanced Media). 스크래퍼: <code>packages/kbo-data/src/scrapers/baseball-savant.ts</code>.
        </p>
        <p>
          ※ 실측 데이터 연동 시점 = MLB 풀 인제스트 결정 후 (cycle 1091 시점 보류 — 사용자 영역).
        </p>
      </footer>
    </main>
  );
}
