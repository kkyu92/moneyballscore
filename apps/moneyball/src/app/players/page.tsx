import type { Metadata } from "next";
import Link from "next/link";
import { buildPitcherLeaderboard } from "@/lib/players/buildPitcherLeaderboard";

export const metadata: Metadata = {
  title: "선수 리더보드",
  description:
    "KBO 주요 선수 성과 리더보드. 선발 투수 Top 10 (평균 FIP 기준) · 타자 섹션은 데이터 수집 후 공개 예정.",
};

export const revalidate = 1800;

function fmtFip(v: number | null): string {
  return v != null ? v.toFixed(2) : "-";
}

function fmtPct(v: number | null): string {
  if (v == null) return "-";
  return `${Math.round(v * 100)}%`;
}

export default async function PlayersIndexPage() {
  const pitchers = await buildPitcherLeaderboard({
    limit: 10,
    minAppearances: 1,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">선수 리더보드</h1>
        <p className="text-gray-500 dark:text-gray-400">
          KBO 시즌 주요 선수 성과. 예측 엔진에 입력된 통계 기반.
        </p>
      </header>

      <section
        aria-labelledby="pitcher-leaderboard-title"
        className="space-y-4"
      >
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2
              id="pitcher-leaderboard-title"
              className="text-xl font-bold"
            >
              선발 투수 Top {pitchers.length}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              평균 FIP 낮은 순 · 경기별 예측 엔진 주입값 기준
            </p>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {pitchers.length > 0
              ? `샘플 ${pitchers.reduce((a, p) => a + p.appearances, 0)} 등판`
              : "샘플 없음"}
          </span>
        </div>

        {pitchers.length === 0 ? (
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
            <span className="text-5xl block mb-4">⚾</span>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
              아직 등판 데이터가 없습니다
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              시즌 경기가 진행되면 자동으로 집계됩니다.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-3 pl-4 pr-3 font-medium w-8">#</th>
                  <th className="py-3 pr-3 font-medium">선수</th>
                  <th className="py-3 pr-3 font-medium">팀</th>
                  <th className="py-3 pr-3 font-medium text-right">등판</th>
                  <th className="py-3 pr-3 font-medium text-right">평균 FIP</th>
                  <th className="py-3 pr-3 font-medium text-right">평균 xFIP</th>
                  <th className="py-3 pl-3 pr-4 font-medium text-right">
                    예측 적중률
                  </th>
                </tr>
              </thead>
              <tbody>
                {pitchers.map((p, idx) => (
                  <tr
                    key={p.playerId}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3 pl-4 pr-3 text-gray-400 dark:text-gray-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 pr-3">
                      <Link
                        href={`/players/${p.playerId}`}
                        className="font-semibold hover:text-brand-500"
                      >
                        {p.nameKo}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center gap-2">
                        {p.teamColor && (
                          <span
                            aria-hidden
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: p.teamColor }}
                          />
                        )}
                        {p.teamName ?? "-"}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-gray-700 dark:text-gray-200">
                      {p.appearances}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono font-semibold">
                      {fmtFip(p.avgFip)}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-gray-600 dark:text-gray-300">
                      {fmtFip(p.avgXFip)}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right font-mono text-gray-700 dark:text-gray-200">
                      {p.verifiedN > 0
                        ? `${fmtPct(p.accuracyRate)} (${p.verifiedN})`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        aria-labelledby="batter-placeholder-title"
        className="bg-gradient-to-r from-gray-500/5 to-gray-600/5 dark:from-gray-500/10 dark:to-gray-600/10 rounded-xl border border-gray-300/30 dark:border-gray-600/30 p-6 space-y-2"
      >
        <h2
          id="batter-placeholder-title"
          className="text-xl font-bold flex items-center gap-2"
        >
          타자 Top 10
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            준비 중
          </span>
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          개별 타자 스탯 수집 파이프라인이 추가되면 여기에 공개됩니다.
          KBO Fancy Stats의 wOBA · wRC+ · WAR 기반 예정.
        </p>
      </section>
    </div>
  );
}
