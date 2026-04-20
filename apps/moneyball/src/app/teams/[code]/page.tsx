import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { KBO_TEAMS, type TeamCode, shortTeamName } from '@moneyball/shared';
import { buildTeamProfile } from "@/lib/teams/buildTeamProfile";
import { pairsForTeam } from "@/lib/matchup/canonicalPair";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TeamLogo } from "@/components/shared/TeamLogo";

export const revalidate = 1800;

interface PageProps {
  params: Promise<{ code: string }>;
}

const SITE_URL = "https://moneyballscore.vercel.app";

function isTeamCode(v: string): v is TeamCode {
  return v in KBO_TEAMS;
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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  if (!isTeamCode(code)) return {};
  const profile = await buildTeamProfile(code);
  if (!profile) return {};
  const title = `${profile.name} — 팀 프로필`;
  const description = `${profile.name} 시즌 예측 기록 · 평균 선발 FIP ${fmtFip(profile.factorAverages.spFip)} · 적중률 ${fmtPct(profile.accuracyRate)} · 홈구장 ${profile.stadium} (파크팩터 ${profile.parkPf}).`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/teams/${code}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/teams/${code}`,
      type: "profile",
      locale: "ko_KR",
      siteName: "MoneyBall Score",
    },
  };
}

export default async function TeamPage({ params }: PageProps) {
  const { code } = await params;
  if (!isTeamCode(code)) notFound();

  const profile = await buildTeamProfile(code);
  if (!profile) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: profile.name,
    sport: "Baseball",
    location: {
      "@type": "Place",
      name: profile.stadium,
    },
    memberOf: {
      "@type": "SportsOrganization",
      name: "KBO 리그",
    },
    mainEntityOfPage: `${SITE_URL}/teams/${code}`,
  };

  const parkAdvantage =
    profile.parkPf >= 105
      ? "타자 친화"
      : profile.parkPf <= 95
        ? "투수 친화"
        : "중립";

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: '/teams', label: '팀 프로필' },
          { label: profile.name },
        ]}
      />

      <header className="space-y-3 border-b border-gray-200 dark:border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <TeamLogo team={profile.code} size={40} className="shrink-0" />
          <h1 className="text-3xl md:text-4xl font-bold">{profile.name}</h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          홈구장 <span className="font-medium">{profile.stadium}</span>
          <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
          파크팩터 {profile.parkPf} ({parkAdvantage})
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
            {profile.parkNote}
          </span>
        </p>
      </header>

      <section aria-labelledby="team-summary-title">
        <h2 id="team-summary-title" className="sr-only">
          시즌 예측 요약
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">예측 경기</p>
            <p className="text-2xl font-bold mt-1">{profile.predictedGames}</p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              승자 예측 비율
            </p>
            <p className="text-2xl font-bold mt-1 font-mono">
              {fmtPct(profile.predictedWinRate)}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {profile.predictedWins}/{profile.predictedGames}
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">적중률</p>
            <p
              className={`text-2xl font-bold mt-1 font-mono ${
                profile.verifiedN > 0 && profile.verifiedN < 5
                  ? "text-gray-400 dark:text-gray-500"
                  : (profile.accuracyRate ?? 0) >= 0.6
                    ? "text-green-600"
                    : (profile.accuracyRate ?? 0) >= 0.5
                      ? "text-yellow-600"
                      : "text-red-600"
              }`}
              title={
                profile.verifiedN > 0 && profile.verifiedN < 5
                  ? `표본 작음 (N=${profile.verifiedN} < 5) — 해석 주의`
                  : undefined
              }
            >
              {fmtPct(profile.accuracyRate)}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              검증 {profile.verifiedN}경기
              {profile.verifiedN > 0 && profile.verifiedN < 5 && (
                <span className="ml-1 text-gray-400 dark:text-gray-500">
                  · 표본 작음
                </span>
              )}
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              평균 선발 FIP
            </p>
            <p className="text-2xl font-bold mt-1 font-mono">
              {fmtFip(profile.factorAverages.spFip)}
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="team-factors-title"
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
      >
        <h2 id="team-factors-title" className="text-lg font-bold mb-3">
          시즌 평균 팩터값
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              선발 FIP
            </p>
            <p className="font-mono font-semibold mt-1">
              {fmtFip(profile.factorAverages.spFip)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              타선 wOBA
            </p>
            <p className="font-mono font-semibold mt-1">
              {fmtWoba(profile.factorAverages.lineupWoba)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              불펜 FIP
            </p>
            <p className="font-mono font-semibold mt-1">
              {fmtFip(profile.factorAverages.bullpenFip)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              최근 폼
            </p>
            <p className="font-mono font-semibold mt-1">
              {fmtPct(profile.factorAverages.recentForm)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Elo
            </p>
            <p className="font-mono font-semibold mt-1">
              {fmtElo(profile.factorAverages.elo)}
            </p>
          </div>
        </div>
      </section>

      {profile.topPitchers.length > 0 && (
        <section
          aria-labelledby="team-pitchers-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
        >
          <h2 id="team-pitchers-title" className="text-lg font-bold mb-3">
            주요 선발 투수
          </h2>
          <div className="space-y-2">
            {profile.topPitchers.map((p, idx) => (
              <Link
                key={p.playerId}
                href={`/players/${p.playerId}`}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 dark:text-gray-500 font-mono text-sm">
                    {idx + 1}
                  </span>
                  <span className="font-semibold">{p.nameKo}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {p.appearances}등판
                  </span>
                </div>
                <span className="font-mono text-sm font-semibold">
                  FIP {fmtFip(p.avgFip)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="team-matchups-title" className="space-y-3">
        <h2 id="team-matchups-title" className="text-lg font-bold">
          주요 매치업
        </h2>
        <div className="flex flex-wrap gap-2">
          {pairsForTeam(profile.code).map((p) => {
            const other =
              p.codeA === profile.code ? p.codeB : p.codeA;
            const otherName = shortTeamName(other);
            return (
              <Link
                key={p.path}
                href={p.path}
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                <TeamLogo team={other as TeamCode} size={20} />
                vs {otherName}
              </Link>
            );
          })}
        </div>
      </section>

      {profile.recentGames.length > 0 && (
        <section
          aria-labelledby="team-recent-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
        >
          <h2 id="team-recent-title" className="text-lg font-bold mb-3">
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
                  const predictionLabel = r.predictedAsWinner
                    ? "우리 팀"
                    : "상대 팀";
                  const resultClass =
                    r.isCorrect == null
                      ? "text-gray-500 dark:text-gray-400"
                      : r.isCorrect
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400";
                  const resultLabel =
                    r.isCorrect == null
                      ? "예정"
                      : r.isCorrect
                        ? "적중"
                        : "실패";
                  return (
                    <tr
                      key={r.gameId}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-2 pr-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {r.gameDate}
                      </td>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/analysis/game/${r.gameId}`}
                          className="hover:text-brand-500"
                        >
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
                      <td className={`py-2 text-right text-xs ${resultClass}`}>
                        {resultLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {profile.predictedGames === 0 && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <span className="text-5xl block mb-4">⚾</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            {profile.shortName}의 예측 기록이 아직 없습니다
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            시즌 경기가 진행되면 자동으로 집계됩니다.
          </p>
        </section>
      )}
    </article>
  );
}
