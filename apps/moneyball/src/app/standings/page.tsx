import type { Metadata } from "next";
import Link from "next/link";
import { shortTeamName } from "@moneyball/shared";
import { buildStandings } from "@/lib/standings/buildStandings";
import { buildAllTeamAccuracy } from "@/lib/standings/buildTeamAccuracy";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TeamLogo } from "@/components/shared/TeamLogo";

export const revalidate = 3600;

const SITE_URL = "https://moneyballscore.vercel.app";

export const metadata: Metadata = {
  title: "KBO 팀 순위",
  description: "2026 KBO 리그 팀 순위표 — 승·무·패, 승률, 게임차, 최근10경기. 매시간 자동 업데이트.",
  alternates: { canonical: `${SITE_URL}/standings` },
  openGraph: {
    title: "KBO 팀 순위 2026",
    description: "2026 KBO 리그 실시간 팀 순위표. 승·무·패, 승률, 게임차, 최근10경기 성적.",
    url: `${SITE_URL}/standings`,
    type: "website",
    locale: "ko_KR",
    siteName: "MoneyBall Score",
  },
};

function formatWinPct(v: number): string {
  if (v === 0) return "-.---";
  return v.toFixed(3).replace(/^0/, "");
}

function formatGB(gb: number | null): string {
  if (gb === null) return "-";
  if (gb === 0) return "0.0";
  return gb % 1 === 0 ? `${gb}.0` : String(gb);
}

function Recent10({ text }: { text: string }) {
  const wm = text.match(/(\d+)승/);
  const lm = text.match(/(\d+)패/);
  const wins = wm ? parseInt(wm[1], 10) : 0;
  const losses = lm ? parseInt(lm[1], 10) : 0;
  return (
    <span className="tabular-nums text-xs font-mono">
      <span className="text-green-600 dark:text-green-400">{wins}승</span>
      <span className="text-gray-400 mx-0.5">·</span>
      <span className="text-red-500 dark:text-red-400">{losses}패</span>
    </span>
  );
}

export default async function StandingsPage() {
  const [standings, teamAccuracy] = await Promise.all([
    buildStandings(),
    buildAllTeamAccuracy().catch(() => []),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "2026 KBO 팀 순위",
    description: "2026 KBO 리그 팀 순위표",
    numberOfItems: standings.length,
    itemListElement: standings.map((row, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: shortTeamName(row.teamCode),
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb items={[{ label: "팀 순위" }]} />

      <header className="space-y-1">
        <h1 className="text-2xl font-bold">2026 KBO 팀 순위</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          KBO 공식 집계 기준 · 매시간 갱신
        </p>
      </header>

      {standings.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          순위 데이터를 불러오는 중입니다. 잠시 후 다시 확인해 주세요.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 w-10">순위</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">팀</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">경기</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">승</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">무</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">패</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">승률</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">게임차</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">최근10</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {standings.map((row) => {
                  const isTop3 = row.rank <= 3;
                  const isLast = row.rank === standings.length;
                  return (
                    <tr
                      key={row.teamCode}
                      className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 ${
                        isTop3
                          ? "bg-green-50/40 dark:bg-green-900/10"
                          : isLast
                          ? "bg-red-50/30 dark:bg-red-900/10"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            row.rank === 1
                              ? "bg-amber-400 text-amber-900"
                              : row.rank <= 3
                              ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/teams/${row.teamCode}`}
                          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                        >
                          <TeamLogo team={row.teamCode} size={28} />
                          <span className="font-medium">{shortTeamName(row.teamCode)}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{row.games}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-green-700 dark:text-green-400">{row.wins}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-400">{row.draws}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-red-600 dark:text-red-400">{row.losses}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-mono font-semibold">
                        {formatWinPct(row.winPct)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                        {formatGB(row.gamesBehind)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {row.recent10 ? <Recent10 text={row.recent10} /> : <span className="text-gray-300">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
        출처: KBO 공식 · 1시간마다 갱신
      </p>

      {teamAccuracy.length > 0 && (
        <section aria-labelledby="prediction-accuracy-title">
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h2 id="prediction-accuracy-title" className="text-base font-bold">MoneyBall 예측 적중률</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">팀별 · 시즌 누적</span>
            </div>
            <ul className="space-y-2">
              {teamAccuracy.map((row, i) => {
                const pct = row.accuracyRate != null ? Math.round(row.accuracyRate * 100) : null;
                const barWidth = pct ?? 0;
                return (
                  <li key={row.teamCode} className="flex items-center gap-3">
                    <span className="w-5 text-xs text-gray-400 dark:text-gray-500 tabular-nums text-right shrink-0">
                      {i + 1}
                    </span>
                    <Link
                      href={`/teams/${row.teamCode}`}
                      className="flex items-center gap-2 min-w-[6rem] hover:opacity-80 transition-opacity shrink-0"
                    >
                      <TeamLogo team={row.teamCode} size={20} />
                      <span className="text-sm font-medium">{shortTeamName(row.teamCode)}</span>
                    </Link>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                        <div
                          className="bg-brand-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums w-10 text-right">
                        {pct != null ? `${pct}%` : "-"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0">
                      {row.correctN}/{row.verifiedN}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
