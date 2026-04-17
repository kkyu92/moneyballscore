import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buildPitcherProfile } from "@/lib/players/buildPitcherProfile";

export const revalidate = 1800;

interface PageProps {
  params: Promise<{ id: string }>;
}

const SITE_URL = "https://moneyballscore.vercel.app";

function fmtFip(v: number | null): string {
  return v != null ? v.toFixed(2) : "-";
}

function fmtPct(v: number | null): string {
  if (v == null) return "-";
  return `${Math.round(v * 100)}%`;
}

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const playerId = parseId(id);
  if (playerId == null) return {};

  const profile = await buildPitcherProfile(playerId);
  if (!profile) return {};

  const title = `${profile.nameKo} — 선수 프로필`;
  const description = `${profile.teamName ?? "KBO"} 선발 투수 ${profile.nameKo}. 평균 FIP ${fmtFip(profile.avgFip)} · 등판 ${profile.appearances}경기 · 예측 적중률 ${fmtPct(profile.accuracyRate)}.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/players/${playerId}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/players/${playerId}`,
      type: "profile",
      locale: "ko_KR",
      siteName: "MoneyBall Score",
    },
  };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const playerId = parseId(id);
  if (playerId == null) notFound();

  const profile = await buildPitcherProfile(playerId);
  if (!profile) notFound();

  const appearancesText =
    profile.appearances > 0
      ? `현재 시즌 ${profile.appearances}경기 선발 등판`
      : "아직 선발 등판 데이터가 없습니다";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.nameKo,
    alternateName: profile.nameEn ?? undefined,
    nationality: "KR",
    memberOf: profile.teamName
      ? {
          "@type": "SportsTeam",
          name: profile.teamName,
          sport: "Baseball",
        }
      : undefined,
    mainEntityOfPage: `${SITE_URL}/players/${playerId}`,
  };

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="space-y-2 border-b border-gray-200 dark:border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/players" className="hover:text-brand-500">
            선수 리더보드
          </Link>
          <span aria-hidden>/</span>
          <span>{profile.teamName ?? "KBO"}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-bold">{profile.nameKo}</h1>
          {profile.teamName && profile.teamColor && (
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: profile.teamColor }}
            >
              {profile.teamName}
            </span>
          )}
          {profile.throws && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              {profile.throws === "R" ? "우완" : profile.throws === "L" ? "좌완" : profile.throws}
            </span>
          )}
          {profile.position && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              {profile.position}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {appearancesText}
        </p>
      </header>

      <section aria-labelledby="pitcher-summary-title">
        <h2 id="pitcher-summary-title" className="sr-only">
          시즌 누적 요약
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">등판 수</p>
            <p className="text-2xl font-bold mt-1">{profile.appearances}</p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">평균 FIP</p>
            <p className="text-2xl font-bold mt-1 font-mono">
              {fmtFip(profile.avgFip)}
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">평균 xFIP</p>
            <p className="text-2xl font-bold mt-1 font-mono text-gray-700 dark:text-gray-200">
              {fmtFip(profile.avgXFip)}
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              예측 적중률
            </p>
            <p className="text-2xl font-bold mt-1 font-mono">
              {profile.verifiedN > 0
                ? fmtPct(profile.accuracyRate)
                : "-"}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              검증 {profile.verifiedN}경기
            </p>
          </div>
        </div>
      </section>

      {profile.recent.length > 0 && (
        <section
          aria-labelledby="pitcher-recent-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
        >
          <h2 id="pitcher-recent-title" className="text-lg font-bold mb-4">
            최근 등판 기록
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[var(--color-border)] text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-3 font-medium">일자</th>
                  <th className="py-2 pr-3 font-medium">상대</th>
                  <th className="py-2 pr-3 font-medium">구분</th>
                  <th className="py-2 pr-3 font-medium text-right">FIP</th>
                  <th className="py-2 pr-3 font-medium text-right">xFIP</th>
                  <th className="py-2 pr-3 font-medium text-right">점수</th>
                  <th className="py-2 font-medium text-right">결과</th>
                </tr>
              </thead>
              <tbody>
                {profile.recent.map((a) => {
                  const resultLabel =
                    a.isCorrect == null
                      ? "예정"
                      : a.isCorrect
                        ? "예측 적중"
                        : "예측 실패";
                  const resultClass =
                    a.isCorrect == null
                      ? "text-gray-500 dark:text-gray-400"
                      : a.isCorrect
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400";
                  return (
                    <tr
                      key={a.gameId}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-2 pr-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {a.gameDate}
                      </td>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/analysis/game/${a.gameId}`}
                          className="text-gray-800 dark:text-gray-100 hover:text-brand-500"
                        >
                          {a.opponentName ?? "-"}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-600 dark:text-gray-300">
                        {a.side === "home" ? "홈" : "원정"}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {fmtFip(a.fip)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-gray-600 dark:text-gray-300">
                        {fmtFip(a.xfip)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {a.ourScore != null && a.opponentScore != null
                          ? `${a.ourScore}-${a.opponentScore}`
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

      <section className="text-sm text-gray-500 dark:text-gray-400">
        <p>
          ※ 표시되는 수치는 각 경기 예측 시점에 엔진에 입력된 시즌 누적 FIP/xFIP의
          등판 평균입니다. FanGraphs·KBO Fancy Stats 원본 시즌 집계와 소수점 단위
          차이가 있을 수 있습니다.
        </p>
      </section>
    </article>
  );
}
