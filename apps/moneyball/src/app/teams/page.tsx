import type { Metadata } from "next";
import Link from "next/link";
import { KBO_TEAMS, KBO_TEAM_COUNT, SMALL_SAMPLE_N, PARK_FACTOR_HITTER_MIN, PARK_FACTOR_PITCHER_MAX, type TeamCode, SITE_URL } from "@moneyball/shared";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { buildAllTeamAccuracy, type TeamAccuracyRow } from "@/lib/standings/buildTeamAccuracy";
import { captureFallback } from "@/lib/observability/captureFallback";

export const revalidate = 1800; // TEAMS_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export const metadata: Metadata = {
  title: "팀 프로필",
  description:
    `KBO ${KBO_TEAM_COUNT}팀의 시즌 예측 기록·적중률·주요 투수·구장 특성을 모은 팀 프로필 허브.`,
  alternates: { canonical: `${SITE_URL}/teams` },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: `${SITE_URL}/teams`,
    siteName: "MoneyBall Score",
    title: "팀 프로필 | MoneyBall Score",
    description:
      `KBO ${KBO_TEAM_COUNT}팀의 시즌 예측 기록·적중률·주요 투수·구장 특성을 모은 팀 프로필 허브.`,
  },
  twitter: {
    card: "summary_large_image",
    title: "팀 프로필 | MoneyBall Score",
    description:
      `KBO ${KBO_TEAM_COUNT}팀의 예측 기록·적중률·주요 투수·구장 특성 허브.`,
  },
};

const TEAM_ORDER: TeamCode[] = [
  "HT",
  "SS",
  "LG",
  "OB",
  "KT",
  "SK",
  "LT",
  "HH",
  "NC",
  "WO",
];

export default async function TeamsIndexPage() {
  // 서버 장애(DB 연결 실패 등)로 인한 fallback 과 "실제 데이터 없음" 을 구분하기 위해
  // {status, value|reason} 모양으로 순수 파생값(dbDegraded) 추적 (컴포넌트 내 재할당 금지 lint 룰 준수).
  const rowsR = await buildAllTeamAccuracy().then(
    (value) => ({ status: "fulfilled" as const, value }),
    (reason) => ({ status: "rejected" as const, reason }),
  );
  const teamAccuracyResult = rowsR.status === "fulfilled"
    ? rowsR.value
    : captureFallback(rowsR.reason, { rows: [] as TeamAccuracyRow[], degraded: true }, { route: "/teams", source: "teams-hub-accuracy" });
  const rows: TeamAccuracyRow[] = teamAccuracyResult.rows;
  const dbDegraded = rowsR.status === "rejected" || teamAccuracyResult.degraded;

  const accMap = new Map<TeamCode, TeamAccuracyRow>();
  for (const row of rows) accMap.set(row.teamCode, row);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "KBO 팀 프로필",
    description:
      `KBO ${KBO_TEAM_COUNT}팀의 시즌 예측 기록·적중률·주요 투수·구장 특성을 모은 팀 프로필 허브.`,
    url: `${SITE_URL}/teams`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: TEAM_ORDER.length,
      itemListElement: TEAM_ORDER.map((code, i) => {
        const team = KBO_TEAMS[code];
        return {
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/teams/${code}`,
          item: {
            "@type": "SportsTeam",
            name: team.name,
            sport: "Baseball",
            location: { "@type": "Place", name: team.stadium },
            memberOf: { "@type": "SportsOrganization", name: "KBO 리그" },
          },
        };
      }),
    },
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb items={[{ label: '팀 프로필' }]} />
      {dbDegraded && (
        <div
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          일시적인 서비스 장애로 일부 정보가 표시되지 않을 수 있습니다. 잠시 후 다시 시도해주세요.
        </div>
      )}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">팀 프로필</h1>
        <p className="text-gray-500 dark:text-gray-400">
          KBO {KBO_TEAM_COUNT}팀의 시즌 예측 기록, 팩터 평균값, 주요 투수, 홈구장 특성.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEAM_ORDER.map((code) => {
          const team = KBO_TEAMS[code];
          const parkAdvantage =
            team.parkPf >= PARK_FACTOR_HITTER_MIN
              ? "타자 친화"
              : team.parkPf <= PARK_FACTOR_PITCHER_MAX
                ? "투수 친화"
                : "중립";
          const acc = accMap.get(code);
          const hasData = acc && acc.verifiedN > 0;
          const isReliable = hasData && acc.verifiedN >= SMALL_SAMPLE_N;
          const accPct = acc?.accuracyRate != null ? Math.round(acc.accuracyRate * 100) : null;

          return (
            <Link
              key={code}
              href={`/teams/${code}`}
              className="group bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:shadow-md hover:border-brand-500/50 transition-all space-y-2"
            >
              <div className="flex items-center gap-3">
                <TeamLogo team={code} size={32} className="shrink-0" />
                <h2 className="text-lg font-bold group-hover:text-brand-500 transition-colors">
                  {team.name}
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {team.stadium}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                파크팩터 {team.parkPf} · {parkAdvantage}
              </p>
              {hasData && accPct !== null && (
                <p className={`text-xs font-medium ${isReliable ? 'text-brand-500 dark:text-brand-300' : 'text-gray-400 dark:text-gray-500'}`}>
                  AI 적중률 {accPct}%
                  <span className="font-normal ml-1">(n={acc.verifiedN})</span>
                  {!isReliable && <span className="ml-1">참고용</span>}
                </p>
              )}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
