import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_TEAMS_PRE_RENDER,
  SMALL_SAMPLE_N,
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
  const title = `${meta.name} — MLB 팀 프로필 | MoneyBall Score`;
  const description = `${meta.name} (${meta.league} ${meta.division}) 시즌 예측 기록 · 홈구장 ${meta.stadium} (파크팩터 ${meta.parkPf}) · ${MLB_FACTOR_COUNTS.total}팩터 (KBO ${MLB_FACTOR_COUNTS.kbo} + Statcast ${MLB_FACTOR_COUNTS.statcast}) 집계.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/mlb/team/${code}`,
      languages: {
        en: `${SITE_URL}/en/mlb/team/${code}`,
        ko: `${SITE_URL}/mlb/team/${code}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/mlb/team/${code}`,
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

export default async function MlbTeamPage({ params }: PageProps) {
  const { code } = await params;
  if (!isMlbTeamCode(code)) notFound();

  const profile = await buildMlbTeamProfile(code);
  if (!profile) notFound();

  const teamUrl = `${SITE_URL}/mlb/team/${code}`;
  const logoUrl = `${SITE_URL}/logos/mlb/${code}.png`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    "@id": teamUrl,
    url: teamUrl,
    name: profile.name,
    sport: "Baseball",
    logo: logoUrl,
    description: `MLB ${profile.name} 시즌 예측 기록 — 평균 선발 FIP ${fmtFip(profile.factorAverages.spFip)}, 적중률 ${fmtPct(profile.accuracyRate)}, 홈구장 ${profile.stadium} (파크팩터 ${profile.parkPf}).`,
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
    profile.parkPf >= 105 ? "타자 친화" : profile.parkPf <= 95 ? "투수 친화" : "중립";

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: "/mlb", label: "MLB 분석" },
          { href: "/mlb/team", label: "팀" },
          { label: profile.name },
        ]}
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
          홈구장 <span className="font-medium">{profile.stadium}</span>
          <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
          파크팩터 {profile.parkPf} ({parkAdvantage})
        </p>
      </header>

      <section aria-labelledby="mlb-team-summary-title">
        <h2 id="mlb-team-summary-title" className="sr-only">
          시즌 예측 요약
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">예측 경기</p>
            <p className="text-2xl font-bold mt-1">{profile.predictedGames}</p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">승자 예측 비율</p>
            <p className="text-2xl font-bold mt-1 font-mono">{fmtPct(profile.predictedWinRate)}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {profile.predictedWins}/{profile.predictedGames}
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">적중률</p>
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
                  ? `검증된 경기가 ${profile.verifiedN}경기뿐이라 참고용입니다 (${SMALL_SAMPLE_N}경기 이상부터 신뢰 가능)`
                  : undefined
              }
            >
              {fmtPct(profile.accuracyRate)}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              검증 {profile.verifiedN}경기
              {profile.verifiedN > 0 && profile.verifiedN < SMALL_SAMPLE_N && (
                <span className="ml-1 text-gray-400 dark:text-gray-500">· 경기 수 적음</span>
              )}
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">평균 선발 FIP</p>
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
          시즌 평균 팩터값 ({MLB_FACTOR_COUNTS.total}팩터 = KBO {MLB_FACTOR_COUNTS.kbo} + Statcast {MLB_FACTOR_COUNTS.statcast})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">선발 FIP</p>
            <p className="font-mono font-semibold mt-1">{fmtFip(profile.factorAverages.spFip)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">타선 wOBA</p>
            <p className="font-mono font-semibold mt-1">
              {fmtWoba(profile.factorAverages.lineupWoba)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">불펜 FIP</p>
            <p className="font-mono font-semibold mt-1">
              {fmtFip(profile.factorAverages.bullpenFip)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">최근 폼</p>
            <p className="font-mono font-semibold mt-1">
              {fmtPct(profile.factorAverages.recentForm)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Elo</p>
            <p className="font-mono font-semibold mt-1">{fmtElo(profile.factorAverages.elo)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">타선 xwOBA</p>
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
            최근 예측 기록
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[var(--color-border)] text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-3 font-medium">일자</th>
                  <th className="py-2 pr-3 font-medium">상대</th>
                  <th className="py-2 pr-3 font-medium text-right">홈/원정</th>
                  <th className="py-2 pr-3 font-medium text-right">예측</th>
                  <th className="py-2 pr-3 font-medium text-right">점수</th>
                  <th className="py-2 font-medium text-right">결과</th>
                </tr>
              </thead>
              <tbody>
                {profile.recentGames.map((r) => {
                  const predictionLabel = r.predictedAsWinner ? "우리 팀" : "상대 팀";
                  const resultClass =
                    r.isCorrect == null
                      ? "text-gray-500 dark:text-gray-400"
                      : r.isCorrect
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-red-600 dark:text-red-400";
                  const resultLabel =
                    r.isCorrect == null ? "예정" : r.isCorrect ? "적중" : "실패";
                  const slugA = r.isHome ? code : (r.opponentCode ?? "?");
                  const slugB = r.isHome ? (r.opponentCode ?? "?") : code;
                  const detailHref = `/mlb/games/${r.gameDate}/${slugA}-vs-${slugB}`;
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
                        {r.isHome ? "홈" : "원정"}
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
          title={`${profile.shortName}의 MLB 예측 기록이 아직 없습니다`}
          description="MLB 162game 시즌 데이터가 누적되면 자동으로 집계됩니다."
        />
      )}

      {(() => {
        const others: RelatedLink[] = (Object.keys(MLB_TEAMS) as MlbTeamCode[])
          .filter((c) => c !== code)
          .slice(0, 9)
          .map((c) => ({
            href: `/mlb/team/${c}`,
            label: mlbShortTeamName(c),
            hint: MLB_TEAMS[c].stadium,
          }));
        return <RelatedLinks title="다른 MLB 팀 프로필" items={others} />;
      })()}
    </article>
  );
}
