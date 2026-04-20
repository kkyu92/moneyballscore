import type { Metadata } from "next";
import Link from "next/link";
import type { TeamCode } from "@moneyball/shared";
import { buildPitcherLeaderboard } from "@/lib/players/buildPitcherLeaderboard";
import { buildBatterLeaderboard } from "@/lib/players/buildBatterLeaderboard";
import { TeamLogo } from "@/components/shared/TeamLogo";

export const metadata: Metadata = {
  title: "선수 리더보드",
  description:
    "KBO 주요 선수 성과 리더보드. 선발 투수 Top 10 (평균 FIP) · 타자 Top 10 (시즌 WAR) 집계.",
};

export const revalidate = 1800;

function fmtFip(v: number | null): string {
  return v != null ? v.toFixed(2) : "-";
}

function fmtPct(v: number | null): string {
  if (v == null) return "-";
  return `${Math.round(v * 100)}%`;
}

function fmtDec(v: number, digits = 3): string {
  return v.toFixed(digits);
}

function fmtWar(v: number): string {
  return v.toFixed(1);
}

export default async function PlayersIndexPage() {
  const [pitchers, batters] = await Promise.all([
    buildPitcherLeaderboard({ limit: 10, minAppearances: 1 }),
    buildBatterLeaderboard({ limit: 10 }),
  ]);

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
              ? (() => {
                  const total = pitchers.reduce((a, p) => a + p.appearances, 0);
                  const withFip = pitchers.reduce((a, p) => a + p.fipSampleN, 0);
                  return withFip === total
                    ? `샘플 ${total} 등판`
                    : `샘플 ${total} 등판 · FIP ${withFip}건`;
                })()
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
                        {p.teamCode && (
                          <TeamLogo team={p.teamCode as TeamCode} size={20} />
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
        aria-labelledby="batter-leaderboard-title"
        className="space-y-4"
      >
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2
              id="batter-leaderboard-title"
              className="text-xl font-bold"
            >
              타자 Top {batters.length}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              시즌 WAR 높은 순 · KBO Fancy Stats `/leaders/` 기준
            </p>
          </div>
          {batters[0]?.lastSynced && (
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              최종 동기화 {batters[0].lastSynced.slice(0, 10)}
            </span>
          )}
        </div>

        {batters.length === 0 ? (
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
            <span className="text-5xl block mb-4">🏏</span>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
              타자 스탯이 아직 동기화되지 않았습니다
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              매일 KST 12:00에 KBO Fancy Stats에서 자동 업데이트됩니다.
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
                  <th className="py-3 pr-3 font-medium">포지션</th>
                  <th className="py-3 pr-3 font-medium text-right">WAR</th>
                  <th className="py-3 pr-3 font-medium text-right">wRC+</th>
                  <th className="py-3 pl-3 pr-4 font-medium text-right">OPS</th>
                </tr>
              </thead>
              <tbody>
                {batters.map((b, idx) => (
                  <tr
                    key={b.playerId}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3 pl-4 pr-3 text-gray-400 dark:text-gray-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 pr-3 font-semibold">{b.nameKo}</td>
                    <td className="py-3 pr-3 text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center gap-2">
                        {b.teamCode && (
                          <TeamLogo team={b.teamCode as TeamCode} size={20} />
                        )}
                        {b.teamName ?? "-"}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-gray-600 dark:text-gray-300">
                      {b.position ?? "-"}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono font-semibold">
                      {fmtWar(b.war)}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-gray-700 dark:text-gray-200">
                      {b.wrcPlus ? b.wrcPlus.toFixed(1) : "-"}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right font-mono text-gray-700 dark:text-gray-200">
                      {b.ops ? fmtDec(b.ops, 3) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
